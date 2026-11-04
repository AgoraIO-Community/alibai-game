import { getQuestionsForCase } from './mock-data'
import type { GameSession, Question } from './types'

export interface SuggestedQuestion extends Question {
  isNewLead: boolean
}

/**
 * Returns the questions a detective is currently eligible to ask: unlocked,
 * not yet asked. Follow-ups unlocked by a discovered clue are flagged as new leads.
 */
export function getEligibleQuestions(session: GameSession): SuggestedQuestion[] {
  const discovered = new Set(session.discoveredClueIds)
  const asked = new Set(session.askedQuestionIds)

  return getQuestionsForCase(session.caseId)
    .filter((q) => !asked.has(q.id))
    .filter((q) => q.unlockedBy === null || discovered.has(q.unlockedBy))
    .map((q) => ({ ...q, isNewLead: q.unlockedBy !== null }))
    .sort((a, b) => Number(b.isNewLead) - Number(a.isNewLead))
}
