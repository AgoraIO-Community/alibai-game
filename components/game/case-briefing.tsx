'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { gameActions } from '@/lib/game/session-store'
import type { Evidence, GameCase, Suspect } from '@/lib/game/types'
import { DecoRule, Eyebrow, StatusDot } from './deco'
import { EvidenceIcon } from './evidence-icon'

export function CaseBriefing({
  gameCase,
  suspect,
  evidence,
}: {
  gameCase: GameCase
  suspect: Suspect
  evidence: Evidence[]
}) {
  const router = useRouter()
  const [starting, setStarting] = useState(false)

  function begin() {
    setStarting(true)
    const session = gameActions.createSession(gameCase.id, suspect.id)
    router.push(`/game/${session.id}`)
  }

  return (
    <>
      <article className="mt-8 deco-frame bg-obsidian/80 p-5 md:p-8 animate-reveal">
        <header className="flex flex-col gap-4 border-b border-gold/20 pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <Eyebrow>Case No. {gameCase.caseNumber}</Eyebrow>
            <h1 className="mt-2 font-display text-4xl font-medium leading-none text-ivory md:text-5xl">{gameCase.title}</h1>
            <p className="mt-3 text-xs text-ivory/50">
              {gameCase.location} &middot; {gameCase.date}
            </p>
          </div>
          <div className="inline-flex w-fit items-center gap-2 border border-gold/40 px-3 py-1.5">
            <StatusDot tone="gold" pulse />
            <span className="label-mono text-gold">{gameCase.status}</span>
          </div>
        </header>

        <section className="mt-6">
          <h2 className="label-mono text-ivory/50">Summary of incident</h2>
          <p className="mt-3 font-display text-lg leading-relaxed text-ivory/90 md:text-xl">{gameCase.summary}</p>
        </section>

        <DecoRule className="my-7" />

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="label-mono text-ivory/50">Evidence on file</h2>
            <span className="font-mono text-[0.65rem] text-ivory/40">{evidence.length} ITEMS</span>
          </div>
          <ul className="mt-4 grid gap-px border border-border bg-border sm:grid-cols-2">
            {evidence.map((item, i) => (
              <li
                key={item.id}
                className="flex gap-3 bg-obsidian p-4 animate-reveal"
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span className="flex size-9 shrink-0 items-center justify-center border border-gold/30 text-gold">
                  <EvidenceIcon name={item.icon} className="size-4" />
                </span>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-medium text-ivory">{item.label}</p>
                    {item.timestamp && <span className="shrink-0 font-mono text-[0.65rem] text-gold/80">{item.timestamp}</span>}
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-ivory/55">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <DecoRule className="my-7" />

        <section>
          <h2 className="label-mono text-ivory/50">Assigned suspect</h2>
          <div className="mt-4 flex gap-4 border border-gold/25 bg-charcoal/40 p-3 md:p-4">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden border border-gold/30 md:w-32">
              <Image src={suspect.portrait} alt={`Portrait of ${suspect.name}`} fill sizes="128px" className="object-cover" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-obsidian/90 to-transparent px-2 pb-1.5 pt-6 font-mono text-[0.55rem] uppercase tracking-[0.2em] text-gold">
                Exhibit S-01
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl font-medium leading-tight text-ivory">{suspect.name}</p>
              <p className="label-mono mt-1 text-gold/80">{suspect.occupation}</p>
              <p className="mt-3 text-xs leading-relaxed text-ivory/60 md:text-sm">{suspect.background}</p>
            </div>
          </div>
        </section>

        <p className="mt-6 flex items-center gap-2 text-[0.65rem] text-ivory/35">
          <Lock className="size-3" />
          Hidden case facts are sealed. Only what the suspect reveals will enter your notebook.
        </p>
      </article>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-gold/20 bg-obsidian/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
          <div className="hidden sm:block">
            <p className="label-mono text-ivory/50">Time allotted</p>
            <p className="font-mono text-lg text-gold">03:00</p>
          </div>
          <Button
            onClick={begin}
            disabled={starting}
            size="lg"
            className="h-13 flex-1 rounded-none bg-gold font-mono text-xs uppercase tracking-[0.22em] text-obsidian hover:bg-ivory sm:flex-none sm:px-8"
          >
            {starting ? 'Opening the room…' : 'Begin Interrogation'}
            <ArrowRight data-icon="inline-end" />
          </Button>
        </div>
      </div>
    </>
  )
}
