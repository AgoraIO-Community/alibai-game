'use client'

import { formatClock } from '@/lib/game/scoring'
import { cn } from '@/lib/utils'

export function InterrogationTimer({
  remaining,
  total,
  running,
  className,
}: {
  remaining: number
  total: number
  running: boolean
  className?: string
}) {
  const urgent = running && remaining <= 30
  const critical = running && remaining <= 10
  const progress = Math.max(0, Math.min(1, remaining / total))

  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <time
        className={cn(
          'font-mono text-2xl tabular-nums leading-none tracking-wider transition-colors md:text-3xl',
          !running && 'text-ivory/40',
          running && !urgent && 'text-ivory',
          urgent && !critical && 'text-gold',
          critical && 'text-oxblood animate-pulse',
        )}
        aria-live={urgent ? 'assertive' : 'off'}
        aria-label={`${formatClock(remaining)} remaining`}
      >
        {formatClock(remaining)}
      </time>
      <div className="h-px w-20 bg-ivory/15 md:w-28" aria-hidden>
        <div
          className={cn('h-full transition-[width] duration-500 ease-linear', critical ? 'bg-oxblood' : urgent ? 'bg-gold' : 'bg-verdigris')}
          style={{ width: `${progress * 100}%` }}
        />
      </div>
    </div>
  )
}
