import type { Metadata } from 'next'
import { AgentOpsDashboard } from '@/components/admin/agent-ops-dashboard'

export const metadata: Metadata = {
  title: 'AgentOps · Interrogate the Agent',
  description: 'Organizer control room for live interrogation sessions.',
}

export default function AdminPage() {
  return <AgentOpsDashboard />
}
