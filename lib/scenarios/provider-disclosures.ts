import type { Scenario } from './schema';

/** Exact whole provider response only: never mine a substring from a denial. */
export function matchProviderDisclosure(scenario: Scenario, role: string, content: string, discovered: ReadonlySet<string>) {
  if (role !== 'assistant') return undefined;
  const normalized = content.trim().toLowerCase();
  if (!normalized) return undefined;
  const matches = scenario.knowledge.facts.filter(fact =>
    scenario.knowledge.knows.includes(fact.id) &&
    fact.disclosurePhrases.some(phrase => phrase.trim().toLowerCase() === normalized));
  if (matches.length !== 1) return undefined;
  const fact = matches[0];
  if (discovered.has(fact.id) || fact.prerequisiteFactIds.some(id => !discovered.has(id))) return undefined;
  return fact;
}
