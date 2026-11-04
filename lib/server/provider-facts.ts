import './only';
import { createHash } from 'node:crypto';
import { getSuspectProviderHistory } from '../agora/server-agent';
import { matchProviderDisclosure } from '../scenarios/provider-disclosures';
import { GameError, rest } from './db';
import { loadSession, readProjection, recordFactRevealed, recordTranscriptTurn } from './game';

const SKIPPABLE = new Set(['UNSUPPORTED_DISCLOSURE', 'UNVERIFIED_DISCLOSURE', 'TURN_CONFLICT', 'FACT_LOCKED']);

/**
 * Owner-authenticated polling trigger only: accepts no transcript or fact IDs.
 * Provider memory verifies model output, not audio delivery (managed history has
 * no per-turn playback timestamps). Full-utterance matching deliberately fails
 * closed on paraphrases, quoted facts inside denials, and ambiguous text.
 */
export async function syncProviderFacts(playerId: string, sessionId: string) {
  const snapshot = await loadSession(playerId, sessionId);
  if (snapshot.session.state !== 'active') throw new GameError('NOT_ACTIVE', 409);
  const runs = await rest<{ agent_id: string | null; state: string }[]>(
    `agent_runs?session_id=eq.${sessionId}&select=agent_id,state`);
  const agentId = runs[0]?.agent_id;
  if (!agentId || runs[0].state !== 'running') throw new GameError('AGENT_NOT_READY', 409);
  const history = await getSuspectProviderHistory(agentId);
  const discovered = new Set(snapshot.factIds);
  const source = 'agora-provider-history';
  for (const message of history) {
    const fact = matchProviderDisclosure(snapshot.scenario, message.role, message.content, discovered);
    if (!fact) continue;
    // History has no stable managed turn IDs and its window shifts. Hash exact
    // text with agent ID, not array index; repeated disclosures earn no points.
    // Postgres trim() strips only spaces, so store the text the matcher actually compared.
    const transcript = message.content.trim();
    const turnId = `agora-history-${createHash('sha256').update(agentId).update('\0').update(transcript).digest('hex')}`;
    try {
      await recordTranscriptTurn(sessionId, { turnId, actor: 'suspect', transcript, source });
      await recordFactRevealed(sessionId, fact.id, turnId, source);
      discovered.add(fact.id);
    } catch (error) {
      // This turn stays in history, so a rejection must not block the turns after it.
      if (!(error instanceof GameError) || !SKIPPABLE.has(error.code)) throw error;
      console.error('Provider disclosure rejected', error.code);
    }
  }
  return readProjection(playerId, sessionId);
}
