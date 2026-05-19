/**
 * Arranca API WhatsApp (8888) + Angular (4200) en un solo comando.
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(script) {
  return spawn(npm, ['run', script], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
}

console.log('Iniciando API WhatsApp y Angular…\n');

const api = run('start:api');
const app = run('start');

function shutdown() {
  api.kill();
  app.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

api.on('exit', (code) => {
  if (code) {
    shutdown();
  }
});
app.on('exit', (code) => {
  if (code) {
    shutdown();
  }
});
