'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Mic, RefreshCw, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SuggestedQuestion } from '@/lib/game/question-engine'
import type { Question } from '@/lib/game/types'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 3

export function SuggestedQuestions({
  questions,
  disabled,
  onAsk,
  className,
}: {
  questions: SuggestedQuestion[]
  disabled: boolean
  onAsk: (question: Question) => void
  className?: string
}) {
  const [page, setPage] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const pages = Math.max(1, Math.ceil(questions.length / PAGE_SIZE))
  const visible = questions.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)
  const selected = questions.find((q) => q.id === selectedId) ?? null

  useEffect(() => {
    if (page >= pages) setPage(0)
  }, [page, pages])

  useEffect(() => {
    if (selectedId && !questions.some((q) => q.id === selectedId)) setSelectedId(null)
  }, [questions, selectedId])

  return (
    <section className={cn('flex flex-col gap-3', className)} aria-labelledby="suggested-questions-heading">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="suggested-questions-heading" className="label-mono text-ivory/50">
            Suggested questions
          </h2>
          <p className="mt-1 text-xs text-ivory/55">Need a lead? Try asking one of these questions.</p>
        </div>
        {pages > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => (p + 1) % pages)}
            className="h-8 rounded-none font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gold hover:bg-gold/10 hover:text-gold"
          >
            <RefreshCw data-icon="inline-start" />
            More questions
          </Button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="border border-dashed border-ivory/15 px-4 py-6 text-center text-xs text-ivory/45">
          You have exhausted the suggested leads. Keep pressing the suspect in your own words.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((q) => {
            const isSelected = q.id === selectedId
            return (
              <li key={q.id}>
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(isSelected ? null : q.id)}
                  className={cn(
                    'group flex w-full items-start gap-3 border px-4 py-3 text-left transition-all',
                    isSelected
                      ? 'border-gold bg-gold/10 shadow-[0_0_0_1px_rgba(197,164,109,0.25)]'
                      : 'border-ivory/12 bg-charcoal/40 hover:border-gold/50',
                  )}
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center border border-gold/40 font-mono text-[0.6rem] text-gold">
                    {q.isNewLead ? <Sparkles className="size-3" /> : '?'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm leading-snug', isSelected ? 'text-ivory' : 'text-ivory/85', !isSelected && 'line-clamp-2')}>
                      {q.text}
                    </span>
                    {q.isNewLead && (
                      <span className="mt-1.5 inline-flex items-center gap-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-verdigris">
                        <span className="size-1 rounded-full bg-verdigris" aria-hidden />
                        New lead
                      </span>
                    )}
                  </span>
                  <ChevronRight
                    className={cn('mt-0.5 size-4 shrink-0 text-ivory/30 transition-transform', isSelected && 'rotate-90 text-gold')}
                  />
                </button>

                {isSelected && selected && (
                  <div className="border border-t-0 border-gold/40 bg-obsidian px-4 py-3 animate-reveal">
                    <p className="label-mono text-gold/80">Read this aloud</p>
                    <p className="mt-2 font-display text-xl leading-snug text-ivory">&ldquo;{selected.text}&rdquo;</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-[0.65rem] text-ivory/45">
                        <Mic className="size-3" />
                        Nothing is sent until you say it.
                      </p>
                      <Button
                        size="sm"
                        disabled={disabled}
                        onClick={() => {
                          onAsk(selected)
                          setSelectedId(null)
                        }}
                        className="h-8 rounded-none border border-gold/50 bg-transparent font-mono text-[0.6rem] uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-obsidian"
                      >
                        Simulate asking
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
