import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { CaseBriefing } from '@/components/game/case-briefing'
import { Monogram } from '@/components/game/deco'
import { getCase, getEvidenceForCase, getSuspect } from '@/lib/game/mock-data'

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params
  const gameCase = getCase(caseId)
  if (!gameCase) notFound()

  const suspect = getSuspect(gameCase.suspectIds[0])
  if (!suspect) notFound()

  const evidence = getEvidenceForCase(gameCase.id)

  return (
    <main className="relative min-h-dvh bg-obsidian spotlight">
      <div className="absolute inset-0 grain opacity-30 mix-blend-soft-light" aria-hidden />
      <div className="relative mx-auto flex max-w-2xl flex-col px-5 pb-28 pt-6 md:px-6">
        <header className="flex items-center justify-between">
          <Link href="/rules" className="inline-flex items-center gap-2 label-mono text-ivory/60 hover:text-gold">
            <ArrowLeft className="size-3.5" />
            Rules
          </Link>
          <Monogram className="size-8" />
        </header>

        <CaseBriefing gameCase={gameCase} suspect={suspect} evidence={evidence} />
      </div>
    </main>
  )
}
