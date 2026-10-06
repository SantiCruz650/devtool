const STEPS: Array<{ n: string; title: string; text: string }> = [
  {
    n: "1",
    title: "Pega tu localhost",
    text: "Tu URL, tu método. Sin importar colecciones ni crear workspaces.",
  },
  {
    n: "2",
    title: "Dispara",
    text: "Tu request sale marcada. Se guarda en tu historial, en tu navegador.",
  },
  {
    n: "3",
    title: "Mira cómo se ilumina",
    text: "Sus líneas de log se resaltan solas, en vivo. Ya sabes dónde mirar.",
  },
];

export default function HowItWorks(): JSX.Element {
  return (
    <section id="como-funciona" className="mx-auto w-full max-w-7xl scroll-mt-20 px-4 py-28">
      <p className="font-mono text-sm text-amber-300">02</p>
      <h2 className="mt-2 max-w-prose text-2xl font-bold tracking-tight text-slate-100">
        Tres gestos y lo ves
      </h2>
      <ol className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        {STEPS.map((step) => (
          <li
            key={step.n}
            className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-5"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-400/15 font-mono font-semibold text-amber-300">
              {step.n}
            </span>
            <h3 className="mt-3 font-semibold text-slate-100">{step.title}</h3>
            <p className="mt-1 max-w-prose text-sm text-slate-400">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
