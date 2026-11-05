'use client'

import { useEffect, useRef } from 'react'
import type { TranscriptLine, TranscriptStatus } from '@/lib/agora/live-transcript'

// Display only. Evidence in the notebook comes from the server, never from these lines.
export function NotebookTranscript({ lines, status, suspectName }: { lines: TranscriptLine[]; status: TranscriptStatus; suspectName: string }) {
  const log = useRef<HTMLDivElement | null>(null)
  useEffect(() => { if(log.current) log.current.scrollTop = log.current.scrollHeight }, [lines])
  const note = status === 'unavailable' ? 'The live transcript is unavailable. Your voice interview is not affected.'
    : lines.length > 0 ? '' : status === 'live' ? 'Listening for the first words…' : 'The transcript appears here while the line is open.'
  return <div className="mt-4 border border-gold/25 bg-charcoal/30 p-4">
    <h3 className="label-mono text-gold/70">Live transcript</h3>
    <p className="mt-2 text-xs text-ivory/55">For reference only. Evidence appears above once verified.</p>
    {lines.length > 0 && <div ref={log} role="log" aria-label="Interview transcript" tabIndex={0} className="mt-3 flex max-h-44 flex-col gap-3 overflow-y-auto pr-2">{lines.map(line => <p key={line.id} className="text-sm leading-relaxed"><span className={`mr-2 font-mono text-xs uppercase tracking-widest ${line.speaker === 'suspect' ? 'text-gold' : 'text-ivory/55'}`}>{line.speaker === 'suspect' ? suspectName : 'You'}</span><span className="text-ivory/85">{line.text}</span></p>)}</div>}
    {note && <p role="status" className="mt-3 text-sm text-ivory/60">{note}</p>}
  </div>
}
