/**
 * Servidor local para /.netlify/functions/send-whatsapp (sin Netlify CLI).
 * Carga variables desde .env y reutiliza la función de Netlify.
 *
 * Uso: npm run start:api   (en otra terminal: npm start)
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env');

function loadEnvFile() {
  if (!existsSync(envPath)) {
    console.warn('[whatsapp-api] No existe .env en la raíz del proyecto.');
    return;
  }
  const text = readFileSync(envPath, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

loadEnvFile();

const { default: sendWhatsAppHandler } = await import('../netlify/functions/send-whatsapp.mjs');

const PORT = Number(process.env.WHATSAPP_DEV_PORT || 8888);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    res.end();
    return;
  }

  if (url.pathname !== '/.netlify/functions/send-whatsapp') {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Ruta no encontrada' }));
    return;
  }

  try {
    const body = await readBody(req);
    const request = new Request(url.toString(), {
      method: req.method,
      headers: { 'Content-Type': req.headers['content-type'] ?? 'application/json' },
      body: body.length ? body : undefined,
    });
    const response = await sendWhatsAppHandler(request);
    const text = await response.text();
    res.writeHead(response.status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(text);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: false,
        error: err instanceof Error ? err.message : 'Error interno',
      }),
    );
  }
});

server.listen(PORT, () => {
  console.log('');
  console.log('  API WhatsApp local (Green API desde .env)');
  console.log(`  http://127.0.0.1:${PORT}/.netlify/functions/send-whatsapp`);
  console.log('');
  console.log('  En OTRA terminal ejecuta:  npm start');
  console.log('  Luego abre:              http://localhost:4200');
  console.log('');
});
