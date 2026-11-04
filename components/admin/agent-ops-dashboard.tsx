'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, ChevronLeft, Lock, Radio, XCircle } from 'lucide-react'
import { LiveLeaderboard } from '@/components/game/live-leaderboard'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DATA_QUALITY, OPS_METRICS, OPS_SESSIONS, type OpsSession } from '@/lib/admin/mock-ops'
import { getCaseSecret, getClue, getEvidenceForCase } from '@/lib/game/mock-data'
import { formatClock } from '@/lib/game/scoring'
import { cn } from '@/lib/utils'

function useNow(interval = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), interval)
    return () => window.clearInterval(id)
  }, [interval])
  return now
}

function remainingFor(s: OpsSession, now: number) {
  if (s.state === 'READY' || s.state === 'CREATED') return s.durationSeconds
  return Math.max(0, s.durationSeconds - (now - s.startedAt) / 1000)
}

const STATE_STYLE: Record<string, string> = {
  ACTIVE: 'bg-verdigris/20 text-verdigris border-verdigris/40',
  READY: 'bg-gold/15 text-gold border-gold/40',
  ENDED: 'bg-ivory/10 text-ivory/70 border-ivory/20',
  SCORED: 'bg-ivory/10 text-ivory/70 border-ivory/20',
  CREATED: 'bg-ivory/10 text-ivory/70 border-ivory/20',
  VERDICT_SUBMITTED: 'bg-ivory/10 text-ivory/70 border-ivory/20',
}

export function AgentOpsDashboard() {
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = OPS_SESSIONS.find((s) => s.id === selectedId) ?? null

  const active = useMemo(() => OPS_SESSIONS.filter((s) => s.state === 'ACTIVE' && remainingFor(s, now) > 0), [now])

  return (
    <div className="min-h-dvh bg-[#0c0d0f] text-ivory">
      <header className="sticky top-0 z-20 border-b border-white/8 bg-[#0c0d0f]/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-7 items-center justify-center rounded-sm bg-gold text-obsidian">
              <Activity className="size-4" />
            </span>
            <div>
              <p className="text-sm font-semibold leading-none">AgentOps</p>
              <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ivory/45">Interrogate the Agent · Control room</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="hidden items-center gap-2 font-mono text-[0.65rem] text-ivory/55 sm:inline-flex">
              <Radio className="size-3 text-verdigris" />
              Realtime connected · {new Date(now).toLocaleTimeString()}
            </span>
            <Link href="/" className="rounded-sm border border-white/10 px-2.5 py-1.5 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-ivory/70 hover:border-gold/50 hover:text-gold">
              Player app
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-5 px-4 py-5 lg:px-6">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Key metrics">
          <Metric label="Active interrogations" value={String(active.length)} hint={`${OPS_SESSIONS.filter((s) => s.state === 'READY').length} initializing`} tone="verdigris" />
          <Metric label="Completed investigations" value={OPS_METRICS.completedToday.toLocaleString()} hint="today" />
          <Metric label="Average detective score" value={String(OPS_METRICS.averageScore)} hint="/ 1,000" />
          <Metric label="Correct verdicts" value={`${Math.round(OPS_METRICS.correctVerdictRate * 100)}%`} hint={`avg turn latency ${OPS_METRICS.avgTurnLatencyMs} ms`} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <section className="flex min-w-0 flex-col gap-5">
            {selected ? (
              <SessionDetail session={selected} now={now} onBack={() => setSelectedId(null)} />
            ) : (
              <Panel title="Active sessions" meta={`${OPS_SESSIONS.length} tracked`}>
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/8 hover:bg-transparent">
                      <Th>Player</Th>
                      <Th>Suspect</Th>
                      <Th className="text-right">Time left</Th>
                      <Th className="text-right">Clues</Th>
                      <Th>Status</Th>
                      <Th className="hidden md:table-cell">Avatar · Region</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {OPS_SESSIONS.map((s) => {
                      const left = remainingFor(s, now)
                      const urgent = s.state === 'ACTIVE' && left <= 30
                      return (
                        <TableRow
                          key={s.id}
                          tabIndex={0}
                          onClick={() => setSelectedId(s.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setSelectedId(s.id)
                            }
                          }}
                          className="cursor-pointer border-white/6 hover:bg-white/[0.03] focus-visible:bg-white/[0.04] focus-visible:outline-none"
                        >
                          <TableCell>
                            <p className="text-sm font-medium">{s.detectiveName}</p>
                            <p className="font-mono text-[0.6rem] text-ivory/40">{s.id}</p>
                          </TableCell>
                          <TableCell className="text-sm text-ivory/80">{s.suspectName}</TableCell>
                          <TableCell className={cn('text-right font-mono text-sm tabular-nums', urgent ? 'text-oxblood' : 'text-ivory/90')}>
                            {s.state === 'ACTIVE' || s.state === 'READY' ? formatClock(left) : '—'}
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm tabular-nums">{s.discoveredClueIds.length}</TableCell>
                          <TableCell>
                            <StatePill state={s.state === 'ACTIVE' && left <= 0 ? 'ENDED' : s.state} />
                          </TableCell>
                          <TableCell className="hidden font-mono text-[0.65rem] text-ivory/50 md:table-cell">
                            {s.avatarProvider} · {s.region}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Panel>
            )}

            <Panel title="Data quality" meta="Sodabase checks · every 2 min">
              <ul className="divide-y divide-white/6">
                {DATA_QUALITY.map((check) => (
                  <li key={check.id} className="flex items-start gap-3 px-4 py-2.5">
                    {check.status === 'pass' && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verdigris" />}
                    {check.status === 'warn' && <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold" />}
                    {check.status === 'fail' && <XCircle className="mt-0.5 size-4 shrink-0 text-oxblood" />}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <p className="font-mono text-xs">{check.name}</p>
                        <p className="font-mono text-[0.6rem] text-ivory/40">{check.scope}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-ivory/60">{check.detail}</p>
                    </div>
                    <span className={cn('rounded-sm border px-1.5 py-0.5 font-mono text-[0.55rem] uppercase', check.status === 'pass' && 'border-verdigris/40 text-verdigris', check.status === 'warn' && 'border-gold/40 text-gold', check.status === 'fail' && 'border-oxblood/50 text-oxblood')}>
                      {check.status}
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <aside className="flex min-w-0 flex-col gap-5">
            <Panel title="Live leaderboard" meta="top 8">
              <div className="px-3 py-3">
                <LiveLeaderboard compact />
              </div>
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  )
}

function SessionDetail({ session, now, onBack }: { session: OpsSession; now: number; onBack: () => void }) {
  const secret = getCaseSecret(session.caseId)
  const evidence = getEvidenceForCase(session.caseId)
  const left = remainingFor(session, now)
  const elapsedMs = (at: number) => Math.max(0, at - session.startedAt)
  const fmt = (at: number) => formatClock(elapsedMs(at) / 1000)

  return (
    <Panel
      title={
        <span className="flex items-center gap-2">
          <button type="button" onClick={onBack} className="rounded-sm border border-white/10 p-1 hover:border-gold/50 hover:text-gold" aria-label="Back to sessions">
            <ChevronLeft className="size-3.5" />
          </button>
          {session.detectiveName}
          <span className="font-mono text-[0.65rem] font-normal text-ivory/40">{session.id}</span>
        </span>
      }
      meta={
        <span className="flex items-center gap-3">
          <StatePill state={session.state} />
          <span className="font-mono tabular-nums">{formatClock(left)}</span>
        </span>
      }
    >
      <Tabs defaultValue="transcript">
        <TabsList className="mx-4 mt-3 h-8 rounded-sm bg-white/5 p-0.5">
          {[
            ['transcript', 'Transcript'],
            ['clues', `Clues (${session.discoveredClueIds.length})`],
            ['events', `Agent events (${session.events.length})`],
            ['truth', 'Case truth'],
          ].map(([v, l]) => (
            <TabsTrigger key={v} value={v} className="h-7 rounded-sm px-3 font-mono text-[0.65rem] uppercase tracking-[0.1em] data-active:bg-white/10 data-active:text-ivory">
              {v === 'truth' && <Lock className="size-3" />}
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="transcript" className="mt-3 max-h-[480px] overflow-y-auto px-4 pb-4">
          {session.transcript.length === 0 ? (
            <Empty>No turns yet. Agent is initializing.</Empty>
          ) : (
            <ol className="flex flex-col gap-2">
              {session.transcript.map((t) => (
                <li key={t.id} className={cn('flex gap-3 rounded-sm border p-2.5', t.speaker === 'detective' ? 'border-white/8 bg-white/[0.02]' : 'border-gold/20 bg-gold/[0.04]')}>
                  <span className="w-11 shrink-0 font-mono text-[0.6rem] text-ivory/40">{fmt(t.at)}</span>
                  <div className="min-w-0">
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/50">{t.speaker}</p>
                    <p className="mt-0.5 text-sm text-ivory/90">{t.text}</p>
                    {t.clueId && <p className="mt-1 font-mono text-[0.6rem] text-verdigris">clue.validated · {t.clueId}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="clues" className="mt-3 px-4 pb-4">
          {session.discoveredClueIds.length === 0 ? (
            <Empty>No clues validated yet.</Empty>
          ) : (
            <ol className="relative flex flex-col gap-3 border-l border-white/10 pl-4">
              {session.discoveredClueIds.map((id) => {
                const clue = getClue(id)
                const turn = session.transcript.find((t) => t.clueId === id)
                return (
                  <li key={id} className="relative">
                    <span className={cn('absolute -left-[1.3rem] top-1.5 size-2 rounded-full', clue?.isKey ? 'bg-gold' : 'bg-ivory/40')} aria-hidden />
                    <p className="font-mono text-[0.6rem] text-ivory/40">{turn ? fmt(turn.at) : '--:--'} · {id}{clue?.isKey ? ' · KEY' : ''}</p>
                    <p className="text-sm text-ivory/90">{clue?.text}</p>
                  </li>
                )
              })}
            </ol>
          )}
        </TabsContent>

        <TabsContent value="events" className="mt-3 max-h-[480px] overflow-y-auto px-4 pb-4">
          <ol className="divide-y divide-white/6 font-mono text-xs">
            {session.events.map((e) => (
              <li key={e.id} className="grid grid-cols-[3rem_9rem_minmax(0,1fr)_4rem] items-baseline gap-3 py-1.5">
                <span className="text-ivory/40">{fmt(e.at)}</span>
                <span className={cn(e.kind === 'clue.validated' ? 'text-verdigris' : e.kind === 'avatar.frame_drop' ? 'text-oxblood' : 'text-gold/80')}>{e.kind}</span>
                <span className="truncate text-ivory/75">{e.detail}</span>
                <span className="text-right text-ivory/40">{e.latencyMs ? `${e.latencyMs}ms` : ''}</span>
              </li>
            ))}
          </ol>
        </TabsContent>

        <TabsContent value="truth" className="mt-3 px-4 pb-4">
          <div className="rounded-sm border border-oxblood/40 bg-oxblood/[0.06] p-3">
            <p className="flex items-center gap-2 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-oxblood">
              <Lock className="size-3" />
              Organizer only · never exposed to player clients
            </p>
            {secret && (
              <dl className="mt-3 grid gap-3 text-sm md:grid-cols-2">
                <div>
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">Guilt status</dt>
                  <dd className={cn('mt-0.5 font-semibold', secret.guiltySuspectId === session.suspectId ? 'text-oxblood' : 'text-verdigris')}>
                    {secret.guiltySuspectId === session.suspectId ? 'GUILTY' : 'INNOCENT'}
                  </dd>
                </div>
                <div>
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">Established alibi</dt>
                  <dd className="mt-0.5 text-ivory/85">{secret.establishedAlibi}</dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">Hidden facts</dt>
                  <dd>
                    <ul className="mt-1 list-disc space-y-1 pl-4 text-ivory/85">
                      {secret.hiddenFacts.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">Key clues · discovery</dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {secret.keyClueIds.map((id) => {
                      const found = session.discoveredClueIds.includes(id)
                      return (
                        <span key={id} className={cn('rounded-sm border px-1.5 py-0.5 font-mono text-[0.6rem]', found ? 'border-verdigris/50 text-verdigris' : 'border-white/10 text-ivory/40')}>
                          {id} {found ? '✓' : '·'}
                        </span>
                      )
                    })}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">Relevant evidence</dt>
                  <dd className="mt-1 text-ivory/70">{evidence.map((e) => e.label).join(' · ')}</dd>
                </div>
              </dl>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </Panel>
  )
}

function Metric({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: 'verdigris' }) {
  return (
    <div className="rounded-sm border border-white/8 bg-[#131417] p-3.5">
      <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ivory/45">{label}</p>
      <p className={cn('mt-2 font-mono text-3xl tabular-nums leading-none', tone === 'verdigris' ? 'text-verdigris' : 'text-ivory')}>{value}</p>
      {hint && <p className="mt-1.5 text-[0.65rem] text-ivory/45">{hint}</p>}
    </div>
  )
}

function Panel({ title, meta, children }: { title: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-sm border border-white/8 bg-[#131417]">
      <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-2.5">
        <h2 className="text-sm font-semibold">{title}</h2>
        {meta && <div className="font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45">{meta}</div>}
      </header>
      {children}
    </section>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <TableHead className={cn('h-9 font-mono text-[0.6rem] uppercase tracking-[0.12em] text-ivory/45', className)}>{children}</TableHead>
}

function StatePill({ state }: { state: string }) {
  return <span className={cn('inline-flex rounded-sm border px-1.5 py-0.5 font-mono text-[0.6rem] uppercase', STATE_STYLE[state])}>{state}</span>
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-sm border border-dashed border-white/10 px-4 py-6 text-center text-xs text-ivory/45">{children}</p>
}
