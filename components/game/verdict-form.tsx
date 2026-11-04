import { ProductionSession } from './production-session'
export function VerdictForm({sessionId}:{sessionId:string}) { return <ProductionSession sessionId={sessionId} mode="verdict" /> }
