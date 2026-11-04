import { z } from 'zod';
import { authenticate,checkOrigin,login,logout,signup } from '@/lib/server/auth';
import { body,handle } from '@/lib/server/http';
import { GameError,rest } from '@/lib/server/db';
export const runtime='nodejs';
export async function GET(request:Request){return handle(async()=>{try{const user=await authenticate(request);const rows=await rest<{display_name:string}[]>(`players?id=eq.${user.id}&select=display_name`);return {authenticated:true,displayName:rows[0]?.display_name}}catch(error){if(error instanceof GameError&&error.status===401)return {authenticated:false};throw error}})}
export async function POST(request:Request){return handle(async()=>{checkOrigin(request);const input=z.discriminatedUnion('action',[
 z.strictObject({action:z.literal('login'),email:z.email().max(254),password:z.string().min(1).max(128)}),
 z.strictObject({action:z.literal('signup'),email:z.email().max(254),password:z.string().min(8).max(128),detectiveName:z.string().min(2).max(24).optional()}),
 z.strictObject({action:z.literal('logout')})]).parse(await body(request));if(input.action==='logout')return logout();return input.action==='login'?login(input.email,input.password):signup(input.email,input.password)})}
