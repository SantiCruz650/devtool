import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { open, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PORT = 3000;
const LOG_PATH = fileURLToPath(new URL('./app.log', import.meta.url));
const logStream = createWriteStream(LOG_PATH, { flags: 'a' });

function log(level, requestId, message) {
  logStream.write(`[${new Date().toISOString()}] ${level} ${message} [req=${requestId}]\n`);
}

// === Middleware de correlación (prototipo del snippet oficial del producto) ===
function requestTracer(req, res, next) {
  const incoming = req.headers['x-request-id'];
  const requestId = incoming && UUID_RE.test(incoming) ? incoming : randomUUID();
  req.requestId = requestId;
  const start = Date.now();
  res.on('finish', () => {
    log('INFO', requestId, `${req.method} ${req.url} -> ${res.statusCode} (${Date.now() - start}ms)`);
  });
  next();
}

// CORS abierto: la web app puede fetchear directo desde otro origen
function cors(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Expose-Headers', 'X-Request-ID');
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
  next();
}

// Tail del log por HTTP. FUERA de requestTracer a propósito: si loggeamos
// el polling, el log crecería por el propio polling (telemetría recursiva).
async function handleTail(req, res) {
  const offset = Number(new URL(req.url, 'http://x').searchParams.get('offset') || 0);
  const s = await stat(LOG_PATH).catch(() => null);
  const size = s ? s.size : 0;
  const truncated = offset > size;
  const from = truncated ? 0 : offset;
  let data = '';
  if (size > from) {
    const fh = await open(LOG_PATH, 'r');
    const buf = Buffer.alloc(size - from);
    await fh.read(buf, 0, buf.length, from);
    await fh.close();
    data = buf.toString('utf8');
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ size, truncated, data }));
}

const routes = {
  '/api/users': (req, res) => {
    log('INFO', req.requestId, 'consultando tabla users');
    log('DEBUG', req.requestId, 'SELECT * FROM users LIMIT 20 (14ms)');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ users: [], requestId: req.requestId }));
  },
  '/api/slow': (req, res) => {
    log('INFO', req.requestId, 'operación lenta iniciada');
    setTimeout(() => {
      log('WARN', req.requestId, 'query lenta detectada (900ms)');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, requestId: req.requestId }));
    }, 900);
  },
  '/api/error': (req, res) => {
    log('ERROR', req.requestId, 'boom: conexión a la DB rechazada');
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'internal', requestId: req.requestId }));
  },
};

createServer((req, res) => {
  cors(req, res, () => {
    const path = new URL(req.url, 'http://x').pathname;
    if (path === '/logs/tail') return handleTail(req, res);

    requestTracer(req, res, () => {
      const handler = routes[path];
      if (handler) return handler(req, res);
      log('WARN', req.requestId, `ruta no encontrada: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found', requestId: req.requestId }));
    });
  });
}).listen(PORT, () => console.log(`demo-backend en :${PORT} — escribiendo app.log`));
