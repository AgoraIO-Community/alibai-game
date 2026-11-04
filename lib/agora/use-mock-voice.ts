'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { gameActions } from '@/lib/game/session-store'
import type { Question, VoiceState } from '@/lib/game/types'

/**
 * Stand-in for the Agora Conversational AI session. Exposes the same surface
 * the real adapter will: a voice state, a speaking window for caption sync,
 * mute, and a way to feed the agent a detective utterance.
 */
export interface MockVoiceSession {
  voiceState: VoiceState
  muted: boolean
  /** Timestamps for the current suspect utterance so captions can animate in sync. */
  speaking: { text: string; startedAt: number; durationMs: number } | null
  toggleMute: () => void
  /** Detective read a suggested question aloud. */
  askQuestion: (question: Question) => void
  /** Detective said something off-script (push-to-talk mock). */
  beginFreeSpeech: () => void
  endFreeSpeech: () => void
}

const CONNECT_MS = 1400
const READY_MS = 1200
const THINK_MS = 700

function speechDuration(text: string) {
  return Math.max(1800, Math.min(6500, text.length * 52))
}

export function useMockVoice(sessionId: string, enabled: boolean): MockVoiceSession {
  const [voiceState, setVoiceState] = useState<VoiceState>('connecting')
  const [muted, setMuted] = useState(false)
  const [speaking, setSpeaking] = useState<MockVoiceSession['speaking']>(null)
  const timers = useRef<number[]>([])

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms)
    timers.current.push(id)
    return id
  }, [])

  const connectedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!enabled || connectedFor.current === sessionId) return
    connectedFor.current = sessionId
    later(() => gameActions.markReady(sessionId), CONNECT_MS)
    later(() => {
      gameActions.activate(sessionId)
      setVoiceState('listening')
    }, CONNECT_MS + READY_MS)
  }, [sessionId, enabled, later])

  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach(window.clearTimeout)
      t.length = 0
      connectedFor.current = null
    }
  }, [])

  const respond = useCallback(
    (text: string, clueId: string | null) => {
      setVoiceState('thinking')
      later(() => {
        const durationMs = speechDuration(text)
        setSpeaking({ text, startedAt: Date.now(), durationMs })
        setVoiceState('speaking')
        later(() => {
          gameActions.recordSuspectResponse(sessionId, text, clueId)
          setSpeaking(null)
          setVoiceState('listening')
        }, durationMs)
      }, THINK_MS)
    },
    [sessionId, later],
  )

  const askQuestion = useCallback(
    (question: Question) => {
      if (voiceState !== 'listening') return
      gameActions.recordQuestion(sessionId, question.id)
      respond(question.suspectResponse, question.revealsClueId)
    },
    [sessionId, voiceState, respond],
  )

  const beginFreeSpeech = useCallback(() => {
    if (voiceState !== 'listening') return
    setVoiceState('capturing')
  }, [voiceState])

  const endFreeSpeech = useCallback(() => {
    if (voiceState !== 'capturing') return
    gameActions.appendTurn(sessionId, { speaker: 'detective', text: '[Detective asked a follow-up]' })
    respond(gameActions.pickFillerResponse(sessionId), null)
  }, [sessionId, voiceState, respond])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  return { voiceState, muted, speaking, toggleMute, askQuestion, beginFreeSpeech, endFreeSpeech }
}
