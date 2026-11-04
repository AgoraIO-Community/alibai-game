'use client'

import { Check, Mic, MicOff, TriangleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

type Status = 'idle' | 'requesting' | 'listening' | 'ready' | 'silent' | 'blocked' | 'missing'

const LISTEN_MS = 4000
// RMS level that counts as hearing a voice; rejects typical room noise.
const VOICE_LEVEL = 0.02
const BARS = 5

const COPY: Record<Status, { title: string; detail: string; action?: string }> = {
  idle: { title: 'Test your microphone', detail: 'Make sure the suspect can hear you.', action: 'Start test' },
  requesting: { title: 'Waiting for permission', detail: 'Choose Allow in your browser’s prompt.' },
  listening: { title: 'Say something', detail: 'Try “Where were you last night?”' },
  ready: { title: 'Microphone ready', detail: 'We can hear you clearly.', action: 'Test again' },
  silent: { title: 'We couldn’t hear you', detail: 'Check your input device or move closer.', action: 'Try again' },
  blocked: { title: 'Microphone blocked', detail: 'Allow it in your browser’s site settings, then try again.', action: 'Try again' },
  missing: { title: 'No microphone found', detail: 'Connect one, then try again.', action: 'Try again' },
}

export function MicCheck() {
  const [status, setStatus] = useState<Status>('idle')
  const bars = useRef<(HTMLSpanElement | null)[]>([])
  const release = useRef<(() => void) | null>(null)

  useEffect(() => () => release.current?.(), [])

  async function test() {
    release.current?.()
    setStatus('requesting')
    let cancelled = false
    release.current = () => { cancelled = true }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (cancelled) { stream.getTracks().forEach(track => track.stop()); return }
      const context = new AudioContext()
      await context.resume()
      const analyser = context.createAnalyser()
      analyser.fftSize = 1024
      context.createMediaStreamSource(stream).connect(analyser)
      const samples = new Float32Array(analyser.fftSize)
      let frame = 0, heard = false
      const finish = () => {
        cancelAnimationFrame(frame)
        stream.getTracks().forEach(track => track.stop())
        void context.close()
        release.current = null
      }
      const startedAt = performance.now()
      const draw = () => {
        analyser.getFloatTimeDomainData(samples)
        const level = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)
        heard ||= level >= VOICE_LEVEL
        const lit = Math.min(BARS, Math.ceil((level / (VOICE_LEVEL * 4)) * BARS))
        bars.current.forEach((bar, index) => { if (bar) bar.dataset.lit = String(index < lit) })
        if (performance.now() - startedAt < LISTEN_MS) { frame = requestAnimationFrame(draw); return }
        finish()
        setStatus(heard ? 'ready' : 'silent')
      }
      release.current = finish
      setStatus('listening')
      draw()
    } catch (error) {
      if (cancelled) return
      release.current = null
      const name = error instanceof DOMException ? error.name : ''
      setStatus(name === 'NotFoundError' || name === 'OverconstrainedError' ? 'missing' : 'blocked')
    }
  }

  const copy = COPY[status]
  const failed = status === 'blocked' || status === 'missing' || status === 'silent'
  const Icon = status === 'ready' ? Check : status === 'blocked' ? MicOff : failed ? TriangleAlert : Mic

  return (
    <div className={cn('flex min-h-20 items-center gap-4 border bg-charcoal/40 p-4 transition-colors',
      status === 'ready' ? 'border-verdigris' : failed ? 'border-oxblood' : 'border-gold/30')}>
      <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center border',
        status === 'ready' ? 'border-verdigris bg-verdigris text-obsidian'
          : failed ? 'border-oxblood bg-oxblood/30 text-ivory' : 'border-gold/40 text-gold')}>
        <Icon className={cn('size-5', status === 'requesting' && 'animate-pulse')} />
      </span>
      <div role="status" className="min-w-0 flex-1">
        <p className="font-display text-lg leading-tight text-ivory">{copy.title}</p>
        <p className="mt-1 text-xs leading-snug text-ivory/60">{copy.detail}</p>
      </div>
      {status === 'listening' && <div aria-hidden className="flex h-8 shrink-0 items-end gap-1">
        {Array.from({ length: BARS }, (_, index) => <span key={index} ref={element => { bars.current[index] = element }}
          data-lit="false" style={{ height: `${30 + index * 17.5}%` }}
          className="w-1.5 bg-ivory/15 transition-colors duration-75 data-[lit=true]:bg-gold" />)}
      </div>}
      {copy.action && <button type="button" onClick={() => void test()}
        className="min-h-11 shrink-0 border border-gold/50 px-3 font-mono text-[0.65rem] uppercase tracking-[0.14em] text-gold transition-colors hover:bg-gold hover:text-obsidian focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
        {copy.action}
      </button>}
    </div>
  )
}
