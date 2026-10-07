# Estela

Tu API y sus logs, en la misma pantalla.

Disparas una request a tu localhost y las líneas de log que llevan su ID se resaltan solas al lado, en vivo. Todo pasa en tu navegador: no hay cuentas, no hay nube, nada se sube a ningún servidor.

Licencia: AGPL-3.0 — ver [LICENSE](./LICENSE).

## Qué hace

- Cliente HTTP (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) con editor de headers y body.
- Cada request sale marcada con su propio ID; las líneas del log que lo traen se iluminan automáticamente.
- Lee tu `.log` local en el navegador (File System Access API) y lo sigue en tiempo real.
- Historial en IndexedDB: sobrevive a reinicios del navegador.
- Puente con extensión de Chrome para pegar a localhost sin chocar con CORS.
- 100% local: sin cuentas, sin servidores, sin telemetría.

Solo Chromium (Chrome, Edge, Brave, Arc). Firefox aún no (File System Access API).

## Correr en local

1. `npm install` (una vez, en la raíz).
2. Terminal 1: `npm run dev -w web` → http://localhost:5173
3. Terminal 2: `npm run dev -w @devtool/demo-backend` → API de prueba en http://localhost:3000
4. Abre http://localhost:5173/app, dispara `GET http://localhost:3000/api/users` y mira cómo se ilumina su línea de log.
5. (Opcional) Para pegar a tu propio backend sin CORS: `chrome://extensions` → modo desarrollador → cargar descomprimida → `packages/extension`.

## Deploy

Vive en Netlify: `esteladev.netlify.app` (build `npm run build -w web`, redirect SPA en `netlify.toml`). El dominio propio llega según tracción y feedback, no antes.

## Estructura

- `packages/core` — motor TS puro: cliente HTTP, parser de logs, correlador (con tests).
- `packages/web` — React + Vite + Zustand + Dexie.
- `packages/extension` — puente MV3, se agrega en fase posterior.
- `packages/demo-backend` — API local de prueba que loguea con request ID.
