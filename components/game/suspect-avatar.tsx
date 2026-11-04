'use client'

import Image from 'next/image'
import type { Suspect, VoiceState } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { StatusDot } from './deco'

const STATE_LABEL: Record<VoiceState, string> = {
  idle: 'Standby',
  connecting: 'Connecting to suspect',
  listening: 'Listening',
  capturing: 'You are speaking',
  thinking: 'Suspect is thinking',
  speaking: 'Suspect speaking',
  disconnected: 'Disconnected',
}

/**
 * Visual focal point of the room. Later this subscribes to the remote Agora
 * avatar video track; for now it renders the portrait with the same state
 * treatments (loading, listening, speaking, disconnected).
 */
export function SuspectAvatar({ suspect, voiceState, className }: { suspect: Suspect; voiceState: VoiceState; className?: string }) {
  const isSpeaking = voiceState === 'speaking'
  const isConnecting = voiceState === 'connecting'

  return (
    <figure className={cn('relative overflow-hidden bg-black', className)}>
      <Image
        src={suspect.portrait}
        alt={`${suspect.name}, ${suspect.occupation}`}
        fill
        priority
        sizes="(min-width: 1024px) 560px, 100vw"
        className={cn(
          'object-cover object-[50%_60%] transition-[transform,filter,opacity] duration-700 lg:object-[50%_55%]',
          isConnecting && 'scale-105 opacity-40 blur-sm grayscale',
          isSpeaking && 'scale-[1.02]',
        )}
      />
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-700',
          isSpeaking ? 'opacity-100' : 'opacity-60',
        )}
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 50% 30%, transparent 40%, rgba(16,17,19,0.75) 100%), linear-gradient(to top, rgba(16,17,19,0.95), transparent 45%)',
        }}
        aria-hidden
      />

      {isSpeaking && (
        <span className="pointer-events-none absolute inset-0 border border-gold/40 animate-pulse-ring" aria-hidden />
      )}

      <span className="pointer-events-none absolute left-3 top-3 size-4 border-l border-t border-gold/60" aria-hidden />
      <span className="pointer-events-none absolute right-3 top-3 size-4 border-r border-t border-gold/60" aria-hidden />
      <span className="pointer-events-none absolute bottom-3 left-3 size-4 border-b border-l border-gold/60" aria-hidden />
      <span className="pointer-events-none absolute bottom-3 right-3 size-4 border-b border-r border-gold/60" aria-hidden />

      <div className="absolute left-5 top-5 inline-flex items-center gap-2 bg-obsidian/70 px-2.5 py-1.5 backdrop-blur-sm">
        <StatusDot
          tone={isSpeaking ? 'gold' : voiceState === 'capturing' ? 'verdigris' : isConnecting ? 'muted' : 'verdigris'}
          pulse={isSpeaking || voiceState === 'capturing' || isConnecting}
        />
        <span className="label-mono text-ivory/80" aria-live="polite">
          {STATE_LABEL[voiceState]}
        </span>
      </div>

      <figcaption className="absolute inset-x-5 bottom-5">
        <p className="font-display text-3xl font-medium leading-none text-ivory md:text-4xl">{suspect.name}</p>
        <p className="label-mono mt-1.5 text-gold/80">{suspect.occupation}</p>
      </figcaption>

      {isConnecting && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <span className="size-10 animate-spin rounded-full border border-gold/20 border-t-gold" aria-hidden />
            <p className="label-mono text-ivory/70">Bringing in the suspect</p>
          </div>
        </div>
      )}
    </figure>
  )
}
