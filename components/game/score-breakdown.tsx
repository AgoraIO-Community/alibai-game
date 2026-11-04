import { ProductionSession } from './production-session'
export function ScoreBreakdown({sessionId}:{sessionId:string}) { return <ProductionSession sessionId={sessionId} mode="results" /> }
