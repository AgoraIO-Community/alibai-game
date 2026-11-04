'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Award, Check, Clock, Lightbulb, RotateCcw, Trophy, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getCase, getCaseSecret, getCluesForCase, getSuspect } from '@/lib/game/mock-data'
import { formatClock } from '@/lib/game/scoring'
import { gameActions, useSession } from '@/lib/game/session-store'
import { cn } from '@/lib/utils'
import { DecoRule, Eyebrow } from './deco'

export function ScoreBreakdown({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const session = useSession(sessionId)
  const [revealed, setRevealed] = useState(false)
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    gameActions.ensureSession(sessionId)
  }, [sessionId])

  useEffect(() => {
    if (session && session.state !== 'SCORED') router.replace(`/game/${sessionId}/verdict`)
  }, [session, sessionId, router])

  const total = session?.score?.total ?? 0

  useEffect(() => {
    const t = window.setTimeout(() => setRevealed(true), 900)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!revealed) return
    const start = performance.now()
    const duration = 1400
    let frame = 0
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setDisplayScore(Math.round(total * eased))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [revealed, total])

  if (!session?.score || !session.verdict) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-obsidian">
        <p className="label-mono text-ivory/50">Compiling results…</p>
      </main>
    )
  }

  const { score, verdict } = session
  const gameCase = getCase(session.caseId)
  const suspect = getSuspect(session.suspectId)
  const secret = getCaseSecret(session.caseId)
  if (!gameCase || !suspect || !secret) return null

  const allClues = getCluesForCase(session.caseId)
  const found = allClues.filter((c) => session.discoveredClueIds.includes(c.id))
  const missed = allClues.filter((c) => score.missedClueIds.includes(c.id))
  const actuallyGuilty = secret.guiltySuspectId === suspect.id

  return (
    <main className="relative min-h-dvh overflow-hidden bg-obsidian">
      <div
        className={cn(
          'pointer-events-none absolute inset-0 transition-opacity duration-1000',
          revealed ? 'opacity-100' : 'opacity-0',
        )}
        style={{
          background: score.correct
            ? 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(84,119,109,0.35), transparent 70%)'
            : 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(113,47,56,0.35), transparent 70%)',
        }}
        aria-hidden
      />
      <div className="absolute inset-0 grain opacity-30 mix-blend-soft-light" aria-hidden />

      <div className="relative mx-auto flex max-w-2xl flex-col px-5 pb-16 pt-10 md:px-6">
        <section className="flex flex-col items-center text-center">
          <Eyebrow>Case {gameCase.caseNumber} &middot; Verdict filed</Eyebrow>

          <div className="relative mt-8 flex h-40 w-full items-center justify-center">
            {!revealed ? (
              <p className="font-display text-2xl italic text-ivory/60 animate-pulse">Reviewing your report…</p>
            ) : (
              <div
                className={cn(
                  'animate-stamp border-[3px] px-6 py-3 font-display text-4xl font-bold uppercase tracking-[0.18em] md:text-5xl',
                  score.correct ? 'border-verdigris text-verdigris' : 'border-oxblood text-oxblood',
                )}
                style={{ boxShadow: 'inset 0 0 0 2px var(--background), inset 0 0 0 3px currentColor' }}
              >
                {score.correct ? 'Case closed' : 'Wrong call'}
              </div>
            )}
          </div>

          <p className={cn('mt-2 max-w-md text-sm text-ivory/70 transition-opacity duration-700', revealed ? 'opacity-100' : 'opacity-0')}>
            You ruled {suspect.name} <strong className="text-ivory">{verdict.decision}</strong>. The suspect was{' '}
            <strong className="text-ivory">{actuallyGuilty ? 'guilty' : 'innocent'}</strong>.
          </p>

          <div className={cn('mt-10 transition-opacity duration-700', revealed ? 'opacity-100' : 'opacity-0')}>
            <p className="label-mono text-ivory/50">Detective score</p>
            <p className="mt-2 font-mono text-7xl leading-none text-gold tabular-nums md:text-8xl">{displayScore}</p>
            <p className="mt-1 font-mono text-xs text-ivory/40">OUT OF 1,000</p>
            <div className="mt-5 inline-flex items-center gap-2 border border-gold/50 px-4 py-2">
              <Award className="size-4 text-gold" />
              <span className="font-display text-xl text-ivory">{score.rank}</span>
            </div>
          </div>
        </section>

        <div className={cn('transition-opacity delay-300 duration-700', revealed ? 'opacity-100' : 'opacity-0')}>
          <DecoRule className="my-10" />

          <dl className="grid grid-cols-3 gap-px border border-border bg-border">
            {[
              { label: 'Verdict', value: score.verdictPoints, max: 400 },
              { label: 'Clues', value: score.cluePoints, max: 400 },
              { label: 'Time bonus', value: score.timePoints, max: 200 },
            ].map((row) => (
              <div key={row.label} className="bg-obsidian p-4 text-center">
                <dt className="label-mono text-ivory/50">{row.label}</dt>
                <dd className="mt-2 whitespace-nowrap font-mono text-xl text-ivory sm:text-2xl">
                  {row.value}
                  <span className="text-[0.65rem] text-ivory/35 sm:text-xs"> /{row.max}</span>
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 flex items-center justify-between border border-border px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-ivory/70">
              <Clock className="size-4 text-gold" />
              Time remaining at verdict
            </span>
            <span className="font-mono text-lg text-ivory">{formatClock(verdict.timeRemaining)}</span>
          </div>

          <section className="mt-10 grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="flex items-center gap-2 label-mono text-verdigris">
                <Check className="size-3.5" />
                Evidence uncovered ({found.length}/{allClues.length})
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {found.length === 0 && <li className="text-xs text-ivory/45">You left before the suspect gave anything away.</li>}
                {found.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm text-ivory/85">
                    <Lightbulb className={cn('mt-0.5 size-3.5 shrink-0', c.isKey ? 'text-gold' : 'text-ivory/40')} />
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="flex items-center gap-2 label-mono text-oxblood">
                <X className="size-3.5" />
                Key clues you missed ({missed.length})
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {missed.length === 0 && <li className="text-xs text-ivory/45">You found every key clue. Exceptional work.</li>}
                {missed.map((c) => (
                  <li key={c.id} className="flex gap-2 text-sm text-ivory/60">
                    <Lightbulb className="mt-0.5 size-3.5 shrink-0 text-oxblood/70" />
                    <span>{c.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="mt-10 deco-frame bg-obsidian/80 p-5 md:p-6">
            <Eyebrow>What actually happened</Eyebrow>
            <p className="mt-3 font-display text-lg leading-relaxed text-ivory/90">{secret.truth}</p>
          </section>

          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Button
              size="lg"
              className="h-13 flex-1 rounded-none bg-gold font-mono text-xs uppercase tracking-[0.22em] text-obsidian hover:bg-ivory"
              nativeButton={false} render={<Link href={`/case/${gameCase.id}`} />}
            >
              <RotateCcw data-icon="inline-start" />
              Play again
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-13 flex-1 rounded-none border-gold/50 bg-transparent font-mono text-xs uppercase tracking-[0.22em] text-gold hover:bg-gold/10 hover:text-gold"
              nativeButton={false} render={<Link href={`/leaderboard?session=${sessionId}`} />}
            >
              <Trophy data-icon="inline-start" />
              View leaderboard
            </Button>
          </div>
        </div>
      </div>
    </main>
  )
}
