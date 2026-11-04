'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Check, Gavel, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { getCase, getClue, getEvidenceForCase, getSuspect } from '@/lib/game/mock-data'
import { formatClock } from '@/lib/game/scoring'
import { gameActions, useSession } from '@/lib/game/session-store'
import { cn } from '@/lib/utils'
import { DecoRule, Eyebrow } from './deco'

export function VerdictForm({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const session = useSession(sessionId)
  const [decision, setDecision] = useState<'guilty' | 'innocent' | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [reasoning, setReasoning] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    gameActions.ensureSession(sessionId)
    gameActions.end(sessionId)
  }, [sessionId])

  useEffect(() => {
    if (session?.state === 'SCORED') router.replace(`/game/${sessionId}/results`)
  }, [session?.state, sessionId, router])

  if (!session) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-obsidian">
        <p className="label-mono text-ivory/50">Preparing report…</p>
      </main>
    )
  }

  const gameCase = getCase(session.caseId)
  const suspect = getSuspect(session.suspectId)
  if (!gameCase || !suspect) return null

  const clues = session.discoveredClueIds.map(getClue).filter((c) => c !== null)
  const facts = getEvidenceForCase(session.caseId)
  const elapsed = session.startedAt && session.endedAt ? (session.endedAt - session.startedAt) / 1000 : gameCase.durationSeconds
  const timeRemaining = Math.max(0, Math.round(gameCase.durationSeconds - elapsed))

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  function submit() {
    if (!decision) return
    setSubmitting(true)
    gameActions.submitVerdict(sessionId, {
      decision,
      supportingClueIds: selected,
      reasoning: reasoning.trim(),
      submittedAt: Date.now(),
      timeRemaining,
    })
    router.push(`/game/${sessionId}/results`)
  }

  return (
    <main className="relative min-h-dvh bg-obsidian spotlight">
      <div className="absolute inset-0 grain opacity-30 mix-blend-soft-light" aria-hidden />
      <div className="relative mx-auto flex max-w-2xl flex-col px-5 pb-32 pt-8 md:px-6">
        <header className="text-center">
          <Eyebrow>Detective&apos;s report &middot; Case {gameCase.caseNumber}</Eyebrow>
          <h1 className="mt-3 font-display text-4xl font-medium leading-tight text-ivory text-balance md:text-5xl">
            What&apos;s Your Verdict, Detective?
          </h1>
          <DecoRule className="mx-auto mt-6 w-40" />
        </header>

        <section className="mt-8 flex gap-4 border border-gold/25 bg-charcoal/40 p-4">
          <div className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden border border-gold/30">
            <Image src={suspect.portrait} alt={`Portrait of ${suspect.name}`} fill sizes="80px" className="object-cover" />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl font-medium leading-tight text-ivory">{suspect.name}</p>
            <p className="label-mono mt-1 text-gold/80">{suspect.occupation}</p>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ivory/55">{gameCase.summary}</p>
            <p className="mt-2 font-mono text-[0.65rem] text-ivory/45">
              Interrogation closed with {formatClock(timeRemaining)} remaining &middot; {clues.length} clue{clues.length === 1 ? '' : 's'}
            </p>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="decision-heading">
          <h2 id="decision-heading" className="font-display text-xl text-ivory">
            Do you believe this suspect committed the crime?
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3" role="radiogroup" aria-labelledby="decision-heading">
            {(
              [
                { value: 'guilty', label: 'Guilty', sub: 'They took the diamond.', tone: 'border-oxblood bg-oxblood/20 text-ivory', idle: 'hover:border-oxblood/60' },
                { value: 'innocent', label: 'Innocent', sub: 'Someone else did.', tone: 'border-verdigris bg-verdigris/20 text-ivory', idle: 'hover:border-verdigris/60' },
              ] as const
            ).map((opt) => {
              const active = decision === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDecision(opt.value)}
                  className={cn(
                    'flex min-h-28 flex-col items-center justify-center gap-1 border-2 px-3 py-5 text-center transition-all',
                    active ? opt.tone : cn('border-ivory/15 bg-charcoal/30 text-ivory/70', opt.idle),
                  )}
                >
                  <span className="font-display text-3xl font-semibold uppercase tracking-[0.08em]">{opt.label}</span>
                  <span className="text-xs text-ivory/55">{opt.sub}</span>
                  {active && <Check className="mt-1 size-4" />}
                </button>
              )
            })}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="evidence-heading">
          <h2 id="evidence-heading" className="font-display text-xl text-ivory">
            Which evidence supports your conclusion?
          </h2>
          <p className="mt-1 text-xs text-ivory/50">Select everything that shaped your decision.</p>

          {clues.length > 0 && (
            <>
              <p className="label-mono mt-5 text-gold/80">Discovered clues</p>
              <ul className="mt-2 flex flex-col gap-2">
                {clues.map((clue) => (
                  <CheckRow key={clue.id} id={clue.id} checked={selected.includes(clue.id)} onToggle={toggle} label={clue.text} tag={clue.isKey ? 'Key' : undefined} />
                ))}
              </ul>
            </>
          )}

          <p className="label-mono mt-5 text-ivory/50">Case facts</p>
          <ul className="mt-2 flex flex-col gap-2">
            {facts.map((fact) => (
              <CheckRow
                key={fact.id}
                id={fact.id}
                checked={selected.includes(fact.id)}
                onToggle={toggle}
                label={fact.label}
                tag={fact.timestamp}
              />
            ))}
          </ul>
        </section>

        <section className="mt-10">
          <label htmlFor="reasoning" className="font-display text-xl text-ivory">
            Explain your reasoning <span className="text-sm text-ivory/40">(optional)</span>
          </label>
          <Textarea
            id="reasoning"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="The cameras went down eight minutes after he was in the security office…"
            className="mt-3 rounded-none border-gold/25 bg-charcoal/40 font-display text-base text-ivory placeholder:text-ivory/30 focus-visible:border-gold"
          />
        </section>

        <p className="mt-6 flex items-center gap-2 text-[0.65rem] text-ivory/40">
          <ShieldCheck className="size-3" />
          Verdicts are final and scored against the sealed case truth.
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/20 bg-obsidian/92 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <Button
            onClick={submit}
            disabled={!decision || submitting}
            size="lg"
            className={cn(
              'h-13 w-full rounded-none font-mono text-xs uppercase tracking-[0.22em]',
              decision === 'guilty' ? 'bg-oxblood text-ivory hover:bg-oxblood/80' : decision === 'innocent' ? 'bg-verdigris text-obsidian hover:bg-verdigris/80' : 'bg-gold text-obsidian hover:bg-ivory',
            )}
          >
            <Gavel data-icon="inline-start" />
            {submitting ? 'Filing report…' : 'Submit Final Verdict'}
          </Button>
        </div>
      </div>
    </main>
  )
}

function CheckRow({
  id,
  checked,
  onToggle,
  label,
  tag,
}: {
  id: string
  checked: boolean
  onToggle: (id: string) => void
  label: string
  tag?: string
}) {
  return (
    <li>
      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 border px-3 py-3 transition-colors',
          checked ? 'border-gold/70 bg-gold/10' : 'border-ivory/12 bg-charcoal/30 hover:border-gold/40',
        )}
      >
        <Checkbox
          checked={checked}
          onCheckedChange={() => onToggle(id)}
          className="mt-0.5 size-4 rounded-none border-gold/50 data-checked:border-gold data-checked:bg-gold data-checked:text-obsidian"
        />
        <span className="min-w-0 flex-1 text-sm leading-snug text-ivory/90">{label}</span>
        {tag && <span className="shrink-0 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-gold/80">{tag}</span>}
      </label>
    </li>
  )
}
