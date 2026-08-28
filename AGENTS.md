AGENTS.md
Proyecto
Herramienta de desarrollo 100% local: API client + log streamer concorrelación petición↔logs en tiempo real. Sin backend, sin nube, sintelemetría. Si una feature requiere servidor, está mal diseñada.

Stack y estructura
Monorepo pnpm (workspaces). Node 20. TypeScript en modo strict SIEMPRE.
packages/core: lógica pura en TS (parser de logs, detección de deltas,correlación). CERO dependencias de DOM, window o chrome.*. Debe correren Vitest y en Web Workers sin cambios.
packages/web: Vite + React 18 + TypeScript. Estado local con Zustand.Persistencia con Dexie.js (IndexedDB). Estilos con Tailwind CSS.
packages/extension: Chrome MV3 (service worker, NUNCA background page).Se agrega en una fase posterior; no crear nada ahí todavía.
Reglas duras (inviolables)
NO inventes APIs del navegador. Si no estás 100% seguro de la firma deuna API (File System Access, chrome.runtime, etc.), dilo explícitamenteen la respuesta y marca el código con un comentario // VERIFY-API:.
Toda la lógica pertenece a packages/core con tests en Vitest.Los tests definen el "done": no está done hasta que pnpm test pase.
Nunca agregar dependencias sin listarlas primero en la respuesta yjustificar por qué no se resolvió con lo que ya hay.
Commits convencionales (feat:, fix:, test:, chore:). Un prompt = unatarea = un commit. No mezclar cambios no relacionados.
No modificar configuración de build (tsconfig, vite.config) sinseñalarlo explícitamente como cambio de configuración.
Los tipos son parte del producto: nada de any salvo justificaciónescrita en un comentario adyacente.
Antes de dar una tarea por terminada: pnpm lint, pnpm typechecky pnpm test deben pasar los tres. Sin excepciones.