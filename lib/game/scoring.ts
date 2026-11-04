import { getCase, getCaseSecret, getCluesForCase } from './mock-data'
import type { DetectiveRank, GameSession, ScoreBreakdown, Verdict } from './types'

const VERDICT_POINTS = 400
const CLUE_POINTS_CAP = 400
const TIME_POINTS_CAP = 200

export function rankForScore(score: number): DetectiveRank {
  if (score >= 850) return 'Master Detective'
  if (score >= 650) return 'Senior Detective'
  if (score >= 400) return 'Investigator'
  return 'Rookie Detective'
}

/**
 * Deterministic scoring. In production this runs server-side against the
 * frozen case truth; the suspect LLM never influences it.
 */
export function scoreSession(session: GameSession, verdict: Verdict): ScoreBreakdown {
  const secret = getCaseSecret(session.caseId)
  const gameCase = getCase(session.caseId)
  const allClues = getCluesForCase(session.caseId)

  const isGuilty = secret?.guiltySuspectId === session.suspectId
  const correct = (verdict.decision === 'guilty') === isGuilty

  const verdictPoints = correct ? VERDICT_POINTS : 0

  const discovered = new Set(session.discoveredClueIds)
  const rawCluePoints = allClues.filter((c) => discovered.has(c.id)).reduce((sum, c) => sum + c.weight, 0)
  const cluePoints = Math.min(CLUE_POINTS_CAP, rawCluePoints)

  const duration = gameCase?.durationSeconds ?? 180
  const timePoints = correct ? Math.round((verdict.timeRemaining / duration) * TIME_POINTS_CAP) : 0

  const total = verdictPoints + cluePoints + timePoints
  const missedClueIds = allClues.filter((c) => c.isKey && !discovered.has(c.id)).map((c) => c.id)

  return {
    verdictPoints,
    cluePoints,
    timePoints,
    total,
    correct,
    rank: rankForScore(total),
    missedClueIds,
  }
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}
