import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../lib/scenarios/fixtures';
import { matchProviderDisclosure } from '../lib/scenarios/provider-disclosures';

test('provider disclosure accepts canonical whole assistant response only', () => {
  const scenario = fixtures[0];
  const fact = scenario.knowledge.facts[0];
  const prior = new Set(fact.prerequisiteFactIds);
  const phrase = fact.disclosurePhrases[0];
  assert.equal(matchProviderDisclosure(scenario, 'assistant', ` ${phrase.toUpperCase()} `, prior)?.id, fact.id);
  for (const text of [`I deny that ${phrase}`, `"${phrase}"`, `${phrase} But that is false.`, '', 'Tell me the answer.']) {
    assert.equal(matchProviderDisclosure(scenario, 'assistant', text, prior), undefined);
  }
  assert.equal(matchProviderDisclosure(scenario, 'user', phrase, prior), undefined);
  assert.equal(matchProviderDisclosure(scenario, 'assistant', phrase, new Set([...prior, fact.id])), undefined);
});

test('unknown, ambiguous and prerequisite-locked facts fail closed', () => {
  const scenario = structuredClone(fixtures[0]);
  const fact = scenario.knowledge.facts[0];
  const phrase = fact.disclosurePhrases[0];
  fact.prerequisiteFactIds = ['not-yet-discovered'];
  assert.equal(matchProviderDisclosure(scenario, 'assistant', phrase, new Set()), undefined);
  const prior = new Set(fact.prerequisiteFactIds);
  scenario.knowledge.knows = scenario.knowledge.knows.filter(id => id !== fact.id);
  assert.equal(matchProviderDisclosure(scenario, 'assistant', phrase, prior), undefined);
  scenario.knowledge.knows.push(fact.id, 'ambiguous-fact');
  scenario.knowledge.facts.push({ ...fact, id: 'ambiguous-fact' });
  assert.equal(matchProviderDisclosure(scenario, 'assistant', phrase, prior), undefined);
});
