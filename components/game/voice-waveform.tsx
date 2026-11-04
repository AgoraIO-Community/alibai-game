'use client'

import type { VoiceState } from '@/lib/game/types'
import { cn } from '@/lib/utils'

const BARS = 28

export function VoiceWaveform({ voiceState, className }: { voiceState: VoiceState; className?: string }) {
  const active = voiceState === 'speaking' || voiceState === 'capturing'
  const thinking = voiceState === 'thinking'
  const color = voiceState === 'capturing' ? 'bg-verdigris' : 'bg-gold'

  return (
    <div
      className={cn('flex h-10 items-center justify-center gap-[3px]', className)}
      role="img"
      aria-label={active ? 'Audio activity' : 'Audio idle'}
    >
      {Array.from({ length: BARS }).map((_, i) => {
        const distance = Math.abs(i - (BARS - 1) / 2) / ((BARS - 1) / 2)
        const maxHeight = 100 - distance * 70
        return (
          <span
            key={i}
            className={cn(
              'w-[3px] origin-center rounded-full transition-[height,opacity] duration-300',
              active ? `${color} animate-waveform` : thinking ? 'bg-gold/40 animate-pulse' : 'bg-ivory/15',
            )}
            style={{
              height: active ? `${maxHeight}%` : thinking ? '18%' : '10%',
              animationDelay: `${(i % 7) * 90}ms`,
              animationDuration: `${900 + (i % 5) * 120}ms`,
            }}
          />
        )
      })}
    </div>
  )
}
