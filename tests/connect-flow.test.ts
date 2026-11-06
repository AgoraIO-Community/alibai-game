import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { AVATAR_CATALOG } from '../lib/game/avatar-catalog';
import { getAvatarVoice } from '../lib/game/avatar-voices';
import { fixtures } from '../lib/scenarios/fixtures';
import { GameError } from '../lib/server/db';
import { projection, type SessionRow, type Snapshot } from '../lib/server/game';
import { connectVoice, readyVoice, startClaimedAgent } from '../lib/server/voice';

// No network: Supabase and Agora land in this stub, using made-up configuration.
const fake = { NEXT_PUBLIC_SUPABASE_URL: 'http://supabase.invalid', SUPABASE_SECRET_KEY: 'sb_secret_test', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test',
  NEXT_PUBLIC_AGORA_APP_ID: 'a'.repeat(32), NEXT_AGORA_APP_CERTIFICATE: 'b'.repeat(32), ANAM_API_KEY: 'anam-key-fixture' };
const realFetch = globalThis.fetch, playerId = randomUUID(), sessionId = randomUUID(), scenario = fixtures[0];
const avatarId = AVATAR_CATALOG[0].avatarId;
let calls: string[], agoraBodies: unknown[], rpcBodies: Record<string, Record<string, unknown>[]>, snapshot: Snapshot;
let claim: Record<string, unknown> | null, runs: { agent_id: string | null; state: string }[], agoraStatus: string;
let failStart: number | null, commitError: string | null, readyError: string | null;
const postgrestError = (message: string) => Response.json({ message }, { status: 400 });

beforeEach(() => {
  Object.assign(process.env, fake);
  calls = []; agoraBodies = []; rpcBodies = {}; claim = { claimed: true }; runs = []; agoraStatus = 'RUNNING'; failStart = null; commitError = null; readyError = null;
  const session: SessionRow = { id: sessionId, player_id: playerId, scenario_id: scenario.scenarioId, avatar_id: avatarId, minimax_voice_id: getAvatarVoice(avatarId).voiceId, state: 'preparing', started_at: null, ended_at: null };
  snapshot = { session, scenario, factIds: [], score: null, verdict: null };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : null;
    const url = new URL(request ? request.url : String(input)), method = request?.method ?? init?.method ?? 'GET';
    if (url.hostname !== 'supabase.invalid') {
      if (!url.pathname.includes('/projects/')) return new Response('{}');
      const text = request ? await request.clone().text() : String(init?.body ?? '');
      if (method === 'POST' && url.pathname.endsWith('/join')) {
        calls.push('agora-start'); agoraBodies.push(JSON.parse(text));
        return failStart ? new Response('{}', { status: failStart }) : Response.json({ agent_id: 'agent-1', status: 'STARTING', create_ts: 1 });
      }
      if (method === 'POST') { calls.push('agora-stop'); return Response.json({}); }
      calls.push('agora-status');
      return Response.json({ agent_id: 'agent-1', status: agoraStatus });
    }
    const name = url.pathname.replace('/rest/v1/', '').replace('rpc/', '');
    calls.push(name);
    if (name === 'agent_runs') { assert.ok(url.search.includes(`game_sessions.player_id=eq.${playerId}`), 'run read is owner-scoped'); return Response.json(runs); }
    const body = JSON.parse(String(init?.body));
    (rpcBodies[name] ??= []).push(body);
    if (name === 'session_connect') return Response.json({ claim, snapshot });
    if (name === 'session_ready') return readyError ? postgrestError(readyError) : Response.json(snapshot);
    if (name === 'agent_lifecycle') return body.p_action === 'commit' && commitError ? postgrestError(commitError) : Response.json({});
    throw new Error(`Unexpected request: ${name}`);
  }) as typeof fetch;
});
afterEach(() => { globalThis.fetch = realFetch; });

const later = () => { const tasks: (() => unknown)[] = []; return { tasks, schedule: ((task: () => unknown) => { tasks.push(task); }) as never as Parameters<typeof connectVoice>[2] }; };
const lifecycleActions = () => (rpcBodies.agent_lifecycle ?? []).map(body => body.p_action);
const coded = (code: string) => (error: unknown) => error instanceof GameError && error.code === code;
const quietly = async (work: () => Promise<unknown>) => { const real = console.error; console.error = () => {}; try { await work(); } finally { console.error = real; } };

test('connect answers from one database call, before Agora is touched', async () => {
  const { tasks, schedule } = later();
  const result = await connectVoice(playerId, sessionId, schedule);
  assert.deepEqual(calls, ['session_connect']);
  assert.deepEqual(rpcBodies.session_connect, [{ p_player: playerId, p_session: sessionId }]);
  assert.equal(result.view.session.state, 'preparing');
  assert.equal(result.connection?.channel, `case-${sessionId}`);
  assert.ok(result.connection?.rtcToken && result.connection.rtmToken);
  assert.equal(tasks.length, 1);
});
test('connect exposes only allowlisted fields', async () => {
  const { schedule } = later();
  claim = { claimed: false, state: 'running', agentId: 'agent-secret' };
  const result = await connectVoice(playerId, sessionId, schedule), text = JSON.stringify(result);
  assert.deepEqual(result.view, { ...projection(snapshot), serverTime: result.view.serverTime });
  assert.deepEqual(Object.keys(result).sort(), ['connection', 'view']);
  for (const secret of ['agent-secret', 'answerKey', 'actualEvent', scenario.truth.explanation, fake.NEXT_AGORA_APP_CERTIFICATE, fake.ANAM_API_KEY]) assert.ok(!text.includes(secret), secret);
});
test('the background start commits with the claimed agent and sends one greeting', async () => {
  const { tasks, schedule } = later();
  await connectVoice(playerId, sessionId, schedule);
  await tasks[0]();
  assert.deepEqual(calls.slice(1), ['agora-start', 'agent_lifecycle']);
  assert.deepEqual(rpcBodies.agent_lifecycle, [{ p_player: playerId, p_session: sessionId, p_action: 'commit', p_agent: 'agent-1' }]);
  const llm = (agoraBodies[0] as { properties: { llm: Record<string, unknown> } }).properties.llm;
  assert.deepEqual(llm.greeting_configs, { mode: 'single_first' });
  assert.equal(llm.greeting_message, "I'm ready when you are.");
});
test('repeat connects, refreshes and renewals never schedule a second start', async () => {
  for (const state of ['starting', 'running']) {
    const { tasks, schedule } = later();
    claim = { claimed: false, state, agentId: state === 'running' ? 'agent-1' : null };
    const result = await connectVoice(playerId, sessionId, schedule);
    assert.ok(result.connection?.rtcToken, `${state} renews tokens rather than returning 409`);
    assert.equal(tasks.length, 0);
  }
});
test('a run that cannot continue, or a session that cannot connect, gets a view and no tokens', async () => {
  for (const next of [{ claimed: false, state: 'failed' }, { claimed: false, state: 'stopping', agentId: 'a' }, { claimed: false, state: 'stopped', agentId: 'a' }, null]) {
    const { tasks, schedule } = later();
    claim = next;
    const result = await connectVoice(playerId, sessionId, schedule);
    assert.equal(result.connection, null); assert.ok(result.view.briefing); assert.equal(tasks.length, 0);
  }
});
test('a failure to schedule the start releases the claim', async () => {
  await assert.rejects(connectVoice(playerId, sessionId, (() => { throw new Error('No waitUntil'); }) as never), /No waitUntil/);
  assert.deepEqual(lifecycleActions(), ['failed']);
});
test('missing Agora configuration releases the claim instead of leaving a run starting', async () => {
  delete process.env.NEXT_AGORA_APP_CERTIFICATE;
  await assert.rejects(connectVoice(playerId, sessionId, later().schedule));
  assert.deepEqual(lifecycleActions(), ['failed']);
});
test('a failed Agora start records failed and throws nothing', async () => {
  failStart = 400;
  await quietly(() => startClaimedAgent(playerId, sessionId, snapshot));
  assert.deepEqual(lifecycleActions(), ['failed']);
  assert.ok(!calls.includes('agora-stop'), 'no agent ID means nothing to stop');
});
test('a player who left during the start: the conflicted commit stops the agent', async () => {
  commitError = 'AGENT_STATE_CONFLICT';
  await quietly(() => startClaimedAgent(playerId, sessionId, snapshot));
  assert.deepEqual(calls, ['agora-start', 'agent_lifecycle', 'agora-stop', 'agent_lifecycle']);
  assert.deepEqual(lifecycleActions(), ['commit', 'failed']);
});
test('any other commit failure also stops the agent', async () => {
  commitError = 'connection reset';
  await quietly(() => startClaimedAgent(playerId, sessionId, snapshot));
  assert.ok(calls.includes('agora-stop')); assert.deepEqual(lifecycleActions(), ['commit', 'failed']);
});
test('ready before commit is pending, without calling Agora or starting the clock', async () => {
  runs = [{ agent_id: null, state: 'starting' }];
  await assert.rejects(readyVoice(playerId, sessionId), coded('AGENT_START_PENDING'));
  assert.deepEqual(calls, ['agent_runs']);
});
test('ready checks the agent, starts the clock in one call and returns the view', async () => {
  runs = [{ agent_id: 'agent-1', state: 'running' }];
  snapshot.session.state = 'active'; snapshot.session.started_at = '2026-11-05T12:00:00.000Z';
  const view = await readyVoice(playerId, sessionId);
  assert.deepEqual(calls, ['agent_runs', 'agora-status', 'session_ready']);
  assert.deepEqual(rpcBodies.session_ready, [{ p_player: playerId, p_session: sessionId, p_agent: 'agent-1' }]);
  assert.equal(view.session.started_at, '2026-11-05T12:00:00.000Z');
  assert.ok(!JSON.stringify(view).includes('answerKey'));
});
test('an arriving agent is a retry, and a dead one never reaches the clock', async () => {
  runs = [{ agent_id: 'agent-1', state: 'running' }];
  for (const status of ['IDLE', 'STARTING', 'RECOVERING']) { agoraStatus = status; await assert.rejects(readyVoice(playerId, sessionId), coded('AGENT_START_PENDING'), status); }
  for (const status of ['STOPPING', 'STOPPED', 'FAILED']) { agoraStatus = status; await assert.rejects(readyVoice(playerId, sessionId), coded('AGENT_NOT_READY'), status); }
  assert.ok(!calls.includes('session_ready'));
});
test('a failed run surfaces its own code, and no run at all still lets SQL check the owner', async () => {
  runs = [{ agent_id: null, state: 'failed' }]; readyError = 'AGENT_START_FAILED';
  await assert.rejects(readyVoice(playerId, sessionId), coded('AGENT_START_FAILED'));
  runs = []; readyError = 'SESSION_NOT_FOUND';
  await assert.rejects(readyVoice(playerId, sessionId), coded('SESSION_NOT_FOUND'));
  assert.deepEqual(rpcBodies.session_ready.at(-1), { p_player: playerId, p_session: sessionId, p_agent: null });
  assert.ok(!calls.includes('agora-status'));
});
test('the route keeps its budget for the background start, and the old routes are gone', async () => {
  const [route, hook] = await Promise.all(['app/api/sessions/[id]/[action]/route.ts', 'lib/agora/use-suspect-voice.ts'].map(file => readFile(file, 'utf8')));
  assert.match(route, /export const maxDuration=300;/);
  assert.match(route, /action==='connect'/); assert.match(route, /action==='ready'/);
  assert.doesNotMatch(route, /'agent'|'agent-ready'/); assert.doesNotMatch(hook, /'agent'|'agent-ready'/);
  // Set before the request goes out, so leaving mid-request still ends the session.
  assert.ok(hook.indexOf('hasAgent.current = true') < hook.indexOf("<ConnectResponse>(sessionId, 'connect'"));
});
test('the migration is additive and service-role only', async () => {
  const sql = await readFile('supabase/migrations/20261105190000_connect_flow.sql', 'utf8');
  assert.doesNotMatch(sql, /\b(drop|alter|create or replace)\b/i);
  for (const fn of ['session_connect(uuid,uuid)', 'session_ready(uuid,uuid,text)']) {
    assert.ok(sql.includes(`revoke all on function public.${fn} from public,anon,authenticated;`), fn);
    assert.ok(sql.includes(`grant execute on function public.${fn} to service_role;`), fn);
  }
  assert.equal(sql.match(/set search_path=''/g)?.length, 2);
});
