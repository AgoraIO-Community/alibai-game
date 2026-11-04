import { cn } from '@/lib/utils'

export function DecoRule({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)} aria-hidden>
      <span className="deco-rule flex-1" />
      <span className="size-1.5 rotate-45 border border-gold/70" />
      <span className="deco-rule flex-1" />
    </div>
  )
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('label-mono text-gold/80', className)}>{children}</p>
}

export function StatusDot({
  tone = 'gold',
  pulse = false,
  className,
}: {
  tone?: 'gold' | 'verdigris' | 'oxblood' | 'muted'
  pulse?: boolean
  className?: string
}) {
  const color = {
    gold: 'bg-gold',
    verdigris: 'bg-verdigris',
    oxblood: 'bg-oxblood',
    muted: 'bg-muted-foreground',
  }[tone]
  return (
    <span className={cn('relative inline-flex size-2', className)} aria-hidden>
      {pulse && <span className={cn('absolute inset-0 rounded-full opacity-70 animate-ping', color)} />}
      <span className={cn('relative inline-flex size-2 rounded-full', color)} />
    </span>
  )
}

export function Monogram({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn('size-10 text-gold', className)} aria-hidden fill="none">
      <rect x="4" y="4" width="40" height="40" stroke="currentColor" strokeWidth="1" />
      <rect x="9" y="9" width="30" height="30" stroke="currentColor" strokeWidth="0.6" opacity="0.6" />
      <path d="M24 12 L34 24 L24 36 L14 24 Z" stroke="currentColor" strokeWidth="1" />
      <path d="M24 18 L30 24 L24 30 L18 24 Z" fill="currentColor" opacity="0.8" />
    </svg>
  )
}
