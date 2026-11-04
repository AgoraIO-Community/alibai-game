'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ArrowRight, Check, Mic, MicOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CASES } from '@/lib/game/mock-data'
import { gameActions, useDetectiveName } from '@/lib/game/session-store'
import { cn } from '@/lib/utils'

type MicStatus = 'unknown' | 'requesting' | 'granted' | 'denied'

export function PlayerSetup() {
  const router = useRouter()
  const savedName = useDetectiveName()
  const [name, setName] = useState(savedName)
  const [mic, setMic] = useState<MicStatus>('unknown')

  const canContinue = name.trim().length >= 2

  async function requestMicrophone() {
    setMic('requesting')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((t) => t.stop())
      setMic('granted')
    } catch {
      setMic('denied')
    }
  }

  function handleContinue() {
    if (!canContinue) return
    gameActions.setDetectiveName(name)
    router.push(`/case/${CASES[0].id}`)
  }

  return (
    <form
      className="mt-10 flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault()
        handleContinue()
      }}
    >
      <div className="flex flex-col gap-2">
        <label htmlFor="detective-name" className="label-mono text-ivory/60">
          Detective name
        </label>
        <Input
          id="detective-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Det. Marlowe"
          autoComplete="nickname"
          maxLength={24}
          className="h-12 rounded-none border-gold/30 bg-charcoal/50 font-display text-lg text-ivory placeholder:text-ivory/30 focus-visible:border-gold"
        />
        <p className="text-xs text-ivory/45">This is the name shown on the leaderboard.</p>
      </div>

      <div className="flex flex-col gap-2">
        <p className="label-mono text-ivory/60">Microphone</p>
        <button
          type="button"
          onClick={requestMicrophone}
          disabled={mic === 'requesting' || mic === 'granted'}
          className={cn(
            'flex items-center justify-between gap-4 border px-4 py-3 text-left transition-colors',
            mic === 'granted'
              ? 'border-verdigris/60 bg-verdigris/10'
              : mic === 'denied'
                ? 'border-oxblood/60 bg-oxblood/10'
                : 'border-gold/30 bg-charcoal/50 hover:border-gold/60',
          )}
        >
          <span className="flex items-center gap-3">
            {mic === 'denied' ? <MicOff className="size-4 text-oxblood" /> : <Mic className="size-4 text-gold" />}
            <span className="text-sm text-ivory">
              {mic === 'unknown' && 'Allow microphone access'}
              {mic === 'requesting' && 'Waiting for permission…'}
              {mic === 'granted' && 'Microphone ready'}
              {mic === 'denied' && 'Microphone blocked — you can still continue in demo mode'}
            </span>
          </span>
          {mic === 'granted' && <Check className="size-4 text-verdigris" />}
        </button>
        <p className="text-xs text-ivory/45">The interrogation is a live voice conversation. You speak; the suspect answers.</p>
      </div>

      <Button
        type="submit"
        disabled={!canContinue}
        size="lg"
        className="h-13 rounded-none bg-gold font-mono text-xs uppercase tracking-[0.22em] text-obsidian hover:bg-ivory"
      >
        Continue to case file
        <ArrowRight data-icon="inline-end" />
      </Button>
    </form>
  )
}
