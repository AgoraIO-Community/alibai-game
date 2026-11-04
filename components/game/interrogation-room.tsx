'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useMockVoice } from '@/lib/agora/use-mock-voice'
import { getCase, getEvidenceForCase, getSuspect } from '@/lib/game/mock-data'
import { getEligibleQuestions } from '@/lib/game/question-engine'
import { gameActions, useSession } from '@/lib/game/session-store'
import { ClueNotification } from './clue-notification'
import { DetectiveNotebook } from './detective-notebook'
import { InterrogationTimer } from './interrogation-timer'
import { LiveTranscript } from './live-transcript'
import { SuggestedQuestions } from './suggested-questions'
import { SuspectAvatar } from './suspect-avatar'
import { VoiceControls } from './voice-controls'
import { VoiceWaveform } from './voice-waveform'

export function InterrogationRoom({ sessionId }: { sessionId: string }) {
  const router = useRouter()
  const session = useSession(sessionId)
  const [notebookOpen, setNotebookOpen] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    gameActions.ensureSession(sessionId)
  }, [sessionId])

  const voice = useMockVoice(sessionId, session !== null && session.state !== 'SCORED')

  const gameCase = session ? getCase(session.caseId) : null
  const suspect = session ? getSuspect(session.suspectId) : null
  const evidence = useMemo(() => (session ? getEvidenceForCase(session.caseId) : []), [session])
  const duration = gameCase?.durationSeconds ?? 180

  useEffect(() => {
    if (!session?.startedAt || session.state !== 'ACTIVE') return
    const startedAt = session.startedAt
    const tick = () => {
      const left = duration - (Date.now() - startedAt) / 1000
      setRemaining(left)
      if (left <= 0) {
        gameActions.end(sessionId)
        router.push(`/game/${sessionId}/verdict`)
      }
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [session?.startedAt, session?.state, duration, sessionId, router])

  useEffect(() => {
    if (session?.state === 'SCORED') router.replace(`/game/${sessionId}/results`)
  }, [session?.state, sessionId, router])

  if (!session || !gameCase || !suspect) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-obsidian">
        <p className="label-mono text-ivory/50">Opening session…</p>
      </main>
    )
  }

  const questions = getEligibleQuestions(session)
  const lastSuspectTurn = [...session.transcript].reverse().find((t) => t.speaker === 'suspect') ?? null
  const running = session.state === 'ACTIVE'
  const timeRemaining = remaining ?? duration

  function goToVerdict() {
    gameActions.end(sessionId)
    router.push(`/game/${sessionId}/verdict`)
  }

  return (
    <main className="min-h-dvh bg-obsidian pb-28">
      <header className="sticky top-0 z-20 border-b border-gold/15 bg-obsidian/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-8">
          <div className="min-w-0">
            <p className="label-mono text-gold/70">Case {gameCase.caseNumber}</p>
            <p className="truncate font-display text-lg leading-tight text-ivory">
              Interrogating <span className="font-medium">{suspect.name}</span>
            </p>
          </div>
          <InterrogationTimer remaining={timeRemaining} total={duration} running={running} />
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-10 lg:px-8 lg:pt-8">
        <section className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start" aria-label="Suspect">
          <SuspectAvatar suspect={suspect} voiceState={voice.voiceState} className="aspect-[4/5] max-h-[56dvh] w-full sm:aspect-[3/4] lg:aspect-auto lg:h-[52dvh] lg:max-h-[600px]" />
          <VoiceWaveform voiceState={voice.voiceState} />
          <LiveTranscript
            speaking={voice.speaking}
            voiceState={voice.voiceState}
            lastSuspectTurn={lastSuspectTurn}
            suspectName={suspect.name}
          />
        </section>

        <section className="flex flex-col gap-6">
          <SuggestedQuestions
            questions={questions}
            disabled={voice.voiceState !== 'listening'}
            onAsk={voice.askQuestion}
          />

          <div className="hidden border border-ivory/10 bg-charcoal/30 p-4 lg:block">
            <div className="flex items-center justify-between">
              <p className="label-mono text-ivory/50">Investigation status</p>
              <button
                type="button"
                onClick={() => setNotebookOpen(true)}
                className="label-mono text-gold hover:underline"
              >
                Open notebook
              </button>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <div>
                <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-ivory/45">Clues</dt>
                <dd className="font-mono text-2xl text-gold">{session.discoveredClueIds.length}</dd>
              </div>
              <div>
                <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-ivory/45">Questions</dt>
                <dd className="font-mono text-2xl text-ivory">{session.askedQuestionIds.length}</dd>
              </div>
              <div>
                <dt className="text-[0.6rem] uppercase tracking-[0.14em] text-ivory/45">Open leads</dt>
                <dd className="font-mono text-2xl text-ivory">{questions.length}</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>

      <ClueNotification discoveredClueIds={session.discoveredClueIds} />

      <DetectiveNotebook
        open={notebookOpen}
        onOpenChange={setNotebookOpen}
        session={session}
        evidence={evidence}
        suspectName={suspect.name}
      />

      <VoiceControls
        voiceState={voice.voiceState}
        muted={voice.muted}
        clueCount={session.discoveredClueIds.length}
        onToggleMute={voice.toggleMute}
        onOpenNotebook={() => setNotebookOpen(true)}
        onSubmitVerdict={goToVerdict}
        onPressStart={voice.beginFreeSpeech}
        onPressEnd={voice.endFreeSpeech}
      />
    </main>
  )
}
