'use client'

import { useSyncExternalStore } from 'react'
import { CASES, FILLER_RESPONSES, getQuestion } from './mock-data'
import { scoreSession } from './scoring'
import type { GameSession, TranscriptTurn, Verdict } from './types'

/**
 * Client-side mock of the session service. Swap the mutators here for
 * `POST /api/sessions/*` calls and Supabase Realtime once the backend lands.
 */

interface StoreState {
  detectiveName: string
  sessions: Record<string, GameSession>
}

let state: StoreState = { detectiveName: '', sessions: {} }
const listeners = new Set<() => void>()

function emit() {
  for (const l of listeners) l()
}
function setState(update: (prev: StoreState) => StoreState) {
  state = update(state)
  emit()
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const serverSnapshot: StoreState = { detectiveName: '', sessions: {} }

export function useGameStore<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(
    subscribe,
    () => selector(state),
    () => selector(serverSnapshot),
  )
}

export function useSession(sessionId: string) {
  return useGameStore((s) => s.sessions[sessionId] ?? null)
}

export function useDetectiveName() {
  return useGameStore((s) => s.detectiveName)
}

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`
}

function updateSession(sessionId: string, mutate: (s: GameSession) => GameSession) {
  setState((prev) => {
    const existing = prev.sessions[sessionId]
    if (!existing) return prev
    return { ...prev, sessions: { ...prev.sessions, [sessionId]: mutate(existing) } }
  })
}

export const gameActions = {
  setDetectiveName(name: string) {
    setState((prev) => ({ ...prev, detectiveName: name.trim() }))
  },

  createSession(caseId: string, suspectId: string): GameSession {
    const session: GameSession = {
      id: uid('sess'),
      caseId,
      suspectId,
      detectiveName: state.detectiveName || 'Detective',
      state: 'CREATED',
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      transcript: [],
      discoveredClueIds: [],
      askedQuestionIds: [],
      verdict: null,
      score: null,
    }
    setState((prev) => ({ ...prev, sessions: { ...prev.sessions, [session.id]: session } }))
    return session
  },

  /** Recovers a demo session on hard refresh so deep links keep working in the prototype. */
  ensureSession(sessionId: string): GameSession {
    const existing = state.sessions[sessionId]
    if (existing) return existing
    const fallbackCase = CASES[0]
    const session: GameSession = {
      id: sessionId,
      caseId: fallbackCase.id,
      suspectId: fallbackCase.suspectIds[0],
      detectiveName: state.detectiveName || 'Detective',
      state: 'CREATED',
      createdAt: Date.now(),
      startedAt: null,
      endedAt: null,
      transcript: [],
      discoveredClueIds: [],
      askedQuestionIds: [],
      verdict: null,
      score: null,
    }
    setState((prev) => ({ ...prev, sessions: { ...prev.sessions, [sessionId]: session } }))
    return session
  },

  markReady(sessionId: string) {
    updateSession(sessionId, (s) => (s.state === 'CREATED' ? { ...s, state: 'READY' } : s))
  },

  /** The server owns the clock: start only once media is connected. */
  activate(sessionId: string) {
    updateSession(sessionId, (s) =>
      s.state === 'ACTIVE' || s.state === 'ENDED' ? s : { ...s, state: 'ACTIVE', startedAt: Date.now() },
    )
  },

  appendTurn(sessionId: string, turn: Omit<TranscriptTurn, 'id' | 'at'>) {
    updateSession(sessionId, (s) => ({
      ...s,
      transcript: [...s.transcript, { ...turn, id: uid('turn'), at: Date.now() }],
    }))
  },

  recordQuestion(sessionId: string, questionId: string) {
    const question = getQuestion(questionId)
    if (!question) return null
    updateSession(sessionId, (s) => ({
      ...s,
      askedQuestionIds: s.askedQuestionIds.includes(questionId) ? s.askedQuestionIds : [...s.askedQuestionIds, questionId],
      transcript: [...s.transcript, { id: uid('turn'), speaker: 'detective', text: question.text, at: Date.now() }],
    }))
    return question
  },

  recordSuspectResponse(sessionId: string, text: string, clueId: string | null) {
    updateSession(sessionId, (s) => {
      const alreadyKnown = clueId ? s.discoveredClueIds.includes(clueId) : true
      return {
        ...s,
        discoveredClueIds: clueId && !alreadyKnown ? [...s.discoveredClueIds, clueId] : s.discoveredClueIds,
        transcript: [
          ...s.transcript,
          { id: uid('turn'), speaker: 'suspect', text, at: Date.now(), clueId: clueId && !alreadyKnown ? clueId : undefined },
        ],
      }
    })
  },

  pickFillerResponse(sessionId: string) {
    const used = state.sessions[sessionId]?.transcript.filter((t) => t.speaker === 'suspect').length ?? 0
    return FILLER_RESPONSES[used % FILLER_RESPONSES.length]
  },

  end(sessionId: string) {
    updateSession(sessionId, (s) =>
      s.state === 'ACTIVE' || s.state === 'READY' || s.state === 'CREATED'
        ? { ...s, state: 'ENDED', endedAt: Date.now() }
        : s,
    )
  },

  submitVerdict(sessionId: string, verdict: Verdict) {
    updateSession(sessionId, (s) => {
      const scored = scoreSession(s, verdict)
      return { ...s, verdict, score: scored, state: 'SCORED' }
    })
    return state.sessions[sessionId] ?? null
  },
}

export function getSessionSnapshot(sessionId: string) {
  return state.sessions[sessionId] ?? null
}
