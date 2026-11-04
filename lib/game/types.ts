export type EvidenceIcon =
  | 'gem'
  | 'camera-off'
  | 'key-round'
  | 'door-open'
  | 'clock'
  | 'file-text'
  | 'fingerprint'
  | 'badge-alert'

export interface Evidence {
  id: string
  caseId: string
  label: string
  detail: string
  icon: EvidenceIcon
  timestamp?: string
}

export interface Suspect {
  id: string
  caseId: string
  name: string
  occupation: string
  background: string
  portrait: string
  avatarProviderId: string
}

export interface Clue {
  id: string
  caseId: string
  text: string
  /** Key clues are the ones that actually point to the truth. */
  isKey: boolean
  weight: number
}

export interface Question {
  id: string
  caseId: string
  text: string
  /** Clue that must be discovered before this question is suggested. */
  unlockedBy: string | null
  /** The canned suspect line the mock agent returns when asked. */
  suspectResponse: string
  /** Clue revealed by the response, if any. */
  revealsClueId: string | null
}

export interface GameCase {
  id: string
  caseNumber: string
  title: string
  status: 'OPEN INVESTIGATION' | 'CLOSED'
  location: string
  date: string
  summary: string
  durationSeconds: number
  suspectIds: string[]
}

/** Never shipped to the player client. */
export interface CaseSecret {
  caseId: string
  guiltySuspectId: string
  truth: string
  establishedAlibi: string
  hiddenFacts: string[]
  keyClueIds: string[]
}

export type SessionState =
  | 'CREATED'
  | 'READY'
  | 'ACTIVE'
  | 'ENDED'
  | 'VERDICT_SUBMITTED'
  | 'SCORED'

export type VoiceState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'capturing'
  | 'thinking'
  | 'speaking'
  | 'disconnected'

export interface TranscriptTurn {
  id: string
  speaker: 'detective' | 'suspect' | 'system'
  text: string
  at: number
  clueId?: string
}

export interface Verdict {
  decision: 'guilty' | 'innocent'
  supportingClueIds: string[]
  reasoning: string
  submittedAt: number
  timeRemaining: number
}

export interface ScoreBreakdown {
  verdictPoints: number
  cluePoints: number
  timePoints: number
  total: number
  correct: boolean
  rank: DetectiveRank
  missedClueIds: string[]
}

export type DetectiveRank = 'Rookie Detective' | 'Investigator' | 'Senior Detective' | 'Master Detective'

export interface GameSession {
  id: string
  caseId: string
  suspectId: string
  detectiveName: string
  state: SessionState
  createdAt: number
  startedAt: number | null
  endedAt: number | null
  transcript: TranscriptTurn[]
  discoveredClueIds: string[]
  askedQuestionIds: string[]
  verdict: Verdict | null
  score: ScoreBreakdown | null
}

export interface LeaderboardEntry {
  id: string
  detectiveName: string
  score: number
  casesSolved: number
  timeTakenSeconds: number
  isCurrentPlayer?: boolean
}
