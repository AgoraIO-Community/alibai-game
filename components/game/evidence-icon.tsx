import {
  BadgeAlert,
  CameraOff,
  Clock,
  DoorOpen,
  FileText,
  Fingerprint,
  Gem,
  KeyRound,
  type LucideProps,
} from 'lucide-react'
import type { EvidenceIcon as EvidenceIconName } from '@/lib/game/types'

const ICONS: Record<EvidenceIconName, React.ComponentType<LucideProps>> = {
  gem: Gem,
  'camera-off': CameraOff,
  'key-round': KeyRound,
  'door-open': DoorOpen,
  clock: Clock,
  'file-text': FileText,
  fingerprint: Fingerprint,
  'badge-alert': BadgeAlert,
}

export function EvidenceIcon({ name, ...props }: { name: EvidenceIconName } & LucideProps) {
  const Icon = ICONS[name]
  return <Icon {...props} />
}
