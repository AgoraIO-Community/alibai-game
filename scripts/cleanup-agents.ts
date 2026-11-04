// Run every minute in a trusted worker. This is required even when browsers close.
import { rest,rpc } from '../lib/server/db';
import { stopSuspectAgent } from '../lib/agora/server-agent';
async function main(){
 const rows=await rest<{session_id:string;agent_id:string;created_at:string}[]>('agent_runs?state=in.(running,stopping)&select=session_id,agent_id,created_at');
 for(const agent of rows){
  const [session]=await rest<{player_id:string;state:string;started_at:string|null}[]>(`game_sessions?id=eq.${agent.session_id}&select=player_id,state,started_at`);
  if(!session)continue;
  const expired=session.started_at?Date.now()>=Date.parse(session.started_at)+180000:Date.now()>=Date.parse(agent.created_at)+300000;
  if(expired||['ended','scored','abandoned'].includes(session.state)){
   await stopSuspectAgent(agent.agent_id);
   await rpc('agent_lifecycle',{p_player:session.player_id,p_session:agent.session_id,p_action:'stopped'});
   if(session.state==='active')await rpc('session_action',{p_player:session.player_id,p_session:agent.session_id,p_action:'end'});
  }
 }
}
main().catch(()=>{console.error('Agent cleanup failed; retry and inspect server logs.');process.exitCode=1});
