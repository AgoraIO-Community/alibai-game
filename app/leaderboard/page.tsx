import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DecoRule, Eyebrow, Monogram } from '@/components/game/deco'
import { LiveLeaderboard } from '@/components/game/live-leaderboard'

export default function LeaderboardPage() {
  return (
    <main className="relative min-h-dvh bg-obsidian spotlight">
      <div className="absolute inset-0 grain opacity-30 mix-blend-soft-light" aria-hidden />
      <div className="relative mx-auto flex max-w-3xl flex-col px-5 pb-16 pt-6 md:px-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 label-mono text-ivory/60 hover:text-gold">
            <ArrowLeft className="size-3.5" />
            Home
          </Link>
          <Monogram className="size-8" />
        </header>

        <section className="mt-10 text-center">
          <Eyebrow>Bureau standings</Eyebrow>
          <h1 className="mt-3 font-display text-4xl font-medium text-ivory md:text-5xl">Leaderboard</h1>
          <DecoRule className="mx-auto mt-6 w-40" />
        </section>

        <LiveLeaderboard />
      </div>
    </main>
  )
}
