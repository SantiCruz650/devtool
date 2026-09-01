import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { fileURLToPath } from 'node:url';

const PORT = 3000;
const LOG_PATH = fileURLToPath(new URL('./app.log', import.meta.url));
const logStream = createWriteStream(LOG_PATH, { flags: 'a' });

function log(level, requestId, message) {
  logStream.write(`[${new Date().toISOString()}] ${level} ${message} [req=${requestId}]\n`);
}

// === Middleware de correlación (prototipo del snippet oficial del producto) ===
function requestTracer(req, res, next) {
  const requestId = req.headers['x-request-id'] || randomUUID();
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
    requestTracer(req, res, () => {
      const path = new URL(req.url, 'http://x').pathname;
      const handler = routes[path];
      if (handler) return handler(req, res);
      log('WARN', req.requestId, `ruta no encontrada: ${req.url}`);
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'not found', requestId: req.requestId }));
    });
  });
}).listen(PORT, () => console.log(`demo-backend en :${PORT} — escribiendo app.log`));
