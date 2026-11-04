import { createHash } from 'node:crypto';
import type { Scenario } from './schema';
const normalize = (s:string) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export function fingerprint(s:Scenario):string {
  return createHash('sha256').update(JSON.stringify([s.setting,s.crime,s.suspect.role,
    ...s.truth.timeline.map(t=>[t.at,t.until,t.location,t.description].join(' ')),
    ...s.discoverableEvidence.map(e=>e.description),s.truth.actualEvent,s.truth.means,s.truth.motive].map(normalize))).digest('hex');
}
export function similarity(a:Scenario,b:Scenario):number {
  const tokens=(s:Scenario)=>new Set(normalize([s.crime,s.truth.actualEvent,s.truth.means,...s.discoverableEvidence.map(e=>e.description)].join(' ')).split(' '));
  const x=tokens(a), y=tokens(b);return [...x].filter(t=>y.has(t)).length/new Set([...x,...y]).size;
}
