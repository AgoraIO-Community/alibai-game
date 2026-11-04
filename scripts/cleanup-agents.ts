// Run every minute in a trusted worker (or once with --watch beside the server).
// This is required even when browsers close.
import { setTimeout as sleep } from 'node:timers/promises';
import { rest,rpc } from '../lib/server/db';
import { stopSuspectAgent } from '../lib/agora/server-agent';
const STARTUP_LIMIT_MS=300000, INTERVIEW_MS=180000, INTERVAL_MS=60000;
type Run={session_id:string;agent_id:string|null;state:string;created_at:string};
async function sweep(run:Run){
 const [session]=await rest<{player_id:string;state:string;started_at:string|null}[]>(`game_sessions?id=eq.${run.session_id}&select=player_id,state,started_at`);
 if(!session)return;
 const lifecycle=(action:string)=>rpc('agent_lifecycle',{p_player:session.player_id,p_session:run.session_id,p_action:action});
 const overdue=Date.now()>=Date.parse(run.created_at)+STARTUP_LIMIT_MS;
 // A start that never committed left no agent ID to stop; release the player instead.
 if(run.state==='starting'){if(overdue)await lifecycle('failed');return}
 const expired=session.started_at?Date.now()>=Date.parse(session.started_at)+INTERVIEW_MS:overdue;
 if(!expired&&!['ended','scored','abandoned'].includes(session.state))return;
 await stopSuspectAgent(run.agent_id!);
 await lifecycle('stopped');
 await rpc('end_session',{p_player:session.player_id,p_session:run.session_id});
}
async function once(){
 const runs=await rest<Run[]>('agent_runs?state=in.(starting,running,stopping)&select=session_id,agent_id,state,created_at');
 const results=await Promise.allSettled(runs.map(sweep));
 const failed=results.filter(result=>result.status==='rejected').length;
 if(failed)throw new Error(`${failed} of ${runs.length} agent runs need another cleanup attempt`);
}
async function main(){
 if(!process.argv.includes('--watch'))return once();
 for(;;){await once().catch(report);await sleep(INTERVAL_MS)}
}
function report(error:unknown){console.error('Agent cleanup failed; retrying.',error instanceof Error?error.message:'');}
main().catch(error=>{report(error);process.exitCode=1});
