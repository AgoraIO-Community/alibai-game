import { z } from 'zod';
import { authenticate,checkOrigin } from '@/lib/server/auth';
import { assignScenarioToPlayer } from '@/lib/server/game';
import { body,handle } from '@/lib/server/http';
export const runtime='nodejs';
export async function POST(request:Request){return handle(async()=>{checkOrigin(request);const user=await authenticate(request);const key=z.uuid().parse(request.headers.get('Idempotency-Key'));const input=z.strictObject({detectiveName:z.string().trim().min(2).max(24).optional()}).parse(await body(request));return assignScenarioToPlayer(user.id,key,input.detectiveName)})}
