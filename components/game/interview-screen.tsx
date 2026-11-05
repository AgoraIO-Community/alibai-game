'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PublicQuestion, SessionView } from '@/lib/game/api'
import type { useSuspectVoice } from '@/lib/agora/use-suspect-voice'
import { cn } from '@/lib/utils'
import { Eyebrow, StatusDot } from './deco'
import { DetectiveNotebook } from './detective-notebook'
import { SuggestedQuestions } from './suggested-questions'

export type SuspectVoice = ReturnType<typeof useSuspectVoice>

const goldButton = 'min-h-12 rounded-none bg-gold px-5 font-mono text-xs uppercase tracking-widest text-obsidian hover:bg-ivory'
const quietButton = 'min-h-12 rounded-none border border-gold/50 bg-transparent px-4 font-mono text-xs uppercase tracking-widest text-gold hover:bg-gold/10 hover:text-ivory'

/**
 * The interrogation room: suspect stage in the centre, questions and notebook alongside on wide
 * screens, tabs beneath a fixed-height stage on phones. Everything fits one viewport; the panels
 * scroll inside themselves. Handlers and conditions belong to ProductionSession; this only lays them out.
 */
export function InterviewScreen({ view, error, busy, clock, left, voice, questions, more, selectedQuestion, onSelectQuestion, onNextQuestions, onRefresh, onCancelConnection, onRetryConnection, onEndInterview }: {
  view: SessionView | null
  error: string
  busy: boolean
  clock: string
  left: number
  voice: SuspectVoice
  questions: PublicQuestion[]
  more: number | null
  selectedQuestion: string | null
  onSelectQuestion: (id: string) => void
  onNextQuestions: () => void
  onRefresh: () => void
  onCancelConnection: () => Promise<void>
  onRetryConnection: () => Promise<void>
  onEndInterview: () => Promise<void>
}) {
  const [panel, setPanel] = useState<'questions' | 'notebook'>('questions')
  const state = view?.session.state
  const live = ['live','reconnecting'].includes(voice.phase)
  const closed = state === 'ended' || state === 'scored'
  const counting = state === 'active' && !closed
  const lowTime = counting && left <= 30
  const finalSeconds = counting && left <= 10
  const line = voice.phase === 'live' ? { tone: 'verdigris' as const, pulse: true, label: 'Live' }
    : voice.phase === 'reconnecting' ? { tone: 'gold' as const, pulse: true, label: 'Reconnecting' }
    : ['error','ended'].includes(voice.phase) ? { tone: closed ? 'muted' as const : 'oxblood' as const, pulse: false, label: closed ? 'Closed' : 'Line down' }
    : { tone: 'gold' as const, pulse: true, label: 'Connecting' }

  return <main className="h-dvh overflow-x-hidden overflow-y-auto bg-obsidian spotlight text-ivory">
    <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
      <header className="flex shrink-0 items-end justify-between gap-4 border-b border-gold/20 pb-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-3"><Link href="/rules" className="label-mono text-gold hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">Rules / New case</Link><Eyebrow className="hidden text-ivory/40 sm:block">Case file</Eyebrow></div>
          {view && <>
            <h1 className="mt-1 truncate font-display text-xl leading-tight sm:text-2xl">{view.briefing.title}</h1>
            <p className="hidden truncate text-sm text-gold sm:block">{view.briefing.publicSuspect.name} · {view.briefing.publicSuspect.role}</p>
          </>}
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <time className={cn('font-mono text-2xl tabular-nums leading-none tracking-wider sm:text-3xl', finalSeconds ? 'bg-oxblood px-2 py-1 text-ivory animate-pulse motion-reduce:animate-none' : lowTime ? 'text-gold' : counting ? 'text-ivory' : 'text-gold')} aria-label={`${clock} remaining`}>{clock}</time>
          <p className="label-mono mt-1 text-ivory/50" aria-live="polite">{finalSeconds ? 'Final seconds' : lowTime ? 'Thirty seconds' : closed ? 'Interview closed' : 'Remaining'}</p>
        </div>
      </header>
      {error && <div role="alert" className="mt-3 shrink-0 border border-oxblood bg-oxblood/20 p-3 text-sm">{error}<button type="button" onClick={onRefresh} className="ml-3 underline">Retry</button></div>}
      {!view ? <p className="mt-12 label-mono">Opening case file…</p> : <>
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3 lg:grid lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)_minmax(260px,360px)] lg:grid-rows-[minmax(0,1fr)] lg:gap-4">
          <section aria-label="Suspect interview" className="relative h-[42dvh] shrink-0 overflow-hidden border border-gold/40 bg-obsidian shadow-[0_0_80px_rgba(0,0,0,0.6)] lg:order-2 lg:h-auto lg:min-h-0">
            <div ref={voice.videoElement} className="absolute inset-0" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-obsidian/90 to-transparent" aria-hidden />
            <span className="pointer-events-none absolute inset-1.5 border border-gold/20" aria-hidden />
            <span className="pointer-events-none absolute left-3 top-3 size-4 border-l border-t border-gold/70" aria-hidden />
            <span className="pointer-events-none absolute right-3 top-3 size-4 border-r border-t border-gold/70" aria-hidden />
            <span className="pointer-events-none absolute bottom-3 left-3 size-4 border-b border-l border-gold/70" aria-hidden />
            <span className="pointer-events-none absolute bottom-3 right-3 size-4 border-b border-r border-gold/70" aria-hidden />
            <div className="pointer-events-none absolute left-5 top-5 inline-flex items-center gap-2 bg-obsidian/75 px-2.5 py-1.5" aria-hidden>
              <StatusDot tone={line.tone} pulse={line.pulse} />
              <span className="label-mono text-ivory/85">{line.label}{live && voice.muted ? ' · Muted' : ''}</span>
            </div>
            {live && <figcaption className="pointer-events-none absolute inset-x-5 bottom-5">
              <p className="font-display text-2xl leading-none text-ivory sm:text-3xl">{view.briefing.publicSuspect.name}</p>
              <p className="label-mono mt-1.5 text-gold/80">{view.briefing.publicSuspect.role}</p>
            </figcaption>}
            {!live && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-obsidian/70 p-6 text-center">
              <p className="font-display text-3xl">{view.briefing.publicSuspect.name}</p>
              <p className="mt-4 max-w-md text-sm text-ivory/60">{voice.phase === 'connecting' ? 'Opening a secure line…' : voice.phase === 'waiting_media' ? 'Waiting for the suspect’s audio and avatar…' : ['error','ended'].includes(voice.phase) ? 'The line is down.' : 'Opening a secure line…'}</p>
            </div>}
          </section>
          <div role="tablist" aria-label="Interview panels" className="grid shrink-0 grid-cols-2 border border-gold/25 bg-charcoal/40 lg:hidden">
            {([['questions','Questions'],['notebook',`Notebook · ${view.notebook.length}`]] as const).map(([key,label]) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={panel === key} aria-controls={`interview-${key}`} onClick={() => setPanel(key)} className={cn('label-mono min-h-11 transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ivory', panel === key ? 'bg-gold text-obsidian' : 'text-ivory/70 hover:text-gold')}>{panel === key ? '◆ ' : ''}{label}</button>)}
          </div>
          <SuggestedQuestions id="interview-questions" questions={questions} more={more} selectedQuestion={selectedQuestion} onSelect={onSelectQuestion} onNext={onNextQuestions} className={cn('min-h-0 flex-1 lg:order-1', panel === 'questions' ? 'flex' : 'hidden lg:flex')} />
          <DetectiveNotebook id="interview-notebook" items={view.notebook} onRefresh={onRefresh} className={cn('min-h-0 flex-1 lg:order-3', panel === 'notebook' ? 'flex' : 'hidden lg:flex')} />
        </div>
        <footer className="mt-3 flex shrink-0 flex-col gap-2 border-t border-gold/20 pt-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1">
            <p role="status" className="flex items-center gap-2 text-xs text-gold sm:text-sm"><StatusDot tone={line.tone} pulse={line.pulse} className="shrink-0" />{voice.phase === 'live' ? 'Connected · Your microphone is live' : voice.phase === 'reconnecting' ? 'Reconnecting · The interview clock continues' : view.session.state === 'ended' || view.session.state === 'scored' ? 'Interview closed' : 'Your clock starts after audio and video connect.'}</p>
            {voice.error && <p role="alert" className="mt-1 text-xs text-ivory sm:text-sm">{voice.error}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            {voice.audioBlocked && <Button className={goldButton} onClick={voice.resumeAudio}>Enable suspect audio</Button>}
            {['connecting','waiting_media'].includes(voice.phase) && <button type="button" className="min-h-11 px-2 text-sm text-ivory/70 underline underline-offset-4 hover:text-ivory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold" onClick={onCancelConnection}>Cancel connection</button>}
            {view.session.state === 'abandoned' && <Link className="inline-flex min-h-11 items-center px-2 text-gold underline underline-offset-4" href="/rules">Request another case</Link>}
            {['created','preparing','active'].includes(view.session.state) && ['error','ended'].includes(voice.phase) && <Button className={goldButton} disabled={busy} onClick={onRetryConnection}>{view.session.state === 'active' ? 'Reconnect interview' : 'Retry connection'}</Button>}
            {live && <Button className={cn(quietButton, voice.muted && 'border-gold bg-gold/15 text-ivory')} aria-pressed={voice.muted} aria-label={voice.muted ? 'Unmute microphone' : 'Mute microphone'} onClick={() => void voice.toggleMute()}>{voice.muted ? <MicOff className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}<span className="hidden sm:inline">{voice.muted ? 'Unmute microphone' : 'Mute microphone'}</span><span className="sm:hidden">{voice.muted ? 'Unmute' : 'Mute'}</span></Button>}
            <Button className={cn(goldButton, 'flex-1 sm:flex-none')} disabled={busy || !['active','ended','scored'].includes(view.session.state)} onClick={onEndInterview}>End interview and file verdict</Button>
          </div>
        </footer>
      </>}
    </div>
  </main>
}
