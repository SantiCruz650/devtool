# DevTool (nota: nombre temporal, se reemplazará después)

Local-first API client + log correlation for localhost development. No accounts, no cloud, $0.

## Why

- Postman is heavy and cloud-first: you need an account to hit `localhost`.
- Datadog and friends are built for production observability, not for debugging a request on your machine — and they are expensive.
- Debugging one local request means juggling 4 windows: the API client, a terminal tailing logs, the IDE, and the browser.
- DevTool puts the request and your backend's own log lines on one screen. Everything stays in your browser; nothing is uploaded anywhere.

## Features

- HTTP client (GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS) with headers and body editor
- X-Request-ID auto-injection and correlation: matching log lines highlighted automatically
- Local log streaming via File System Access API (read your app.log in real time — nothing uploaded)
- Durable history (IndexedDB) — survives browser restarts
- Chrome extension bridge: executes requests bypassing CORS against localhost
- 100% local: no accounts, no servers, no telemetry

## Browser support

Chromium-based browsers (Chrome, Edge, Brave, Arc). Firefox not supported yet (File System Access API).

## Quick start

1. `npm install`
2. Terminal 1: `npm run dev -w web` → http://localhost:5173
3. Terminal 2: `npm run dev -w @devtool/demo-backend`
4. Load the extension: `chrome://extensions` → Developer mode → Load unpacked → `packages/extension`
5. Send a request to http://localhost:3000/api/users → watch it correlate with the demo backend logs.

## How it works (diagram in ASCII)

```text
Web App (React) ⇄ window.postMessage ⇄ Content Script ⇄ chrome.runtime ⇄ Service Worker → fetch() to localhost (host_permissions bypass CORS)
```

## Project structure

- `packages/core` — pure TS engine: http client, log parser, correlator — fully tested
- `packages/web` — React + Vite + Zustand + Dexie UI
- `packages/extension` — MV3 bridge, plain JS
- `packages/demo-backend` — local demo API with request ID logging

## Roadmap

- Import Postman collections
- Collections & environments
- WebSocket support
- Team sync via Git

## License

GNU Affero General Public License v3.0 (AGPL-3.0) — see [LICENSE](./LICENSE).
