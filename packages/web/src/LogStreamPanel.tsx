import { useEffect, useRef, useState } from "react";
import { create } from "zustand";
import { MockLogSource, type LogLine } from "@devtool/core";

type LogLineState = {
  lines: LogLine[];
  appendLines: (newLines: LogLine[]) => void;
};

const useLogLineStore = create<LogLineState>((set) => ({
  lines: [],
  appendLines: (newLines) =>
    set((state) => ({ lines: [...state.lines, ...newLines].slice(-200) })),
}));

const levelStyles: Record<LogLine["level"], string> = {
  debug: "bg-slate-700 text-slate-200",
  info: "bg-blue-500/20 text-blue-300",
  warn: "bg-amber-500/20 text-amber-300",
  error: "bg-red-500/20 text-red-300",
  unknown: "bg-slate-700 text-slate-300",
};

function formatTimestamp(timestamp: string | null): string {
  if (timestamp === null) {
    return "--:--:--";
  }

  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? "--:--:--"
    : date.toLocaleTimeString([], { hour12: false });
}

export default function LogStreamPanel() {
  const lines = useLogLineStore((state) => state.lines);
  const appendLines = useLogLineStore((state) => state.appendLines);
  const sourceRef = useRef<MockLogSource | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      const source = sourceRef.current;
      sourceRef.current = null;
      if (source !== null) {
        void source.stop();
      }
    };
  }, []);

  async function startStream(): Promise<void> {
    if (sourceRef.current !== null) {
      return;
    }

    const source = new MockLogSource();
    sourceRef.current = source;
    unsubscribeRef.current = source.subscribe(appendLines);
    await source.start();
    setIsRunning(true);
  }

  async function copyRequestId(requestId: string): Promise<void> {
    await navigator.clipboard.writeText(requestId);
    setCopiedId(requestId);
    window.setTimeout(() => setCopiedId(null), 1200);
  }

  return (
    <section className="w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-100">Log stream</h2>
          <p className="mt-1 text-sm text-slate-400">{lines.length} líneas en memoria</p>
        </div>
        <button
          className="rounded-md bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isRunning}
          onClick={() => void startStream()}
          type="button"
        >
          {isRunning ? "Stream activo" : "Iniciar stream (mock)"}
        </button>
      </div>

      <ul className="mt-5 max-h-[32rem] space-y-1 overflow-y-auto font-mono text-sm" aria-live="polite">
        {lines.map((line) => {
          const requestId = line.requestIds[0];
          return (
            <li
              className={`flex flex-wrap items-center gap-3 rounded px-3 py-2 ${requestId === undefined ? "bg-slate-950/40" : "bg-cyan-950/50"}`}
              key={line.id}
            >
              <time className="text-slate-500" dateTime={line.timestamp ?? undefined}>
                {formatTimestamp(line.timestamp)}
              </time>
              <span className={`rounded px-2 py-0.5 text-xs uppercase ${levelStyles[line.level]}`}>
                {line.level}
              </span>
              <span className="min-w-0 flex-1 break-all text-slate-300">{line.raw}</span>
              {requestId !== undefined && (
                <button
                  className="max-w-full truncate rounded bg-cyan-400/15 px-2 py-1 text-xs text-cyan-300 hover:bg-cyan-400/25"
                  onClick={() => void copyRequestId(requestId)}
                  title="Copiar UUID"
                  type="button"
                >
                  {copiedId === requestId ? "Copiado" : requestId}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
