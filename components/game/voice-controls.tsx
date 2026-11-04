'use client'

import { Gavel, Mic, NotebookPen, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VoiceState } from '@/lib/game/types'
import { cn } from '@/lib/utils'

export function VoiceControls({
  voiceState,
  muted,
  clueCount,
  onToggleMute,
  onOpenNotebook,
  onSubmitVerdict,
  onPressStart,
  onPressEnd,
}: {
  voiceState: VoiceState
  muted: boolean
  clueCount: number
  onToggleMute: () => void
  onOpenNotebook: () => void
  onSubmitVerdict: () => void
  onPressStart: () => void
  onPressEnd: () => void
}) {
  const live = voiceState !== 'connecting' && voiceState !== 'disconnected'
  const capturing = voiceState === 'capturing'
  const micLabel = capturing
    ? 'Release to send'
    : voiceState === 'listening'
      ? 'Hold to talk'
      : voiceState === 'speaking'
        ? 'Suspect talking'
        : voiceState === 'thinking'
          ? 'Thinking'
          : 'Connecting'

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gold/20 bg-obsidian/92 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 sm:gap-3 sm:px-4 lg:px-8">
        <Button
          variant="ghost"
          onClick={onOpenNotebook}
          className="relative h-12 w-12 shrink-0 flex-col gap-0.5 rounded-none text-ivory/70 hover:bg-gold/10 hover:text-gold sm:w-14"
          aria-label="Open detective's notebook"
        >
          <NotebookPen className="size-5" />
          <span className="font-mono text-[0.5rem] uppercase tracking-[0.14em]">Notes</span>
          {clueCount > 0 && (
            <span className="absolute right-1.5 top-1 flex size-4 items-center justify-center bg-gold font-mono text-[0.55rem] text-obsidian">
              {clueCount}
            </span>
          )}
        </Button>

        <div className="flex min-w-0 flex-1 items-center justify-center gap-2 sm:gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Unmute suspect audio' : 'Mute suspect audio'}
            className="size-11 shrink-0 rounded-none border border-ivory/15 text-ivory/70 hover:bg-gold/10 hover:text-gold"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Button>

          <button
            type="button"
            disabled={!live || (voiceState !== 'listening' && voiceState !== 'capturing')}
            onPointerDown={onPressStart}
            onPointerUp={onPressEnd}
            onPointerLeave={capturing ? onPressEnd : undefined}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault()
                onPressStart()
              }
            }}
            onKeyUp={(e) => {
              if (e.key === ' ' || e.key === 'Enter') onPressEnd()
            }}
            aria-label={micLabel}
            className={cn(
              'relative flex h-14 min-w-0 max-w-56 flex-1 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-none border px-3 transition-all select-none touch-none sm:flex-row sm:gap-2.5 sm:px-5',
              capturing
                ? 'border-verdigris bg-verdigris text-obsidian'
                : live
                  ? 'border-gold bg-gold/10 text-gold hover:bg-gold/20 active:bg-gold active:text-obsidian'
                  : 'border-ivory/15 text-ivory/40',
              'disabled:opacity-60',
            )}
          >
            {live && !capturing && voiceState === 'listening' && (
              <span className="pointer-events-none absolute inset-0 border border-gold/50 animate-pulse-ring" aria-hidden />
            )}
            <Mic className="size-5" />
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.14em] sm:text-[0.65rem] sm:tracking-[0.18em]">{micLabel}</span>
          </button>
        </div>

        <Button
          onClick={onSubmitVerdict}
          className="h-12 shrink-0 rounded-none bg-oxblood px-2.5 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory hover:bg-oxblood/80 sm:px-4 sm:tracking-[0.16em]"
        >
          <Gavel data-icon="inline-start" />
          <span className="hidden sm:inline">Submit verdict</span>
          <span className="sm:hidden">Verdict</span>
        </Button>
      </div>
    </div>
  )
}
