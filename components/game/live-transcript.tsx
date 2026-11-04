'use client'

import { useEffect, useState } from 'react'
import type { TranscriptTurn, VoiceState } from '@/lib/game/types'
import { cn } from '@/lib/utils'

export function LiveTranscript({
  speaking,
  voiceState,
  lastSuspectTurn,
  suspectName,
  className,
}: {
  speaking: { text: string; startedAt: number; durationMs: number } | null
  voiceState: VoiceState
  lastSuspectTurn: TranscriptTurn | null
  suspectName: string
  className?: string
}) {
  const [visibleChars, setVisibleChars] = useState(0)

  useEffect(() => {
    if (!speaking) return
    setVisibleChars(0)
    const total = speaking.text.length
    const id = window.setInterval(() => {
      const elapsed = Date.now() - speaking.startedAt
      const next = Math.min(total, Math.round((elapsed / (speaking.durationMs * 0.9)) * total))
      setVisibleChars(next)
      if (next >= total) window.clearInterval(id)
    }, 40)
    return () => window.clearInterval(id)
  }, [speaking])

  const text = speaking ? speaking.text.slice(0, visibleChars) : lastSuspectTurn?.text
  const placeholder =
    voiceState === 'connecting'
      ? 'Establishing a secure line to the interrogation room…'
      : voiceState === 'thinking'
        ? '…'
        : voiceState === 'capturing'
          ? 'Go ahead, Detective. The suspect is listening.'
          : 'The suspect is waiting for your first question. Speak when you are ready.'

  return (
    <div className={cn('relative', className)} aria-live="polite" aria-atomic>
      <div className="flex items-center gap-2">
        <span className="label-mono text-ivory/45">{text ? suspectName : 'Live captions'}</span>
        {speaking && <span className="font-mono text-[0.6rem] text-gold/70">LIVE</span>}
      </div>
      <blockquote
        className={cn(
          'mt-2 min-h-[4.5rem] border-l-2 pl-4 font-display text-lg leading-snug text-ivory md:text-[1.35rem]',
          speaking ? 'border-gold' : text ? 'border-gold/40' : 'border-ivory/15',
        )}
      >
        {text ? (
          <>
            &ldquo;{text}
            {speaking && visibleChars < speaking.text.length ? (
              <span className="ml-0.5 inline-block h-[1em] w-px translate-y-[0.15em] bg-gold align-baseline animate-pulse" aria-hidden />
            ) : (
              '\u201D'
            )}
          </>
        ) : (
          <span className="text-base italic text-ivory/40">{placeholder}</span>
        )}
      </blockquote>
    </div>
  )
}
