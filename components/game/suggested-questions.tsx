'use client'

import type { PublicQuestion } from '@/lib/game/api'
import { cn } from '@/lib/utils'

/** Prompts to say aloud. Selecting one only highlights it; nothing is sent. */
export function SuggestedQuestions({ questions, more, selectedQuestion, onSelect, onNext, id, className }: {
  questions: PublicQuestion[]
  more: number | null
  selectedQuestion: string | null
  onSelect: (id: string) => void
  onNext: () => void
  id?: string
  className?: string
}) {
  return <section id={id} aria-labelledby="questions-heading" className={cn('flex-col border border-gold/25 bg-charcoal/30', className)}>
    <header className="shrink-0 border-b border-gold/20 px-4 py-2">
      <h2 id="questions-heading" className="font-display text-lg leading-tight text-ivory sm:text-xl">Questions to say aloud</h2>
      <p className="mt-0.5 text-xs text-ivory/55">Choose a hint to highlight it. This does not send a message or discover evidence.</p>
    </header>
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
      <ol className="flex flex-col gap-2.5">{questions.map((q, index) => {
        const selected = selectedQuestion === q.id
        return <li key={q.id}><button type="button" aria-pressed={selected} onClick={() => onSelect(q.id)} className={cn(
          'flex min-h-14 w-full gap-3 border p-3 text-left text-sm leading-snug transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold',
          selected ? 'border-gold bg-gold/15 text-ivory' : 'border-ivory/20 bg-obsidian/60 text-ivory/85 hover:border-gold/60 hover:bg-charcoal/60',
        )}>
          <span className={cn('font-mono text-[0.625rem] leading-5 tabular-nums', selected ? 'text-gold' : 'text-ivory/40')} aria-hidden>{String(index + 1).padStart(2, '0')}</span>
          <span className="flex-1">{q.text}{selected && <span className="label-mono mt-2 block text-gold">◆ Say this aloud</span>}</span>
        </button></li>
      })}</ol>
    </div>
    <footer className="shrink-0 border-t border-gold/20 px-4 py-1">
      <button type="button" className="min-h-11 text-sm text-gold underline underline-offset-4 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" onClick={onNext}>{more === null ? 'Starting questions' : 'More questions'}</button>
    </footer>
  </section>
}
