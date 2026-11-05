import { rpc } from '@/lib/server/db';
import { handle } from '@/lib/server/http';
export const runtime='nodejs';
// Public and the same for everyone: the CDN may share it. Errors carry no cache header.
export async function GET(){return handle(()=>rpc('read_leaderboard',{}),'s-maxage=10, stale-while-revalidate=30')}
