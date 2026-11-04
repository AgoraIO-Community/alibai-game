import './only';
import { cookies } from 'next/headers';
import { env, publicKey, GameError } from './db';
const cookieOptions={httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'lax' as const,path:'/'};
type Tokens={access_token:string;refresh_token:string;expires_in:number};
type User={id:string;email?:string;is_anonymous?:boolean};
async function authFetch(path:string,body?:unknown,token?:string){
 const response=await fetch(`${env('NEXT_PUBLIC_SUPABASE_URL')}/auth/v1/${path}`,{method:body?'POST':'GET',cache:'no-store',headers:{apikey:publicKey(),'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});
 const data=await response.json();return {response,data};
}
async function setTokens(tokens:Tokens){const jar=await cookies();jar.set('alibai-access',tokens.access_token,{...cookieOptions,maxAge:tokens.expires_in});jar.set('alibai-refresh',tokens.refresh_token,{...cookieOptions,maxAge:60*60*24*30});}
export async function authenticate(request?:Request):Promise<{id:string;accessToken:string}>{
 const bearer=request?.headers.get('authorization')?.match(/^Bearer (.+)$/)?.[1];const jar=await cookies();let accessToken=bearer??jar.get('alibai-access')?.value;
 if(accessToken){const {response,data}=await authFetch('user',undefined,accessToken);if(response.ok&&!data.is_anonymous)return {id:(data as User).id,accessToken};if(bearer)throw new GameError('LOGIN_REQUIRED',401)}
 const refresh=jar.get('alibai-refresh')?.value;
 if(refresh){const {response,data}=await authFetch('token?grant_type=refresh_token',{refresh_token:refresh});if(response.ok&&!data.user?.is_anonymous){await setTokens(data);accessToken=data.access_token;return {id:data.user.id,accessToken:accessToken!}}}
 throw new GameError('LOGIN_REQUIRED',401);
}
export async function login(email:string,password:string){const {response,data}=await authFetch('token?grant_type=password',{email,password});if(!response.ok)throw new GameError('INVALID_LOGIN',401);await setTokens(data);return {authenticated:true};}
export async function signup(email:string,password:string){const {response,data}=await authFetch('signup',{email,password});if(!response.ok)throw new GameError('SIGNUP_FAILED',400);if(data.access_token){await setTokens(data);return {authenticated:true}}return {authenticated:false,confirmationRequired:true};}
export async function logout(){const jar=await cookies();const token=jar.get('alibai-access')?.value;if(token){await authFetch('logout',{},token)}jar.delete('alibai-access');jar.delete('alibai-refresh');return {authenticated:false};}
export function checkOrigin(request:Request){const origin=request.headers.get('origin');if(origin&&origin!==env('APP_ORIGIN'))throw new GameError('INVALID_ORIGIN',403);}
