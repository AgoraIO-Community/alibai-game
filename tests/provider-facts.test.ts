import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtures } from '../lib/scenarios/fixtures';
import { matchProviderDisclosures, speechNormalize } from '../lib/scenarios/provider-disclosures';

const ids = (scenario: typeof fixtures[number], text: string, known: Iterable<string> = [], role = 'assistant') =>
  matchProviderDisclosures(scenario, role, text, new Set(known)).map(fact => fact.id);
const openFact = (scenario: typeof fixtures[number]) => scenario.knowledge.facts.find(fact => !fact.prerequisiteFactIds.length)!;

test('every spoken line of every case survives how replies really come out', () => {
  for (const scenario of fixtures) for (const fact of scenario.knowledge.facts) {
    const known = fact.prerequisiteFactIds;
    for (const line of fact.disclosurePhrases) {
      const bare = line.replace(/[.!]+$/, '');
      for (const reply of [line, bare, `${bare}.`, `Fine. ${bare}.`, `Yeah, ${bare.toLowerCase()}.`, bare.toUpperCase(), bare.replaceAll("'", '’'),
        `${bare}. I'd rather we moved on.`, ` ${bare}, all right.\n`])
        assert.deepEqual(ids(scenario, reply, known), [fact.id], `${scenario.title}: ${reply}`);
    }
  }
});

test('contractions and their long forms match both ways', () => {
  assert.equal(speechNormalize("I didn't. It's Sela’s, and I can't, won't, we're, I've, they'll, I'd, I'm."),
    speechNormalize('I did not. It is Selas, and I cannot, will not, we are, I have, they will, I would, I am.'));
});

test('denials, questions, quotes and retractions never count', () => {
  for (const scenario of fixtures) {
    const fact = openFact(scenario), known = fact.prerequisiteFactIds, bare = fact.disclosurePhrases[0].replace(/[.!]+$/, '');
    for (const reply of [`I deny that ${bare}.`, `I never said ${bare}.`, `It's not true that ${bare}.`, `No, ${bare}?`, `${bare}?`, `"${bare}."`, `“${bare}.”`,
      `${bare}. But that's false.`, `${bare}. I'm only joking.`, `If ${bare}, I'd have known.`, `Someone told you ${bare}.`, '', 'Tell me the answer.'])
      assert.deepEqual(ids(scenario, reply, known), [], `${scenario.title}: ${reply}`);
    assert.deepEqual(ids(scenario, fact.disclosurePhrases[0], known, 'user'), []);
    assert.deepEqual(ids(scenario, fact.disclosurePhrases[0], [...known, fact.id]), []);
  }
});

test('two facts in one reply both count, and a reply can unlock its own prerequisite', () => {
  const scenario = structuredClone(fixtures[0]);
  const [a, b] = scenario.knowledge.facts;
  a.prerequisiteFactIds = []; b.prerequisiteFactIds = [];
  assert.deepEqual(ids(scenario, `${a.disclosurePhrases[0]} ${b.disclosurePhrases[0]}`), [a.id, b.id]);
  b.prerequisiteFactIds = [a.id];
  assert.deepEqual(ids(scenario, `${b.disclosurePhrases[0]} ${a.disclosurePhrases[0]}`), [a.id, b.id]);
  assert.deepEqual(ids(scenario, b.disclosurePhrases[0]), []);
});

test('unknown, ambiguous and prerequisite-locked facts fail closed', () => {
  const scenario = structuredClone(fixtures[0]);
  const fact = scenario.knowledge.facts[0];
  const phrase = fact.disclosurePhrases[0];
  fact.prerequisiteFactIds = ['not-yet-discovered'];
  assert.deepEqual(ids(scenario, phrase), []);
  const prior = fact.prerequisiteFactIds;
  scenario.knowledge.knows = scenario.knowledge.knows.filter(id => id !== fact.id);
  assert.deepEqual(ids(scenario, phrase, prior), []);
  scenario.knowledge.knows.push(fact.id, 'ambiguous-fact');
  scenario.knowledge.facts.push({ ...fact, id: 'ambiguous-fact' });
  assert.deepEqual(ids(scenario, phrase, prior), []);
});
