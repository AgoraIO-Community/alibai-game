'use client'

import type { PublicEvidence } from '@/lib/game/api'
import { cn } from '@/lib/utils'

/** Side panel on desktop, tab on phones. Scrolls inside itself so a long notebook never stretches the room. */
export function DetectiveNotebook({ items, onRefresh, id, className }: {
  items: PublicEvidence[]
  onRefresh: () => void
  id?: string
  className?: string
}) {
  return <section id={id} aria-labelledby="notebook-heading" className={cn('flex-col border border-gold/25 bg-charcoal/30', className)}>
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-gold/20 px-4 py-2">
      <div className="min-w-0">
        <h2 id="notebook-heading" className="font-display text-lg leading-tight text-ivory xl:text-xl">Detective’s Notebook</h2>
        <p className="label-mono mt-0.5 text-ivory/50">{items.length === 0 ? 'No entries' : items.length === 1 ? '1 entry' : `${items.length} entries`}</p>
      </div>
      <button type="button" onClick={onRefresh} className="min-h-11 shrink-0 px-2 text-sm text-gold underline underline-offset-4 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" aria-label="Refresh notebook">Refresh</button>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
      {items.length === 0
        ? <p className="px-1 py-6 text-center text-sm leading-relaxed text-ivory/50">Nothing on record yet. Facts the suspect confirms aloud are entered here as they are verified.</p>
        : <ol className="flex flex-col gap-2.5">{items.map((item, index) => <li key={item.id} className="border border-gold/20 bg-obsidian/60 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="label-mono text-gold/70">{item.kind === 'character_claim' ? 'Character claim' : 'Recorded observation'}</p>
            <span className="font-mono text-[0.625rem] tabular-nums text-ivory/40" aria-label={`Entry ${index + 1}`}>№ {String(index + 1).padStart(2, '0')}</span>
          </div>
          <h3 className="mt-1.5 font-display text-base leading-snug text-ivory">{item.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-ivory/75">{item.description}</p>
          <p className="mt-2 text-xs text-ivory/45">Source: {item.source}</p>
        </li>)}</ol>}
    </div>
  </section>
}
