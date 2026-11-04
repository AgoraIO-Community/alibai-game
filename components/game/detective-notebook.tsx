'use client'

import { BookOpen, Lightbulb, MessageSquareQuote } from 'lucide-react'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getClue } from '@/lib/game/mock-data'
import type { Evidence, GameSession } from '@/lib/game/types'
import { cn } from '@/lib/utils'
import { EvidenceIcon } from './evidence-icon'

function stamp(at: number, startedAt: number | null) {
  if (!startedAt) return '00:00'
  const s = Math.max(0, Math.round((at - startedAt) / 1000))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

export function DetectiveNotebook({
  open,
  onOpenChange,
  session,
  evidence,
  suspectName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  session: GameSession
  evidence: Evidence[]
  suspectName: string
}) {
  const clues = session.discoveredClueIds.map((id) => getClue(id)).filter((c) => c !== null)
  const clueTurns = session.transcript.filter((t) => t.clueId)
  const notes = session.transcript.filter((t) => t.speaker === 'suspect')

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] rounded-none border-gold/30 bg-obsidian p-0 text-ivory sm:max-w-none lg:inset-y-0 lg:left-auto lg:right-0 lg:h-full lg:max-h-none lg:w-[420px] lg:border-l lg:border-t-0"
      >
        <SheetHeader className="border-b border-gold/20 px-5 pb-4 pt-5 text-left">
          <p className="label-mono text-gold/80">Detective&apos;s notebook</p>
          <SheetTitle className="font-display text-2xl font-medium text-ivory">Evidence board</SheetTitle>
          <SheetDescription className="text-xs text-ivory/50">
            {clues.length} clue{clues.length === 1 ? '' : 's'} uncovered &middot; {notes.length} statement{notes.length === 1 ? '' : 's'} logged
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="clues" className="flex min-h-0 flex-1 flex-col">
          <TabsList className="mx-5 mt-4 grid h-auto w-auto grid-cols-3 rounded-none border border-gold/20 bg-transparent p-0">
            {[
              { value: 'evidence', label: 'Case evidence', icon: BookOpen },
              { value: 'clues', label: 'Clues', icon: Lightbulb, count: clues.length },
              { value: 'notes', label: 'Notes', icon: MessageSquareQuote },
            ].map(({ value, label, icon: Icon, count }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-10 rounded-none border-r border-gold/20 font-mono text-[0.6rem] uppercase tracking-[0.14em] text-ivory/60 last:border-r-0 data-active:bg-gold/10 data-active:text-gold data-active:shadow-none"
              >
                <Icon className="size-3.5" />
                <span className="hidden sm:inline">{label}</span>
                {typeof count === 'number' && count > 0 && <span className="ml-1 text-gold">{count}</span>}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
            <TabsContent value="evidence" className="mt-0">
              <ul className="flex flex-col gap-2">
                {evidence.map((item) => (
                  <li key={item.id} className="flex gap-3 border border-ivory/10 bg-charcoal/40 p-3">
                    <span className="flex size-8 shrink-0 items-center justify-center border border-gold/30 text-gold">
                      <EvidenceIcon name={item.icon} className="size-3.5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm text-ivory">{item.label}</p>
                        {item.timestamp && <span className="font-mono text-[0.6rem] text-gold/70">{item.timestamp}</span>}
                      </div>
                      <p className="mt-0.5 text-xs text-ivory/50">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="clues" className="mt-0">
              {clues.length === 0 ? (
                <EmptyState>No clues yet. Press the suspect on where they were and what they saw.</EmptyState>
              ) : (
                <ol className="relative flex flex-col gap-3 border-l border-gold/25 pl-5">
                  {clues.map((clue, i) => {
                    const turn = clueTurns.find((t) => t.clueId === clue.id)
                    return (
                      <li key={clue.id} className="relative animate-reveal" style={{ animationDelay: `${i * 40}ms` }}>
                        <span
                          className={cn(
                            'absolute -left-[1.4rem] top-1.5 size-2.5 rotate-45 border',
                            clue.isKey ? 'border-gold bg-gold' : 'border-gold/60 bg-obsidian',
                          )}
                          aria-hidden
                        />
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[0.6rem] text-gold/70">{turn ? stamp(turn.at, session.startedAt) : '--:--'}</span>
                          {clue.isKey && <span className="label-mono text-[0.55rem] text-gold">Key</span>}
                        </div>
                        <p className="mt-1 text-sm leading-snug text-ivory">{clue.text}</p>
                      </li>
                    )
                  })}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-0">
              {notes.length === 0 ? (
                <EmptyState>Statements from {suspectName} will be recorded here as the interrogation unfolds.</EmptyState>
              ) : (
                <ol className="flex flex-col gap-3">
                  {notes.map((turn) => (
                    <li key={turn.id} className="border border-ivory/10 bg-charcoal/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="label-mono text-[0.55rem] text-ivory/50">{suspectName}</span>
                        <span className="font-mono text-[0.6rem] text-gold/70">{stamp(turn.at, session.startedAt)}</span>
                      </div>
                      <p className="mt-1.5 font-display text-base leading-snug text-ivory/90">&ldquo;{turn.text}&rdquo;</p>
                      {turn.clueId && (
                        <p className="mt-2 inline-flex items-center gap-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] text-verdigris">
                          <Lightbulb className="size-3" />
                          Clue recorded
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="border border-dashed border-ivory/15 px-4 py-8 text-center text-xs text-ivory/45">{children}</p>
}
