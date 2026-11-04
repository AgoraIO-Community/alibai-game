import './only';
export function env(name:string):string {const value=process.env[name];if(!value)throw new Error(`Missing server configuration: ${name}`);return value;}
export function publicKey(){return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env('NEXT_PUBLIC_SUPABASE_ANON_KEY')}
export function secretKey(){return process.env.SUPABASE_SECRET_KEY || env('SUPABASE_SERVICE_ROLE_KEY')}
export class GameError extends Error {constructor(public code:string,public status=400){super(code)}}
export async function rest<T=unknown>(path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(`${env('NEXT_PUBLIC_SUPABASE_URL')}/rest/v1/${path}`,{...init,cache:'no-store',headers:{apikey:secretKey(),...(secretKey().startsWith('sb_secret_')?{}:{Authorization:`Bearer ${secretKey()}`}),'Content-Type':'application/json',...init.headers},signal:AbortSignal.timeout(15000)});
 const body=await response.json().catch(()=>null);
 if(!response.ok){const message=String(body?.message??'DATABASE_ERROR');const code=['AVATAR_POOL_EMPTY','POOL_BUSY','POOL_EXHAUSTED','SESSION_NOT_FOUND','VERDICT_LOCKED','NOT_ACTIVE','END_INTERROGATION_FIRST','EVIDENCE_NOT_VISIBLE','UNSUPPORTED_DISCLOSURE','UNVERIFIED_DISCLOSURE','TURN_CONFLICT','FACT_LOCKED','UNKNOWN_FACT','AGENT_NOT_READY','AGENT_STATE_CONFLICT'].find(c=>message.includes(c));if(code)throw new GameError(code,code==='SESSION_NOT_FOUND'?404:409);throw new Error(`Database request failed (${response.status})`)}
 return body as T;
}
export const rpc=<T=unknown>(name:string,args:Record<string,unknown>)=>rest<T>(`rpc/${name}`,{method:'POST',body:JSON.stringify(args)});
