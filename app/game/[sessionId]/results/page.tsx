import { ScoreBreakdown } from '@/components/game/score-breakdown'

export default async function ResultsPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <ScoreBreakdown sessionId={sessionId} />
}
