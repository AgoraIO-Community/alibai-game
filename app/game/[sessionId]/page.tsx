import { InterrogationRoom } from '@/components/game/interrogation-room'

export default async function GamePage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <InterrogationRoom sessionId={sessionId} />
}
