import Link from 'next/link'
export default function AdminPage() {
  return <main className="min-h-dvh bg-obsidian p-8 text-ivory"><h1 className="font-display text-3xl">Bureau operations</h1><p className="mt-4 text-ivory/60">Scenario generation and publishing are available through the administrator CLI. Private case dossiers are not available on this page.</p><Link href="/" className="mt-6 block text-gold underline">Return home</Link></main>
}
