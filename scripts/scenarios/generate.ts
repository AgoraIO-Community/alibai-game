import { mkdir, appendFile, writeFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { fixtures } from '../../lib/scenarios/fixtures';
import { generateScenario, HumanReviewRequired, providerFromEnv } from '../../lib/scenarios/generator';
import { difficultySchema, type Scenario } from '../../lib/scenarios/schema';
import { assertValid, validateScenario } from '../../lib/scenarios/validate';

async function main() {
  const { values } = parseArgs({ options: {
    count: { type: 'string', default: '8' }, difficulty: { type: 'string', default: 'mixed' }, seed: { type: 'string', default: '2026' },
    concurrency: { type: 'string', default: '2' }, retries: { type: 'string', default: '3' },
    fixtures: { type: 'boolean', default: false }, 'dry-run': { type: 'boolean', default: false },
    theme: { type: 'string' }, model: { type: 'string' },
  } });
  const integer = (value: string, min: number, max: number) => { const n = Number(value); if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Expected integer ${min}–${max}`); return n; };
  const count = integer(values.count, 1, 1000), concurrency = integer(values.concurrency, 1, 8), attempts = integer(values.retries, 1, 5);
  if (values.difficulty !== 'mixed') difficultySchema.parse(values.difficulty);
  const useFixtures = values.fixtures || !providerFromEnv();
  const fixturePool = fixtures.filter(s => values.difficulty === 'mixed' || s.difficulty === values.difficulty);
  if (useFixtures && count > fixturePool.length) throw new Error(`Only ${fixturePool.length} distinct handcrafted cases match. Reduce --count or configure a model; fixtures are never duplicated to fill a batch.`);
  const root = 'game-scenarios/generated'; await mkdir(root, { recursive: true });
  const jobId = randomUUID(), log = `${root}/${jobId}.jsonl`;
  const failures: unknown[] = [], accepted: Scenario[] = [], existing: Scenario[] = [];
  let published = 0;
  let next = 0, failed = 0, reviewCount = 0;
  async function event(data: unknown) { await appendFile(log, `${JSON.stringify({ jobId, at: new Date().toISOString(), data })}\n`); }
  async function rest(path: string, body: unknown = undefined, method = 'POST') {
    const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
    if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY), or use --dry-run');
    const response = await fetch(`${url}/rest/v1/${path}`, { method, headers: { apikey: key, ...(key!.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!response.ok) { const e = await response.json().catch(() => ({})); throw new Error(`DB_${response.status}: ${e.code ?? 'UNKNOWN'} ${e.message ?? ''}`); }
    return method === 'GET' ? await response.json() as { dossier: unknown }[] : undefined;
  }
  if (!values['dry-run']) await rest('scenario_generation_jobs', { id: jobId, seed: values.seed, generator_version: useFixtures ? 'handcrafted-1' : 'structured-1', status: 'running', provenance: { count, concurrency, model: values.model ?? process.env.SCENARIO_LLM_MODEL ?? null, fixtureOnly: useFixtures } });
  await event({ status: 'running', seed: values.seed, count, fixtureOnly: useFixtures, dryRun: values['dry-run'] });
  if (!values['dry-run']) {
    for (let offset = 0; ; offset += 1000) {
      const records = await rest(`scenario_secrets?select=dossier&order=scenario_id&limit=1000&offset=${offset}`, undefined, 'GET') ?? [];
      existing.push(...records.map(row => assertValid(row.dossier)));
      if (records.length < 1000) break;
    }
  }
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (next < count) {
      const index = next++;
      try {
        const s = useFixtures ? assertValid(structuredClone(fixturePool[index])) : await generateScenario({ seed: `${values.seed}:${index}`, difficulty: values.difficulty === 'mixed' ? (['easy', 'medium', 'hard'] as const)[index % 3] : difficultySchema.parse(values.difficulty), theme: values.theme, model: values.model }, {
          maxAttempts: attempts, existing,
          onFailure: async failure => { failures.push({ index, ...failure }); await event({ index, ...failure }); },
          onReview: review => event({ index, review }),
        });
        // Synchronous reservation prevents concurrent workers publishing the same fingerprint.
        const result = validateScenario(s, existing); if (!result.valid) throw new Error(result.errors.join('; '));
        accepted.push(s); existing.push(s);
        await writeFile(`${root}/${s.scenarioId}.json`, JSON.stringify(s, null, 2));
        if (!values['dry-run']) { await rest('rpc/publish_scenario', { doc: s }); published++; }
        await event({ index, scenarioId: s.scenarioId, status: values['dry-run'] ? 'validated' : 'published' });
      } catch (error) {
        if (error instanceof HumanReviewRequired) {
          reviewCount++;
          await writeFile(`${root}/${error.scenario.scenarioId}.review.json`, JSON.stringify({ scenario: error.scenario, review: error.review }, null, 2));
        } else failed++;
        const reason = error instanceof Error ? error.message : 'Unknown error'; failures.push({ index, reason }); await event({ index, reason, status: error instanceof HumanReviewRequired ? 'review' : 'failed' });
      }
    }
  }));
  const status = failed ? 'failed' : reviewCount ? 'review' : 'published';
  if (!values['dry-run']) await rest(`scenario_generation_jobs?id=eq.${jobId}`, { status, failures, updated_at: new Date().toISOString() }, 'PATCH');
  console.log(JSON.stringify({ jobId, accepted: accepted.length, published, failed, review: reviewCount, dryRun: values['dry-run'], log }));
  if (failed || reviewCount) process.exitCode = 1;
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown CLI error'); process.exitCode = 1; });
