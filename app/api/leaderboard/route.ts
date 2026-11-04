import { rpc } from '@/lib/server/db';
import { handle } from '@/lib/server/http';
export const runtime='nodejs';
export async function GET(){return handle(()=>rpc('read_leaderboard',{}))}
