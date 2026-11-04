/** Explicit operator action for an individually reviewed draft; never a browser route. */
import { readFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { randomUUID } from 'node:crypto';
import { assertValid } from '../../lib/scenarios/validate';
async function main() {
  const { values } = parseArgs({ options: { file: { type: 'string' }, 'reviewed-by': { type: 'string' }, note: { type: 'string' }, 'dry-run': { type: 'boolean', default: false } } });
  if (!values.file || !values['reviewed-by']?.trim() || !values.note?.trim()) throw new Error('Supply --file draft.review.json --reviewed-by operator-name --note review-rationale');
  const artifact = JSON.parse(await readFile(values.file, 'utf8'));
  const scenario = assertValid(artifact.scenario ?? artifact);
  scenario.status = 'validated';
  if (values['dry-run']) { console.log(JSON.stringify({ scenarioId: scenario.scenarioId, status: 'validated', reviewer: values['reviewed-by'] })); process.exit(0); }
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL, key = (process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!url || !key) throw new Error('Publishing requires Supabase server credentials');
  const jobId = randomUUID();
  async function post(path: string, body: unknown, method = 'POST') {
   const result = await fetch(`${url}/rest/v1/${path}`, { method, headers: { apikey: key!, ...(key!.startsWith('eyJ') ? { Authorization: `Bearer ${key}` } : {}), 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify(body) });
   if (!result.ok) throw new Error(`Publication database request failed (${result.status})`);
  }
  await post('scenario_generation_jobs', { id: jobId, seed: 'human-reviewed', generator_version: scenario.generatorVersion, status: 'running', provenance: { sourceFile: values.file, reviewedBy: values['reviewed-by'], reviewNote: values.note, priorReview: artifact.review ?? null, scenarioId: scenario.scenarioId } });
  try {
   await post('rpc/publish_scenario', { doc: scenario });
   await post(`scenario_generation_jobs?id=eq.${jobId}`, { status: 'published', updated_at: new Date().toISOString() }, 'PATCH');
   console.log(JSON.stringify({ scenarioId: scenario.scenarioId, jobId, status: 'published' }));
  } catch (error) {
   await post(`scenario_generation_jobs?id=eq.${jobId}`, { status: 'failed', failures: [error instanceof Error ? error.message : 'Unknown error'], updated_at: new Date().toISOString() }, 'PATCH');
   throw error;
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Unknown CLI error'); process.exitCode = 1; });
