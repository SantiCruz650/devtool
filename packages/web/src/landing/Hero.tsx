import { Link } from "react-router-dom";
import { LogLevelTag, MethodBadge, Panel, StatusBadge } from "../ui/primitives";

// TODO: subir woff2 de marca post-MVP. Mientras tanto el H1 usa el stack
// sans del sistema en peso black para voz de marketing (el mono queda solo
// en dato tecnico: eyebrows, mock, logs).
export default function Hero(): JSX.Element {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-28 lg:py-32">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="animate-fade-up" style={{ animationDelay: "0ms" }}>
          <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
            Local-first · Sin cuentas · Sin nube
          </p>
          <h1 className="mt-3 font-sans text-5xl font-black tracking-tighter text-slate-50 sm:text-6xl lg:text-7xl">
            Tu request y su rastro de logs,{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-amber-400 bg-clip-text text-transparent">
              en la misma pantalla.
            </span>
          </h1>
          <p className="mt-4 max-w-prose text-lg text-slate-400">
            Disparas tu API en localhost y sus líneas de log aparecen resaltadas
            al lado. Sin cuentas, sin nube: todo en tu navegador.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/app"
              className="rounded-lg bg-cyan-400 px-6 py-3 text-base font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60 lg:text-lg"
            >
              Abrir Estela
            </Link>
            <a
              href="#como-funciona"
              className="rounded-md border border-slate-600 px-5 py-2.5 font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
            >
              Ver cómo funciona
            </a>
          </div>
        </div>

        <div className="animate-fade-up" style={{ animationDelay: "150ms" }}>
        <Panel title="request ↔ logs en vivo">
          <div className="flex flex-wrap items-center gap-2">
            <MethodBadge method="GET" />
            <span className="truncate font-mono text-sm text-slate-300">
              http://localhost:3000/api/users
            </span>
            <StatusBadge status={200} detail="OK" />
          </div>
          <div className="mt-3 space-y-1 font-mono text-xs" aria-hidden="true">
            <div className="animate-correlate flex items-center gap-2 rounded bg-cyan-500/10 px-2 py-1 ring-1 ring-cyan-400/40">
              <LogLevelTag level="INFO" />
              <span className="truncate text-slate-300">GET /api/users → 200 (12ms)</span>
            </div>
            <div className="animate-connector flex items-center gap-2 px-2">
              <span className="ml-6 border-l-2 border-dashed border-cyan-400/50 pl-2 font-sans text-[11px] text-cyan-300/80">
                esa eres tú — se conecta solo
              </span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 opacity-70">
              <LogLevelTag level="DEBUG" />
              <span className="truncate text-slate-300">SELECT * FROM users LIMIT 20</span>
            </div>
            <div className="flex items-center gap-2 px-2 py-1 opacity-70">
              <LogLevelTag level="WARN" />
              <span className="truncate text-slate-300">query lenta detectada (900ms)</span>
            </div>
          </div>
        </Panel>
        </div>
      </div>
    </section>
  );
}
