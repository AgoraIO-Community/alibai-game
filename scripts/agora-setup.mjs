import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function run(args) {
  const result = spawnSync('agora', args, { cwd: root, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
// Deliberately uses the existing testing project; creates no cloud project and
// never overwrites dotenv contents or prints credential values.
run(['version']);
run(['doctor', '--json']);
run(['project', 'env', 'write', '.env.local', '--project', 'testing', '--template', 'nextjs', '--append', '--json']);
run(['project', 'doctor', 'testing', '--feature', 'convoai', '--json']);
