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
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [signup, setSignup] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [mic, setMic] = useState('')
  const requestKey = useRef<string | null>(null)
  useEffect(() => {
    void gameRequest<{authenticated:boolean;displayName?:string}>('/api/auth')
      .then(result => { setAuthenticated(result.authenticated); setName(result.displayName ?? '') })
      .catch(() => setError('Could not check your account. Please sign in.'))
      .finally(() => setChecking(false))
  }, [])
  async function authenticate() {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await gameRequest<{authenticated:boolean;confirmationRequired?:boolean}>('/api/auth', {method:'POST',body:JSON.stringify({action:signup?'signup':'login',email,password,...(signup?{detectiveName:name}:{})})})
      setAuthenticated(result.authenticated); setPassword('')
      if(result.confirmationRequired) setNotice('Check your email to confirm your account, then sign in here.')
    } catch(e) { setError(e instanceof Error ? e.message : 'Sign in failed.') }
    finally { setBusy(false) }
  }
  async function join() {
    if(busy) return
    setBusy(true); setError('')
    try {
      requestKey.current ??= crypto.randomUUID()
      const briefing = await gameRequest<Briefing>('/api/sessions', {method:'POST',headers:{'Idempotency-Key':requestKey.current},body:JSON.stringify({detectiveName:name})})
      router.push(`/case/${briefing.caseId}?session=${briefing.sessionId}`)
    } catch(e) { setError(e instanceof Error ? e.message : 'Could not assign a case.'); setBusy(false) }
  }
  async function checkMic() {
    try { const stream=await navigator.mediaDevices.getUserMedia({audio:true}); stream.getTracks().forEach(track=>track.stop());setMic('Microphone ready.') }
    catch { setMic('Microphone access is blocked. You can still review your case.') }
  }
  return <form className="mt-10 flex flex-col gap-5" onSubmit={e=>{e.preventDefault();void(authenticated?join():authenticate())}}>
    {checking ? <p className="text-sm text-ivory/60">Checking your account…</p> : <>
      <p className="text-sm text-ivory/65">{authenticated?'Your cases and scores are saved to your account.':'Sign in to keep your case history and appear on the leaderboard.'}</p>
      <label className="label-mono text-ivory/60">Detective name<Input value={name} onChange={e=>setName(e.target.value)} autoComplete="nickname" minLength={2} maxLength={24} required className="mt-2 h-12 rounded-none border-gold/30 bg-charcoal/50 text-ivory" /></label>
      {!authenticated && <>
        <label className="label-mono text-ivory/60">Email<Input type="email" value={email} onChange={e=>setEmail(e.target.value)} autoComplete="email" required className="mt-2 h-12 rounded-none border-gold/30 bg-charcoal/50 text-ivory" /></label>
        <label className="label-mono text-ivory/60">Password<Input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete={signup?'new-password':'current-password'} minLength={8} required className="mt-2 h-12 rounded-none border-gold/30 bg-charcoal/50 text-ivory" /></label>
        <button type="button" className="min-h-11 text-left text-sm text-gold underline" onClick={()=>setSignup(value=>!value)}>{signup?'Already registered? Sign in':'Need an account? Sign up'}</button>
      </>}
      {authenticated && <>
        <button type="button" onClick={()=>void checkMic()} className="min-h-12 border border-gold/30 p-3 text-left text-sm text-ivory">Check microphone</button>
        {mic && <p className="text-xs text-ivory/55">{mic}</p>}
      </>}
      {error && <p role="alert" className="border border-oxblood bg-oxblood/15 p-3 text-sm text-ivory">{error}</p>}
      {notice && <p role="status" className="text-sm text-gold">{notice}</p>}
      <Button type="submit" disabled={busy || name.trim().length<2} className="min-h-13 rounded-none bg-gold font-mono text-xs uppercase tracking-widest text-obsidian hover:bg-ivory">{busy?'Please wait…':authenticated?'Assign my case':signup?'Create account':'Sign in'}</Button>
      {authenticated && <button type="button" className="min-h-11 text-sm text-ivory/50 underline" onClick={async()=>{await gameRequest('/api/auth',{method:'POST',body:JSON.stringify({action:'logout'})});setAuthenticated(false);requestKey.current=null}}>Sign out</button>}
    </>}
  </form>
}
