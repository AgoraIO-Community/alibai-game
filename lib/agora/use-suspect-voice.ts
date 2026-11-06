'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { IAgoraRTCClient, IMicrophoneAudioTrack, IRemoteAudioTrack, IRemoteVideoTrack } from 'agora-rtc-sdk-ng'
import { GameRequestError, sessionRequest, type SessionView } from '@/lib/game/api'
import { connectLiveTranscript, type LiveTranscript, type TranscriptLine, type TranscriptStatus } from '@/lib/agora/live-transcript'

interface RtcCredentials {
  appId: string; channel: string; uid: number; rtcToken: string; rtmUid: string; rtmToken: string
  agentUid: number; avatarUid: number; expiresAt: number
}
interface ConnectResponse { view: SessionView; connection: RtcCredentials | null }
type Phase = 'idle' | 'connecting' | 'waiting_media' | 'live' | 'reconnecting' | 'ended' | 'error'

/** Media lifecycle adapted from the official Next.js ConversationComponent and RTC Web skill.
 * Live captions are display only. No transcript or fact leaves the browser: discovery remains
 * a trusted server responsibility, and captions take no part in the readiness gate.
 */
const MEDIA_TIMEOUT_MS = 60000, READY_RETRY_MS = 500, FAILURE_POLL_MS = 3000
const START_FAILED = 'The suspect could not be reached. Your clock never started. Please request another case.'
const hasCode = (error: unknown, code: string) => error instanceof GameRequestError && error.code === code
export function useSuspectVoice(sessionId: string, onView: (view: SessionView) => void, onRefresh: () => Promise<void>) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [error, setError] = useState('')
  const [muted, setMuted] = useState(false)
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [transcript, setTranscript] = useState<TranscriptLine[]>([])
  const [transcriptStatus, setTranscriptStatus] = useState<TranscriptStatus>('idle')
  const videoElement = useRef<HTMLDivElement | null>(null)
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const microphoneRef = useRef<IMicrophoneAudioTrack | null>(null)
  const audioRef = useRef<IRemoteAudioTrack | null>(null)
  const videoRef = useRef<IRemoteVideoTrack | null>(null)
  const transcriptRef = useRef<LiveTranscript | null>(null)
  const transcriptLines = useRef<TranscriptLine[]>([])
  const attempt = useRef(0)
  const active = useRef(false)
  const starting = useRef(false)
  const hasAgent = useRef(false)
  const viewCallback = useRef(onView)
  const refreshCallback = useRef(onRefresh)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const failureWatch = useRef<ReturnType<typeof setInterval> | null>(null)
  viewCallback.current = onView
  refreshCallback.current = onRefresh

  const clearStartTimers = useCallback(() => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null }
    if (failureWatch.current) { clearInterval(failureWatch.current); failureWatch.current = null }
  }, [])

  const releaseMedia = useCallback(async () => {
    clearStartTimers()
    const microphone = microphoneRef.current; microphoneRef.current = null
    const client = clientRef.current; clientRef.current = null
    const liveTranscript = transcriptRef.current; transcriptRef.current = null
    // Started first so the toolkit detaches before the RTC listeners below are removed.
    const transcriptReleased = liveTranscript?.release()
    setTranscriptStatus('idle')
    audioRef.current?.stop(); audioRef.current = null
    videoRef.current?.stop(); videoRef.current = null
    if (microphone) { microphone.stop(); microphone.close() }
    if (client) { client.removeAllListeners(); await client.leave().catch(() => {}) }
    await transcriptReleased
  }, [clearStartTimers])

  const disconnect = useCallback(async () => {
    ++attempt.current; starting.current = false; active.current = false
    await releaseMedia(); setPhase('ended')
  }, [releaseMedia])

  const start = useCallback(async () => {
    if (starting.current || active.current) return
    starting.current = true
    const current = ++attempt.current
    const isCurrent = () => attempt.current === current
    setError(''); setPhase('connecting'); setMuted(false); setAudioBlocked(false)
    await releaseMedia()
    let agentRequested = false, agentFailed = false
    try {
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      AgoraRTC.setLogLevel(3)
      const microphone = await AgoraRTC.createMicrophoneAudioTrack({ encoderConfig:'speech_standard', AEC:true, ANS:true, AGC:true })
      if (!isCurrent()) { microphone.stop(); microphone.close(); return }
      microphoneRef.current = microphone
      // Set before the request: leaving while it is in flight must still end the session.
      hasAgent.current = true
      const { view, connection: credentials } = await sessionRequest<ConnectResponse>(sessionId, 'connect', {}).catch(error => { agentFailed = true; throw error })
      agentRequested = true
      if (!isCurrent()) { await releaseMedia(); void sessionRequest(sessionId,'end',{}).catch(()=>{}); return }
      viewCallback.current(view)
      if (!credentials) {
        // The session is over or its run can't continue, so there is nothing to join.
        hasAgent.current = false; starting.current = false
        await releaseMedia()
        if (['created','preparing','active'].includes(view.session.state)) { setError(START_FAILED); setPhase('error') } else setPhase('ended')
        return
      }
      const client = AgoraRTC.createClient({ mode:'rtc', codec:'h264' })
      clientRef.current = client
      let audioDecoded = false, videoDecoded = false, published = false, ready = false, readyInFlight = false
      let failedAutoplay = false
      const giveUp = (message: string, endSession: boolean) => {
        setError(message); setPhase('error'); starting.current = false; ++attempt.current; hasAgent.current = false
        void releaseMedia()
        void (endSession ? sessionRequest(sessionId,'end',{}) : Promise.resolve()).then(() => refreshCallback.current()).catch(()=>{})
      }
      // The agent starts on the server while this runs, so the deadline covers the whole start.
      timeoutRef.current = setTimeout(() => {
        if(isCurrent() && !ready) giveUp('The suspect’s audio and avatar did not connect in time. Your clock never started. Please request another case.', true)
      }, MEDIA_TIMEOUT_MS)
      // A failed background start abandons the session. Polling carries that even without Realtime.
      failureWatch.current = setInterval(() => {
        void sessionRequest<SessionView>(sessionId,'read').then(latest => {
          if(isCurrent() && !ready && latest.session.state === 'abandoned') giveUp(START_FAILED, false)
        }).catch(()=>{})
      }, FAILURE_POLL_MS)
      const markReady = async () => {
        if (!isCurrent() || ready || readyInFlight || !published || !audioDecoded || !videoDecoded || failedAutoplay) return
        readyInFlight = true
        try {
          // Media can beat the agent's commit. The media deadline bounds these retries.
          let view: SessionView | null = null
          while (!view) {
            try { view = await sessionRequest<SessionView>(sessionId, 'ready', {}) }
            catch (error) {
              if (!hasCode(error, 'AGENT_START_PENDING')) throw error
              await new Promise(resolve => setTimeout(resolve, READY_RETRY_MS))
              if (!isCurrent()) return
            }
          }
          if (!isCurrent()) return
          ready = true; active.current = true; starting.current = false
          clearStartTimers()
          setPhase('live'); viewCallback.current(view)
        } catch (error) {
          if(!isCurrent()) return
          if(hasCode(error, 'AGENT_START_FAILED')) giveUp(START_FAILED, false)
          else { setError('Media is connected, but the interview clock is not ready yet. Please retry the connection.'); setPhase('error') }
        } finally { readyInFlight = false }
      }
      AgoraRTC.onAudioAutoplayFailed = () => { if(isCurrent()) { failedAutoplay = true; setAudioBlocked(true) } }
      // Register before join to catch tracks from the already-starting cloud agent.
      client.on('user-published', async (user, mediaType) => {
        if (!isCurrent() || (mediaType !== 'audio' && mediaType !== 'video')) return
        if (![credentials.agentUid,credentials.avatarUid].includes(Number(user.uid))) return
        if (mediaType === 'video' && Number(user.uid) !== credentials.avatarUid) return
        try {
          await client.subscribe(user, mediaType)
          if(!isCurrent()) return
          if(mediaType === 'audio' && user.audioTrack) {
            // Prefer avatar-delayed audio if the avatar publishes it; never play both tracks.
            if(audioRef.current && Number(user.uid) !== credentials.avatarUid) return
            audioRef.current?.stop(); audioRef.current = user.audioTrack
            user.audioTrack.on('first-frame-decoded', () => { audioDecoded = true; void markReady() })
            user.audioTrack.play()
          }
          if(mediaType === 'video' && user.videoTrack) {
            videoRef.current = user.videoTrack
            user.videoTrack.on('first-frame-decoded', () => { videoDecoded = true; void markReady() })
            if(videoElement.current) user.videoTrack.play(videoElement.current, { fit:'contain' })
          }
        } catch { if(isCurrent()) setError('A remote media track could not be opened. Check your connection and retry.') }
      })
      client.on('connection-state-change', state => {
        if(!isCurrent()) return
        if(state === 'RECONNECTING') setPhase('reconnecting')
        if(state === 'CONNECTED' && ready) setPhase('live')
        if(state === 'DISCONNECTED' && ready) { setPhase('error'); setError('The voice connection was lost. The server clock continues; reconnect or finish your verdict.') }
      })
      client.on('token-privilege-will-expire', () => {
        void sessionRequest<ConnectResponse>(sessionId,'connect',{}).then(async ({ connection })=>{ if(!connection) throw new Error('No connection'); await client.renewToken(connection.rtcToken); await transcriptRef.current?.renewToken(connection.rtmToken) }).catch(()=>setError('Connection credentials could not be renewed. Finish your interview and submit a verdict.'))
      })
      // Not awaited: captions run beside the join to catch the greeting, and can neither
      // delay nor fail the media path. A reconnect keeps the lines already on screen.
      const earlierLines = transcriptLines.current
      transcriptRef.current = connectLiveTranscript({
        rtcClient: client, appId: credentials.appId, channel: credentials.channel, rtmUid: credentials.rtmUid, rtmToken: credentials.rtmToken,
        onStatus: setTranscriptStatus,
        onLines: lines => {
          transcriptLines.current = [...earlierLines, ...lines.map(line => ({ ...line, id: `${current}-${line.id}` }))]
          setTranscript(transcriptLines.current)
        },
      })
      await client.join(credentials.appId, credentials.channel, credentials.rtcToken, credentials.uid)
      if(!isCurrent()) { await releaseMedia(); return }
      await client.publish(microphone)
      published = true; setPhase('waiting_media'); void markReady()
      // Replay from a fresh user gesture can release browser autoplay restrictions.
      resumeRef.current = () => { audioRef.current?.play(); failedAutoplay = false; setAudioBlocked(false); void markReady() }
    } catch (error) {
      if(isCurrent()) {
        starting.current = false; active.current = false; await releaseMedia(); setPhase('error')
        setError(agentFailed
          ? (error instanceof Error ? error.message : 'The suspect could not be reached. Your clock never started.')
          : 'Could not connect the interview. Allow microphone access, check your connection, and retry. Your case is saved.')
        if(agentRequested) await sessionRequest(sessionId,'end',{}).catch(()=>{})
        // A failed start abandons the session on the server; show the player the way out.
        // connect normally brings the view, so without it this is also the page's first read.
        await refreshCallback.current().catch(()=>{})
      }
    }
  }, [sessionId, releaseMedia, clearStartTimers])

  const resumeRef = useRef<() => void>(() => {})
  const resumeAudio = useCallback(() => resumeRef.current(), [])
  const toggleMute = useCallback(async () => {
    const microphone = microphoneRef.current
    if(!microphone) return
    const next = !muted
    try { await microphone.setEnabled(!next); setMuted(next) }
    catch { setError('Microphone state could not be changed. Check browser permissions.') }
  }, [muted])
  useEffect(() => () => {
    ++attempt.current; starting.current = false; active.current = false
    void releaseMedia()
    transcriptLines.current = []; setTranscript([])
    // Best effort only. The cleanup worker is authoritative when tabs disappear.
    if(hasAgent.current) void fetch(`/api/sessions/${encodeURIComponent(sessionId)}/end`, { method:'POST', credentials:'same-origin', headers:{'Content-Type':'application/json'},body:'{}',keepalive:true }).catch(()=>{})
  }, [sessionId,releaseMedia])

  return { phase,error,muted,audioBlocked,transcript,transcriptStatus,videoElement,start,disconnect,toggleMute,resumeAudio }
}
