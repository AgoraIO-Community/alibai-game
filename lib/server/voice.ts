import './only';
import { after } from 'next/server';
import { createPlayerRtcCredentials,startSuspectAgent,stopSuspectAgent,querySuspectAgent } from '../agora/server-agent';
import { buildSuspectAgentContext,projectSnapshot,type Snapshot } from './game';
import { GameError,rest,rpc } from './db';
import { noTimer,stepTimer,type StepTimer } from './timing';
const lifecycle=(playerId:string,sessionId:string,action:string,agentId?:string)=>rpc<{claimed?:boolean;state?:string;agentId?:string}>('agent_lifecycle',{p_player:playerId,p_session:sessionId,p_action:action,...(agentId?{p_agent:agentId}:{})});
const ALIVE_RUNS=['starting','running'],ARRIVING_AGENTS=['IDLE','STARTING','RECOVERING'];
/** Also renews tokens and reconnects: only the call that wins the claim starts an agent. */
export async function connectVoice(playerId:string,sessionId:string,timer:StepTimer=noTimer,schedule:typeof after=after){
 const {claim,snapshot}=await timer.step('connect',()=>rpc<{claim:{claimed?:boolean;state?:string}|null;snapshot:Snapshot}>('session_connect',{p_player:playerId,p_session:sessionId}));
 const view=projectSnapshot(snapshot,sessionId);
 if(!claim?.claimed)return {view,connection:ALIVE_RUNS.includes(claim?.state??'')?createPlayerRtcCredentials(sessionId):null};
 try{
  const connection=createPlayerRtcCredentials(sessionId);
  schedule(()=>startClaimedAgent(playerId,sessionId,snapshot,stepTimer('agent-start')));
  return {view,connection};
 }catch(error){await lifecycle(playerId,sessionId,'failed').catch(()=>{});throw error}
}
/**
 * Runs after the response, so nothing can throw to the player: a failure reaches the browser as
 * the abandoned session that `failed` leaves. If the player left first, commit raises
 * AGENT_STATE_CONFLICT and the agent is stopped here. If this function dies between the two,
 * the agent's idle timeout and 5-minute expiry bound the cost.
 */
export async function startClaimedAgent(playerId:string,sessionId:string,snapshot:Snapshot,timer:StepTimer=noTimer){
 let agentId:string|undefined;
 try{
  const instructions=await timer.step('context',async()=>buildSuspectAgentContext(snapshot.scenario));
  const started=await timer.step('agora-start',()=>startSuspectAgent({sessionId,avatarId:snapshot.session.avatar_id,voiceId:snapshot.session.minimax_voice_id,instructions}));agentId=started.agentId;
  timer.note('agoraReturnedAt',Date.now());
  await timer.step('commit',()=>lifecycle(playerId,sessionId,'commit',agentId));
 }catch(error){
  console.error('Agent start failed',error instanceof GameError?error.code:error instanceof Error?error.name:'UnknownError');
  if(agentId)await stopSuspectAgent(agentId).catch(()=>console.error('Agent stop requires cleanup retry'));
  await lifecycle(playerId,sessionId,'failed').catch(()=>console.error('Agent failure could not be recorded'));
 }finally{timer.done()}
}
export async function readyVoice(playerId:string,sessionId:string,timer:StepTimer=noTimer){
 const pending=()=>{timer.note('pending',1);return new GameError('AGENT_START_PENDING',409)};
 const [run]=await timer.step('agent-run',()=>rest<{agent_id:string|null;state:string}[]>(`agent_runs?session_id=eq.${sessionId}&game_sessions.player_id=eq.${playerId}&select=agent_id,state,game_sessions!inner(player_id)`));
 if(run?.state==='starting')throw pending();
 if(run?.state==='running'&&run.agent_id){
  const agent=await timer.step('agent-query',()=>querySuspectAgent(run.agent_id!));
  // Frames can beat the status change, so an agent still arriving is a retry, not a failure.
  if(!agent.running)throw ARRIVING_AGENTS.includes(agent.status)?pending():new GameError('AGENT_NOT_READY',409);
 }
 return projectSnapshot(await timer.step('session-ready',()=>rpc<Snapshot>('session_ready',{p_player:playerId,p_session:sessionId,p_agent:run?.agent_id??null})),sessionId);
}
export async function stopVoice(playerId:string,sessionId:string){
 const stop=await lifecycle(playerId,sessionId,'stop');if(stop.agentId){await stopSuspectAgent(stop.agentId);await lifecycle(playerId,sessionId,'stopped')}
}
