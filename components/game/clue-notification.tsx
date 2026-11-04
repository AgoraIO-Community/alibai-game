'use client'

import { useEffect, useState } from 'react'
import { Lightbulb } from 'lucide-react'
import { getClue } from '@/lib/game/mock-data'

export function ClueNotification({ discoveredClueIds }: { discoveredClueIds: string[] }) {
  const [visibleId, setVisibleId] = useState<string | null>(null)
  const latest = discoveredClueIds[discoveredClueIds.length - 1] ?? null

  useEffect(() => {
    if (!latest) return
    setVisibleId(latest)
    const id = window.setTimeout(() => setVisibleId(null), 3800)
    return () => window.clearTimeout(id)
  }, [latest])

  const clue = visibleId ? getClue(visibleId) : null
  if (!clue) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-4 top-16 z-40 mx-auto max-w-md border border-gold/60 bg-obsidian/95 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,0.6)] backdrop-blur animate-reveal lg:left-auto lg:right-8 lg:top-20"
    >
      <div className="flex gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center border border-gold/50 bg-gold/10 text-gold">
          <Lightbulb className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="label-mono text-gold">{clue.isKey ? 'Key clue discovered' : 'Clue discovered'}</p>
          <p className="mt-1 text-sm leading-snug text-ivory">{clue.text}</p>
        </div>
      </div>
    </div>
  )
}
