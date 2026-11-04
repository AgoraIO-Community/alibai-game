import Link from 'next/link'
import { ProductionSession } from '@/components/game/production-session'

export default async function CasePage({ searchParams }: { params: Promise<{caseId:string}>; searchParams: Promise<{session?:string}> }) {
  const { session } = await searchParams
  if (!session) return <main className="min-h-dvh bg-obsidian p-8 text-ivory"><p>A case belongs to your assigned session.</p><Link href="/rules" className="mt-4 block text-gold underline">Sign in and request a case</Link></main>
  return <ProductionSession sessionId={session} mode="briefing" />
}
