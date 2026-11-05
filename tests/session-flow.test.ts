import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fixtures } from '../lib/scenarios/fixtures';
import { syncProviderFacts } from '../lib/server/provider-facts';
import { handle } from '../lib/server/http';
import { GameError } from '../lib/server/db';

// No network: every request lands in this stub, using made-up configuration.
const fake = { NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.invalid', SUPABASE_SECRET_KEY: 'sb_secret_test', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test', NEXT_PUBLIC_AGORA_APP_ID: 'a'.repeat(32), NEXT_AGORA_APP_CERTIFICATE: 'b'.repeat(32), ANAM_API_KEY: 'test' };
const realFetch = globalThis.fetch, playerId = randomUUID(), sessionId = randomUUID();
const scenario = fixtures[0];
let calls: string[], sessionRow: Record<string, unknown>, history: { role: string; content: string }[], historyAt: number;
beforeEach(() => {
  Object.assign(process.env, fake);
  calls = []; history = []; historyAt = 0;
  sessionRow = { id: sessionId, player_id: playerId, scenario_id: scenario.scenarioId, avatar_id: 'x', minimax_voice_id: 'x', state: 'active', started_at: '2026-11-05T12:00:00.000Z', ended_at: null };
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== 'supabase.invalid') {
      calls.push('agora'); await new Promise(done => setTimeout(done, 5)); historyAt = Date.now();
      return Response.json({ agent_id: 'agent-1', status: 'RUNNING', contents: history });
    }
    const name = url.pathname.replace('/rest/v1/', '').replace('/rpc/', '');
    calls.push(name);
    if (name === 'rpc/session_action') return Response.json({ session: sessionRow, scenario, factIds: [], score: null, verdict: null });
    if (name === 'agent_runs') return Response.json([{ agent_id: 'agent-1', state: 'running' }]);
    if (name === 'game_sessions') return Response.json([{ player_id: playerId }]);
    throw new Error(`Unexpected request: ${name}`);
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

test('a sync with no new fact answers from its snapshot, with a fresh serverTime', async () => {
  const view = await syncProviderFacts(playerId, sessionId);
  assert.deepEqual(calls, ['rpc/session_action', 'agent_runs', 'agora']);
  assert.ok(Date.parse(view.serverTime) >= historyAt);
  assert.equal(view.session.state, 'active');
  assert.equal(JSON.stringify(view).includes(scenario.truth.actualEvent), false);
});
test('a sync that records a fact re-reads so the view includes it', async () => {
  const fact = scenario.knowledge.facts.find(item => !item.prerequisiteFactIds.length)!;
  history = [{ role: 'assistant', content: fact.disclosurePhrases[0] }];
  await syncProviderFacts(playerId, sessionId);
  assert.equal(calls.at(-1), 'rpc/session_action');
  assert.equal(calls.filter(name => name === 'rpc/session_action').length, 4);
});
test('a sync still refuses a session that is not active', async () => {
  sessionRow = { ...sessionRow, state: 'ended' };
  await assert.rejects(syncProviderFacts(playerId, sessionId), { code: 'NOT_ACTIVE' });
});
test('only the leaderboard is CDN cached, and errors never are', async () => {
  const route = await readFile('app/api/leaderboard/route.ts', 'utf8');
  assert.match(route, /'s-maxage=10, stale-while-revalidate=30'/);
  assert.equal((await handle(async () => ({}))).headers.get('Cache-Control'), 'no-store');
  const cached = 's-maxage=10';
  assert.equal((await handle(async () => ({}), cached)).headers.get('Cache-Control'), cached);
  assert.equal((await handle(async () => { throw new GameError('POOL_BUSY', 409); }, cached)).headers.get('Cache-Control'), null);
  for (const path of ['app/api/sessions/route.ts', 'app/api/sessions/[id]/[action]/route.ts', 'app/api/auth/route.ts', 'app/api/realtime-auth/route.ts']) assert.doesNotMatch(await readFile(path, 'utf8'), /s-maxage/, path);
});
