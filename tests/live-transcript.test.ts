import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { connectLiveTranscript, normalizeTranscriptSpacing, toTranscriptLines, type TranscriptLine, type TranscriptSdks, type TranscriptStatus } from '../lib/agora/live-transcript';

type Item = Parameters<typeof toTranscriptLines>[0][number];
const item = (uid: string, turn_id: number, text: string): Item => ({ uid, turn_id, stream_id: 1, _time: 1, text, status: 1, metadata: null });
const TRANSCRIPT_EVENT = 'transcript-updated';

function fakeSdks(overrides: { login?: () => Promise<unknown>; subscribe?: () => Promise<unknown>; logout?: () => Promise<unknown>; renew?: () => Promise<unknown>; init?: () => Promise<void> } = {}) {
  const calls: string[] = [];
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const rtmListeners = new Map<string, (event: unknown) => void>();
  const rtm = {
    addEventListener: (name: string, fn: (event: unknown) => void) => { rtmListeners.set(name, fn); },
    removeEventListener: (name: string) => { rtmListeners.delete(name); },
    login: async () => { calls.push('login'); await overrides.login?.(); },
    subscribe: async (channel: string) => { calls.push(`subscribe:${channel}`); await overrides.subscribe?.(); },
    logout: async () => { calls.push('logout'); await overrides.logout?.(); },
    renewToken: async (token: string) => { calls.push(`renew:${token}`); await overrides.renew?.(); },
  };
  const ai = {
    on: (name: string, fn: (...args: unknown[]) => void) => { handlers.set(name, fn); },
    subscribeMessage: (channel: string) => { calls.push(`bind:${channel}`); },
    unsubscribe: () => { calls.push('unsubscribe'); },
    destroy: () => { calls.push('destroy'); },
  };
  const sdks = {
    RTM: class { constructor() { return rtm; } },
    AgoraVoiceAI: { init: async () => { calls.push('init'); await overrides.init?.(); return ai; } },
    AgoraVoiceAIEvents: { TRANSCRIPT_UPDATED: TRANSCRIPT_EVENT },
    TranscriptHelperMode: { TEXT: 'text' },
  } as unknown as TranscriptSdks;
  return { sdks, calls, handlers, rtmListeners };
}
function connect(sdks: TranscriptSdks | (() => Promise<TranscriptSdks>)) {
  const statuses: TranscriptStatus[] = [], lines: TranscriptLine[][] = [];
  const transcript = connectLiveTranscript({
    rtcClient: {} as never, appId: 'app', channel: 'case-1', rtmUid: '1001', rtmToken: 'token',
    onStatus: status => statuses.push(status), onLines: next => lines.push(next),
  }, typeof sdks === 'function' ? sdks : async () => sdks);
  return { transcript, statuses, lines };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

test('transcript lines separate the detective from the suspect and drop empty turns', () => {
  assert.deepEqual(toTranscriptLines([item('0', 1, 'Where were you?'), item('123456-case-1', 1, 'At home.Alone.'), item('123456-case-1', 2, '   ')]), [
    { id: '0-1-1', speaker: 'detective', text: 'Where were you?' },
    { id: '123456-case-1-1-1', speaker: 'suspect', text: 'At home. Alone.' },
  ]);
  assert.equal(normalizeTranscriptSpacing('Yes,sir.  It cost 3.50 dollars'), 'Yes, sir. It cost 3.50 dollars');
});
test('captions bind the toolkit before the RTM subscribe, then replace the full history', async () => {
  const { sdks, calls, handlers } = fakeSdks();
  const { statuses, lines } = connect(sdks);
  await settle();
  assert.deepEqual(calls, ['login', 'init', 'bind:case-1', 'subscribe:case-1']);
  assert.deepEqual(statuses, ['connecting', 'live']);
  handlers.get(TRANSCRIPT_EVENT)?.([item('0', 1, 'Hello')]);
  handlers.get(TRANSCRIPT_EVENT)?.([item('0', 1, 'Hello there')]);
  assert.deepEqual(lines.at(-1)?.map(line => line.text), ['Hello there']);
});
test('an RTM, toolkit or SDK load failure reports unavailable and never rejects', async () => {
  const failLogin = fakeSdks({ login: async () => { throw new Error('token rejected'); } });
  const login = connect(failLogin.sdks); await settle();
  assert.equal(login.statuses.at(-1), 'unavailable');
  assert.equal(failLogin.calls.includes('logout'), false);

  const failInit = fakeSdks({ init: async () => { throw new Error('toolkit failed'); } });
  const init = connect(failInit.sdks); await settle();
  assert.equal(init.statuses.at(-1), 'unavailable');
  assert.equal(failInit.calls.at(-1), 'logout');

  const failSubscribe = fakeSdks({ subscribe: async () => { throw new Error('RTM not enabled'); } });
  const subscribe = connect(failSubscribe.sdks); await settle();
  assert.equal(subscribe.statuses.at(-1), 'unavailable');
  assert.deepEqual(failSubscribe.calls.slice(-3), ['unsubscribe', 'destroy', 'logout']);

  const failLoad = connect(async () => { throw new Error('chunk failed'); }); await settle();
  assert.equal(failLoad.statuses.at(-1), 'unavailable');
  await failLoad.transcript.release();
});
test('release detaches the toolkit, logs out once, and silences later events', async () => {
  const { sdks, calls, handlers } = fakeSdks();
  const { transcript, lines, statuses } = connect(sdks);
  await settle();
  await transcript.release(); await transcript.release();
  assert.deepEqual(calls.slice(-3), ['unsubscribe', 'destroy', 'logout']);
  assert.equal(calls.filter(call => call === 'destroy').length, 1);
  handlers.get(TRANSCRIPT_EVENT)?.([item('0', 1, 'Too late')]);
  assert.equal(lines.length, 0);
  assert.equal(statuses.at(-1), 'live');
});
test('release during an in-flight login still logs that client out', async () => {
  let finishLogin = () => {};
  const { sdks, calls } = fakeSdks({ login: () => new Promise<void>(resolve => { finishLogin = resolve; }) });
  const { transcript, statuses } = connect(sdks);
  await settle();
  await transcript.release();
  assert.equal(calls.includes('logout'), false);
  finishLogin(); await settle();
  assert.deepEqual(calls, ['login', 'logout']);
  assert.equal(statuses.includes('live'), false);
});
test('a hung RTM logout cannot hold up the release path', async () => {
  const { sdks } = fakeSdks({ logout: () => new Promise(() => {}) });
  const { transcript } = connect(sdks);
  await settle();
  const startedAt = Date.now();
  await transcript.release();
  assert.ok(Date.now() - startedAt < 3000);
});
test('a lost RTM link reports unavailable and recovers without touching media', async () => {
  const { sdks, rtmListeners } = fakeSdks();
  const { statuses } = connect(sdks);
  await settle();
  rtmListeners.get('linkState')?.({ currentState: 'FAILED' });
  assert.equal(statuses.at(-1), 'unavailable');
  rtmListeners.get('linkState')?.({ currentState: 'CONNECTED' });
  assert.equal(statuses.at(-1), 'live');
});
test('token renewal failures stay inside the caption client', async () => {
  const { sdks, calls } = fakeSdks({ renew: async () => { throw new Error('expired'); } });
  const { transcript, statuses } = connect(sdks);
  await transcript.renewToken('early');
  await settle();
  await transcript.renewToken('fresh');
  assert.equal(calls.includes('renew:early'), false);
  assert.equal(calls.includes('renew:fresh'), true);
  assert.equal(statuses.at(-1), 'live');
});
test('the real toolkit turns RTM transcription messages into lines, then lets go of both clients', async () => {
  const toolkit = await import('agora-agent-client-toolkit');
  const rtmListeners = new Map<string, Set<(event: unknown) => void>>();
  const rtcListeners = new Set<string>();
  const rtm = {
    addEventListener: (name: string, fn: (event: unknown) => void) => { rtmListeners.set(name, (rtmListeners.get(name) ?? new Set()).add(fn)); },
    removeEventListener: (name: string, fn: (event: unknown) => void) => { rtmListeners.get(name)?.delete(fn); },
    login: async () => {}, subscribe: async () => {}, logout: async () => {}, publish: async () => {}, renewToken: async () => {},
  };
  const rtcClient = { on: (name: string) => { rtcListeners.add(name); }, off: (name: string) => { rtcListeners.delete(name); } };
  const sdks = { RTM: class { constructor() { return rtm; } }, AgoraVoiceAI: toolkit.AgoraVoiceAI, AgoraVoiceAIEvents: toolkit.AgoraVoiceAIEvents, TranscriptHelperMode: toolkit.TranscriptHelperMode } as unknown as TranscriptSdks;
  const lines: TranscriptLine[][] = [];
  const transcript = connectLiveTranscript({ rtcClient: rtcClient as never, appId: 'app', channel: 'case-1', rtmUid: '1001', rtmToken: 'token', onStatus: () => {}, onLines: next => lines.push(next) }, async () => sdks);
  await settle();
  const deliver = (publisher: string, body: object) => { for (const fn of rtmListeners.get('message') ?? []) fn({ publisher, message: JSON.stringify(body) }); };
  const base = { start_ms: 0, duration_ms: 0, language: 'en-US', stream_id: 0, user_id: '1001', words: null };
  deliver('123456', { ...base, object: 'user.transcription', text: 'Where were', turn_id: 1, final: false });
  deliver('123456', { ...base, object: 'user.transcription', text: 'Where were you?', turn_id: 1, final: true });
  deliver('123456', { ...base, object: 'assistant.transcription', text: 'At home.Alone.', turn_id: 1, quiet: false, turn_seq_id: 1, turn_status: 1 });
  assert.deepEqual(lines.at(-1)?.map(line => [line.speaker, line.text]), [['detective', 'Where were you?'], ['suspect', 'At home. Alone.']]);
  assert.equal(new Set(lines.at(-1)?.map(line => line.id)).size, 2);
  await transcript.release();
  assert.equal(rtmListeners.get('message')?.size, 0);
  assert.equal(rtcListeners.size, 0);
  assert.equal(toolkit.AgoraVoiceAI.getState(), null);
});
test('captions stay display only and outside the media readiness gate', async () => {
  const [helper, hook, session, route] = await Promise.all(['lib/agora/live-transcript.ts', 'lib/agora/use-suspect-voice.ts', 'components/game/production-session.tsx', 'app/api/sessions/[id]/[action]/route.ts'].map(path => readFile(path, 'utf8')));
  assert.doesNotMatch(helper, /sessionRequest|gameRequest|\bfetch\(|lib\/game\/api/);
  // The hook's only server actions remain the media lifecycle, none carrying a transcript.
  assert.deepEqual([...new Set([...hook.matchAll(/sessionRequest(?:<\w+>)?\(sessionId,\s*'([^']+)'/g)].map(match => match[1]))].sort(), ['agent', 'agent-ready', 'end']);
  assert.doesNotMatch(hook, /sessionRequest(?:<\w+>)?\(sessionId,\s*'[^']+',\s*(?:[^\s{]|\{[^}])/);
  assert.match(hook, /!published \|\| !audioDecoded \|\| !videoDecoded \|\| failedAutoplay/);
  assert.doesNotMatch(hook, /await connectLiveTranscript/);
  assert.match(session, /sessionRequest<SessionView>\(sessionId,'sync-facts',\{\}\)/);
  assert.match(route, /if\(action==='sync-facts'\)return syncProviderFacts\(user\.id,id\)/);
});
