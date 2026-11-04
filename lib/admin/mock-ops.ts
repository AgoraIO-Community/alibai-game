import { QUESTIONS } from '@/lib/game/mock-data'
import type { SessionState } from '@/lib/game/types'

export type AgentEventKind = 'agent.started' | 'stt.final' | 'llm.response' | 'tts.chunk' | 'clue.validated' | 'avatar.frame_drop' | 'agent.stopped'

export interface AgentEvent {
  id: string
  at: number
  kind: AgentEventKind
  detail: string
  latencyMs?: number
}

export interface OpsTranscriptTurn {
  id: string
  at: number
  speaker: 'detective' | 'suspect'
  text: string
  clueId?: string
}

export interface OpsSession {
  id: string
  detectiveName: string
  suspectName: string
  suspectId: string
  caseId: string
  state: SessionState
  startedAt: number
  durationSeconds: number
  discoveredClueIds: string[]
  transcript: OpsTranscriptTurn[]
  events: AgentEvent[]
  avatarProvider: 'anam' | 'protoface'
  region: string
}

export interface DataQualityCheck {
  id: string
  name: string
  scope: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  checkedAt: number
}

const now = Date.now()

function turnsFromQuestions(startedAt: number, ids: string[]): OpsTranscriptTurn[] {
  const turns: OpsTranscriptTurn[] = []
  ids.forEach((id, i) => {
    const q = QUESTIONS.find((x) => x.id === id)
    if (!q) return
    const at = startedAt + 9000 + i * 17000
    turns.push({ id: `${id}-d`, at, speaker: 'detective', text: q.text })
    turns.push({ id: `${id}-s`, at: at + 4200, speaker: 'suspect', text: q.suspectResponse, clueId: q.revealsClueId ?? undefined })
  })
  return turns
}

function eventsFor(startedAt: number, turns: OpsTranscriptTurn[], provider: string): AgentEvent[] {
  const events: AgentEvent[] = [
    { id: 'e-start', at: startedAt - 2600, kind: 'agent.started', detail: `Agent joined channel · TTS gradium · avatar ${provider}` },
  ]
  turns.forEach((t) => {
    if (t.speaker === 'detective') {
      events.push({ id: `${t.id}-stt`, at: t.at + 900, kind: 'stt.final', detail: t.text, latencyMs: 320 + Math.round(Math.random() * 200) })
    } else {
      events.push({ id: `${t.id}-llm`, at: t.at - 1800, kind: 'llm.response', detail: `${t.text.length} chars`, latencyMs: 880 + Math.round(Math.random() * 500) })
      events.push({ id: `${t.id}-tts`, at: t.at - 600, kind: 'tts.chunk', detail: 'First audio chunk', latencyMs: 210 + Math.round(Math.random() * 120) })
      if (t.clueId) events.push({ id: `${t.id}-clue`, at: t.at + 500, kind: 'clue.validated', detail: t.clueId })
    }
  })
  return events.sort((a, b) => a.at - b.at)
}

function build(partial: Omit<OpsSession, 'transcript' | 'events' | 'discoveredClueIds'> & { asked: string[] }): OpsSession {
  const transcript = turnsFromQuestions(partial.startedAt, partial.asked)
  const discoveredClueIds = transcript.filter((t) => t.clueId).map((t) => t.clueId!)
  const events = eventsFor(partial.startedAt, transcript, partial.avatarProvider)
  const { asked: _asked, ...rest } = partial
  return { ...rest, transcript, discoveredClueIds, events }
}

export const OPS_SESSIONS: OpsSession[] = [
  build({
    id: 'sess_7f21a',
    detectiveName: 'Vesper Hale',
    suspectName: 'Alex Morgan',
    suspectId: 'alex-morgan',
    caseId: 'missing-diamond',
    state: 'ACTIVE',
    startedAt: now - 96_000,
    durationSeconds: 180,
    avatarProvider: 'anam',
    region: 'us-east',
    asked: ['q-alarm', 'q-cameras', 'q-why-office', 'q-keycard'],
  }),
  build({
    id: 'sess_b03c9',
    detectiveName: 'Det. Okafor',
    suspectName: 'Alex Morgan',
    suspectId: 'alex-morgan',
    caseId: 'missing-diamond',
    state: 'ACTIVE',
    startedAt: now - 41_000,
    durationSeconds: 180,
    avatarProvider: 'anam',
    region: 'eu-west',
    asked: ['q-access', 'q-unusual'],
  }),
  build({
    id: 'sess_e9d10',
    detectiveName: 'June Marchetti',
    suspectName: 'Alex Morgan',
    suspectId: 'alex-morgan',
    caseId: 'missing-diamond',
    state: 'ACTIVE',
    startedAt: now - 151_000,
    durationSeconds: 180,
    avatarProvider: 'protoface',
    region: 'us-west',
    asked: ['q-alarm', 'q-west-log', 'q-access', 'q-dana', 'q-unusual'],
  }),
  build({
    id: 'sess_12ac4',
    detectiveName: 'Sable Finch',
    suspectName: 'Alex Morgan',
    suspectId: 'alex-morgan',
    caseId: 'missing-diamond',
    state: 'READY',
    startedAt: now + 4_000,
    durationSeconds: 180,
    avatarProvider: 'anam',
    region: 'us-east',
    asked: [],
  }),
  build({
    id: 'sess_5c8e2',
    detectiveName: 'Marlowe K.',
    suspectName: 'Alex Morgan',
    suspectId: 'alex-morgan',
    caseId: 'missing-diamond',
    state: 'ENDED',
    startedAt: now - 230_000,
    durationSeconds: 180,
    avatarProvider: 'anam',
    region: 'ap-south',
    asked: ['q-cameras', 'q-why-office', 'q-keycard', 'q-witness'],
  }),
]

export const OPS_METRICS = {
  completedToday: 142,
  averageScore: 684,
  correctVerdictRate: 0.61,
  avgTurnLatencyMs: 1310,
}

export const DATA_QUALITY: DataQualityCheck[] = [
  { id: 'dq-1', name: 'session_state_transitions', scope: 'game_sessions', status: 'pass', detail: 'All 2,318 rows follow CREATED→READY→ACTIVE→ENDED→SCORED.', checkedAt: now - 120_000 },
  { id: 'dq-2', name: 'clue_fk_integrity', scope: 'session_clues → evidence', status: 'pass', detail: 'No orphaned clue references.', checkedAt: now - 120_000 },
  { id: 'dq-3', name: 'score_recompute_match', scope: 'scores', status: 'warn', detail: '2 of 1,904 scores differ from recompute by ≤5 pts (rounding).', checkedAt: now - 120_000 },
  { id: 'dq-4', name: 'transcript_turn_ordering', scope: 'interrogation_events', status: 'pass', detail: 'Monotonic timestamps within every session.', checkedAt: now - 120_000 },
  { id: 'dq-5', name: 'verdict_without_session', scope: 'verdicts', status: 'fail', detail: '1 verdict references a session with no ACTIVE window. Flagged for review.', checkedAt: now - 120_000 },
  { id: 'dq-6', name: 'case_secret_exposure', scope: 'RLS · case_secrets', status: 'pass', detail: 'No anon or authenticated reads in the last 24h.', checkedAt: now - 120_000 },
]
