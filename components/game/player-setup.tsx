'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { gameRequest, type Briefing } from '@/lib/game/api'

export function PlayerSetup() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [mic, setMic] = useState('')
  const requestKey = useRef<string | null>(null)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('auth_error')) {
      setError('Google sign-in could not be completed. Please try again and allow the sign-in window to finish.')
    }
    void gameRequest<{authenticated:boolean;displayName?:string}>('/api/auth')
      .then(result => { setAuthenticated(result.authenticated); setName(result.displayName ?? '') })
      .catch(() => setError('Could not check your account. Please try signing in with Google.'))
      .finally(() => setChecking(false))
  }, [])

  function signIn() {
    if (busy) return
    setBusy(true)
    window.location.assign('/api/auth/google')
  }

  async function join() {
    if (busy || !authenticated) return
    setBusy(true); setError('')
    try {
      requestKey.current ??= crypto.randomUUID()
      const briefing = await gameRequest<Briefing>('/api/sessions', {
        method:'POST', headers:{'Idempotency-Key':requestKey.current},
        body:JSON.stringify({detectiveName:name}),
      })
      router.push(`/case/${briefing.caseId}?session=${briefing.sessionId}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not assign a case.')
      setBusy(false)
    }
  }

  async function checkMic() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({audio:true})
      stream.getTracks().forEach(track => track.stop())
      setMic('Microphone ready.')
    } catch { setMic('Microphone access is blocked. You can still review your case.') }
  }

  async function signOut() {
    setBusy(true); setError('')
    try {
      await gameRequest('/api/auth',{method:'POST',body:JSON.stringify({action:'logout'})})
      setAuthenticated(false); setName(''); requestKey.current = null
    } catch { setError('Could not sign out. Please try again.') }
    finally { setBusy(false) }
  }

  return <form className="mt-10 flex flex-col gap-5" onSubmit={event => {
    event.preventDefault()
    if (authenticated) void join()
    else signIn()
  }}>
    {checking ? <p className="text-sm text-ivory/60">Checking your account…</p> : <>
      <p className="text-sm text-ivory/65">{authenticated
        ? 'Your cases and scores are saved to your account.'
        : 'Sign in with Google to keep your case history and appear on the leaderboard.'}</p>
      {authenticated && <>
        <label className="label-mono text-ivory/60">Detective name
          <Input value={name} onChange={event => setName(event.target.value)} autoComplete="nickname"
            minLength={2} maxLength={24} required
            className="mt-2 h-12 rounded-none border-gold/30 bg-charcoal/50 text-ivory" />
        </label>
        <button type="button" onClick={() => void checkMic()}
          className="min-h-12 border border-gold/30 p-3 text-left text-sm text-ivory">Check microphone</button>
        {mic && <p className="text-xs text-ivory/55">{mic}</p>}
      </>}
      {error && <p role="alert" className="border border-oxblood bg-oxblood/15 p-3 text-sm text-ivory">{error}</p>}
      <Button type="submit" disabled={busy || (authenticated && name.trim().length < 2)}
        className="min-h-13 rounded-none bg-gold font-mono text-xs uppercase tracking-widest text-obsidian hover:bg-ivory">
        {busy ? 'Please wait…' : authenticated ? 'Assign my case' : 'Continue with Google'}
      </Button>
      {authenticated && <button type="button" disabled={busy} className="min-h-11 text-sm text-ivory/50 underline"
        onClick={() => void signOut()}>Sign out</button>}
    </>}
  </form>
}
