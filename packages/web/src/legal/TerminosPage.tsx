import { Link } from "react-router-dom";

// NOTA HUMANA: este texto es un borrador corto y se puede editar o borrar.
// No es asesoría legal; si el proyecto crece, revísalo con un profesional.
export default function TerminosPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="mx-auto w-full max-w-prose px-4 py-20">
        <p className="text-sm font-semibold uppercase tracking-wide text-cyan-400">
          Términos
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          Condiciones simples
        </h1>
        <div className="mt-6 space-y-4 text-slate-300">
          <p>Estela es una herramienta de desarrollo, tal cual la ves.</p>
          <p>No hay garantías implícitas: úsala bajo tu responsabilidad.</p>
          <p>Puede cambiar sin aviso mientras la mejoramos.</p>
          <p>No la uses para dañar servicios ajenos o romper la ley.</p>
        </div>
        <Link
          to="/"
          className="mt-8 inline-block rounded-md border border-slate-600 px-5 py-2.5 font-medium text-slate-200 transition-colors hover:border-cyan-400 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/60"
        >
          ← Volver al inicio
        </Link>
      </main>
    </div>
  );
}
