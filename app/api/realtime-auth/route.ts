import { authenticate } from '@/lib/server/auth';
import { env, publicKey } from '@/lib/server/db';
import { handle } from '@/lib/server/http';
export const runtime='nodejs';
export async function GET(request:Request){return handle(async()=>{const user=await authenticate(request);return {url:env('NEXT_PUBLIC_SUPABASE_URL'),key:publicKey(),accessToken:user.accessToken}})}
