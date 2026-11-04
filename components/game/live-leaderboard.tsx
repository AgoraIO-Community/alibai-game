'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Medal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LEADERBOARD_SEED } from '@/lib/game/mock-data'
import { formatClock } from '@/lib/game/scoring'
import { useGameStore } from '@/lib/game/session-store'
import type { LeaderboardEntry } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { StatusDot } from './deco'

const ARRIVALS = ['Noor Haddad', 'Cassius Lowe', 'Ingrid Vale', 'Ptolemy Shaw', 'Bea Okonkwo']

/**
 * Mocked Supabase Realtime: a timer nudges existing scores and occasionally
 * inserts a new detective, so the board visibly reorders while on screen.
 */
export function LiveLeaderboard({ compact = false }: { compact?: boolean }) {
  const [remote, setRemote] = useState<LeaderboardEntry[]>(LEADERBOARD_SEED)
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  const sessions = useGameStore((s) => s.sessions)
  const playerEntries = useMemo(
    () =>
      Object.values(sessions)
        .filter((sess) => sess.state === 'SCORED' && sess.score && sess.verdict)
        .map<LeaderboardEntry>((sess) => ({
          id: sess.id,
          detectiveName: sess.detectiveName,
          score: sess.score!.total,
          casesSolved: sess.score!.correct ? 1 : 0,
          timeTakenSeconds: 180 - sess.verdict!.timeRemaining,
          isCurrentPlayer: true,
        })),
    [sessions],
  )

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemote((prev) => {
        const next = [...prev]
        if (Math.random() < 0.3 && next.length < 16) {
          const name = ARRIVALS[Math.floor(Math.random() * ARRIVALS.length)]
          const entry: LeaderboardEntry = {
            id: `lb-${Date.now()}`,
            detectiveName: name,
            score: 450 + Math.floor(Math.random() * 480),
            casesSolved: 1,
            timeTakenSeconds: 110 + Math.floor(Math.random() * 70),
          }
          setLastEvent(`${name} filed a verdict`)
          return [...next, entry]
        }
        const i = Math.floor(Math.random() * next.length)
        const bump = Math.floor(Math.random() * 40) - 10
        next[i] = { ...next[i], score: Math.max(300, Math.min(1000, next[i].score + bump)), casesSolved: next[i].casesSolved + (bump > 25 ? 1 : 0) }
        setLastEvent(`${next[i].detectiveName} updated`)
        return next
      })
    }, 6000)
    return () => window.clearInterval(id)
  }, [])

  const rows = useMemo(() => {
    return [...remote, ...playerEntries]
      .sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds)
      .slice(0, compact ? 8 : 20)
  }, [remote, playerEntries, compact])

  const playerRank = rows.findIndex((r) => r.isCurrentPlayer)

  return (
    <section className={cn('flex flex-col', compact ? 'gap-3' : 'mt-8 gap-4')} aria-live="polite">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 label-mono text-ivory/50">
          <StatusDot tone="verdigris" pulse />
          Live
        </span>
        <span className="font-mono text-[0.6rem] text-ivory/40">{lastEvent ?? 'Waiting for verdicts…'}</span>
      </div>

      <ol className="flex flex-col gap-px border border-border bg-border">
        {rows.map((row, i) => {
          const rank = i + 1
          const podium = rank <= 3
          return (
            <li
              key={row.id}
              className={cn(
                'grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 transition-colors sm:grid-cols-[2.5rem_minmax(0,1fr)_5rem_4.5rem_5rem] sm:px-4',
                row.isCurrentPlayer ? 'bg-gold/15' : 'bg-obsidian',
              )}
            >
              <span className="flex items-center justify-center">
                {podium ? (
                  <span
                    className={cn(
                      'flex size-7 items-center justify-center border',
                      rank === 1 && 'border-gold bg-gold/15 text-gold',
                      rank === 2 && 'border-ivory/60 bg-ivory/10 text-ivory',
                      rank === 3 && 'border-[#a3745a] bg-[#a3745a]/15 text-[#c89a7c]',
                    )}
                    aria-label={`Rank ${rank}`}
                  >
                    <Medal className="size-3.5" />
                  </span>
                ) : (
                  <span className="font-mono text-sm text-ivory/50">{String(rank).padStart(2, '0')}</span>
                )}
              </span>

              <div className="min-w-0">
                <p className={cn('truncate font-display text-lg leading-tight', row.isCurrentPlayer ? 'text-gold' : 'text-ivory')}>
                  {row.detectiveName}
                  {row.isCurrentPlayer && <span className="ml-2 label-mono text-[0.5rem] text-gold/80">You</span>}
                </p>
                <p className="text-[0.65rem] text-ivory/45 sm:hidden">
                  {row.casesSolved} solved &middot; {formatClock(row.timeTakenSeconds)}
                </p>
              </div>

              <span className="font-mono text-lg text-ivory tabular-nums sm:text-right">{row.score}</span>
              <span className="hidden font-mono text-xs text-ivory/55 tabular-nums sm:block sm:text-right">{row.casesSolved} solved</span>
              <span className="hidden font-mono text-xs text-ivory/55 tabular-nums sm:block sm:text-right">{formatClock(row.timeTakenSeconds)}</span>
            </li>
          )
        })}
      </ol>

      {!compact && (
        <div className="mt-4 flex flex-col items-center gap-3 text-center">
          {playerRank >= 0 ? (
            <p className="text-sm text-ivory/70">
              You are ranked <span className="font-mono text-gold">#{playerRank + 1}</span> of {rows.length} detectives.
            </p>
          ) : (
            <p className="text-sm text-ivory/55">Close a case to earn your place on the board.</p>
          )}
          <Button
            size="lg"
            className="h-12 rounded-none bg-gold px-8 font-mono text-xs uppercase tracking-[0.22em] text-obsidian hover:bg-ivory"
            nativeButton={false} render={<Link href="/rules" />}
          >
            {playerRank >= 0 ? 'Take another case' : 'Start investigation'}
          </Button>
        </div>
      )}
    </section>
  )
}
