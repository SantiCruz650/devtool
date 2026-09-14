import { useCallback, useEffect, useRef, useState } from "react";
import { create } from "zustand";
import {
  FileSystemLogSource,
  MockLogSource,
  PermissionRequiredError,
  RemoteLogSource,
  type LogLine,
} from "@devtool/core";
import { createOpfsDemoHandle, OpfsLogSimulator, pickLogFile } from "./lib/fs-bridge";
import { useCorrelationStore } from "./lib/correlation-store";

type SourceType = "mock" | "opfs-demo" | "file-picker" | "remote";

type ActiveSource = {
  name: string;
  stop: () => Promise<void>;
  unsubscribe: () => void;
};

type LogLineState = {
  lines: LogLine[];
  appendLines: (newLines: LogLine[]) => void;
  clearLines: () => void;
};

const useLogLineStore = create<LogLineState>((set) => ({
  lines: [],
  appendLines: (newLines) =>
    set((state) => ({ lines: [...state.lines, ...newLines].slice(-200) })),
  clearLines: () => set({ lines: [] }),
}));

const levelStyles: Record<LogLine["level"], string> = {
  debug: "bg-slate-700 text-slate-200",
  info: "bg-blue-500/20 text-blue-300",
  warn: "bg-amber-500/20 text-amber-300",
  error: "bg-red-500/20 text-red-300",
  unknown: "bg-slate-700 text-slate-300",
};

const sourceLabels: Record<SourceType, string> = {
  mock: "Mock (en memoria)",
  "opfs-demo": "Simular backend (demo)",
  "file-picker": "Conectar archivo .log",
  remote: "Backend remoto (tail)",
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
  const clearLines = useLogLineStore((state) => state.clearLines);
  const activeSourceRef = useRef<ActiveSource | null>(null);
  const [selectedSource, setSelectedSource] = useState<SourceType>("mock");
  const [sourceName, setSourceName] = useState<string>("Sin origen activo");
  const [isRunning, setIsRunning] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [consecutiveErrors, setConsecutiveErrors] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [remoteBase, setRemoteBase] = useState(() => localStorage.getItem("devtool.remoteBase") ?? "http://localhost:3000");
  const requests = useCorrelationStore((state) => state.requests);
  const selectedRequestId = useCorrelationStore((state) => state.selectedRequestId);
  const ingest = useCorrelationStore((state) => state.ingest);
  const selectRequest = useCorrelationStore((state) => state.selectRequest);
  const getCorrelation = useCorrelationStore((state) => state.getCorrelation);

  const stopActiveSource = useCallback(async (): Promise<void> => {
    const current = activeSourceRef.current;
    activeSourceRef.current = null;
    if (current === null) {
      return;
    }

    current.unsubscribe();
    await current.stop();
    setIsRunning(false);
    setSourceName("Sin origen activo");
  }, []);

  useEffect(() => {
    return () => {
      void stopActiveSource();
    };
  }, [stopActiveSource]);

  useEffect(() => {
    const clockId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(clockId);
  }, []);

  async function startSelectedSource(nextSource: SourceType): Promise<void> {
    await stopActiveSource();
    clearLines();
    setPermissionError(null);
    setIsRunning(false);
    setConsecutiveErrors(0);

    const appendSourceLines = (newLines: LogLine[]): void => {
      if (newLines.length > 0) {
        setConsecutiveErrors(0);
      }
      ingest(newLines);
      appendLines(newLines);
    };

    try {
      if (nextSource === "mock") {
        const source = new MockLogSource();
        const unsubscribe = source.subscribe(appendSourceLines);
        await source.start();
        activeSourceRef.current = {
          name: source.name,
          unsubscribe,
          stop: async () => {
            unsubscribe();
            await source.stop();
          },
        };
        setSourceName(source.name);
        setIsRunning(true);
        return;
      }

      if (nextSource === "opfs-demo") {
        const handle = await createOpfsDemoHandle();
        const simulator = new OpfsLogSimulator(handle);
        const source = new FileSystemLogSource(handle, { readFrom: "end" });
        const unsubscribe = source.subscribe(appendSourceLines);
        await simulator.start();
        await source.start();
        activeSourceRef.current = {
          name: handle.name,
          unsubscribe,
          stop: async () => {
            unsubscribe();
            await source.stop();
            await simulator.stop();
          },
        };
        setSourceName(handle.name);
        setIsRunning(true);
        return;
      }

      if (nextSource === "remote") {
        const base = remoteBase.trim().replace(/\/+$/, "");
        if (base === "") {
          throw new Error("Indica la base URL del backend remoto.");
        }
        const source = new RemoteLogSource((offset) => `${base}/logs/tail?offset=${offset}`, {
          onError: () => setConsecutiveErrors((count) => count + 1),
        });
        const unsubscribe = source.subscribe(appendSourceLines);
        await source.start();
        activeSourceRef.current = {
          name: source.name,
          unsubscribe,
          stop: () => source.stop(),
        };
        setSourceName(source.name);
        setIsRunning(true);
        return;
      }

      const handle = await pickLogFile();
      const source = new FileSystemLogSource(handle, { readFrom: "end" });
      const unsubscribe = source.subscribe(appendSourceLines);
      await source.start();
      activeSourceRef.current = {
        name: handle.name,
        unsubscribe,
        stop: async () => {
          unsubscribe();
          await source.stop();
        },
      };
      setSourceName(handle.name);
      setIsRunning(true);
    } catch (error) {
      if (error instanceof PermissionRequiredError) {
        setPermissionError("Permiso denegado, reintenta");
      } else if (error instanceof Error) {
        setPermissionError(error.message);
      }
      setSourceName("Sin origen activo");
    }
  }

  async function handleSourceChange(nextSource: SourceType): Promise<void> {
    setSelectedSource(nextSource);
    await startSelectedSource(nextSource);
  }

  function handleRemoteBaseChange(value: string): void {
    setRemoteBase(value);
    localStorage.setItem("devtool.remoteBase", value);
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
          onClick={() => void startSelectedSource(selectedSource)}
          type="button"
        >
          {isRunning ? "En ejecución" : "Iniciar stream"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.entries(sourceLabels) as Array<[SourceType, string]>).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              selectedSource === key
                ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                : "border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500"
            }`}
            onClick={() => {
              void handleSourceChange(key);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>

      {selectedSource === "remote" && (
        <label className="mt-4 block text-sm text-slate-300">
          Base URL del backend
          <input
            className="mt-1 block w-full rounded border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
            onChange={(event) => handleRemoteBaseChange(event.target.value)}
            placeholder="https://xxxx-3000.app.github.dev"
            type="url"
            value={remoteBase}
          />
        </label>
      )}

      <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${isRunning ? consecutiveErrors >= 2 ? "bg-amber-400" : "bg-emerald-400" : "bg-red-400"}`} />
        <span className="text-slate-300">
          {consecutiveErrors >= 2 ? "reconectando…" : isRunning ? "En ejecución" : "Sin ejecución"}
          {sourceName !== "Sin origen activo" && ` · ${sourceName}`}
        </span>
      </div>

      {permissionError !== null && (
        <div className="mt-3 rounded border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {permissionError}
        </div>
      )}

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

      <section className="mt-6 border-t border-slate-700 pt-5">
        <h3 className="text-lg font-semibold text-slate-100">Correlaciones</h3>
        <div className="mt-3 space-y-2">
          {requests.map((request) => {
            const isSelected = request.requestId === selectedRequestId;
            const correlation = isSelected ? getCorrelation(request.requestId) : null;
            const statusClass = request.statusCode === null
              ? "bg-slate-700 text-slate-300"
              : request.statusCode >= 200 && request.statusCode < 300
                ? "bg-emerald-500/20 text-emerald-300"
                : request.statusCode >= 400
                  ? "bg-red-500/20 text-red-300"
                  : "bg-slate-700 text-slate-300";
            const shortUrl = request.url.length > 64 ? `${request.url.slice(0, 61)}...` : request.url;
            const ageSeconds = Math.max(0, Math.floor((now - request.startedAt) / 1000));
            const age = ageSeconds < 60 ? `hace ${ageSeconds}s` : `hace ${Math.floor(ageSeconds / 60)}m`;
            const correlationLines = correlation === null
              ? []
              : [
                  ...correlation.contextBefore.map((line) => ({ line, kind: "context" })),
                  ...correlation.matchingLines.map((line) => ({ line, kind: "match" })),
                  ...correlation.contextAfter.map((line) => ({ line, kind: "context" })),
                ];

            return (
              <div key={request.requestId}>
                <button
                  className={`flex w-full flex-wrap items-center gap-3 rounded border px-3 py-2 text-left ${isSelected ? "border-cyan-400 bg-cyan-950/50" : "border-slate-700 bg-slate-950/40 hover:border-slate-500"}`}
                  onClick={() => selectRequest(isSelected ? null : request.requestId)}
                  type="button"
                >
                  <span className="font-mono text-xs text-cyan-300">{request.method}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-300">{shortUrl}</span>
                  <span className={`rounded px-2 py-0.5 text-xs ${statusClass}`}>{request.statusCode ?? "-"}</span>
                  <span className="text-xs text-slate-500">{age}</span>
                </button>
                {isSelected && (
                  <div className="mt-2 space-y-1 border-l-2 border-cyan-400/40 pl-3 font-mono text-xs">
                    {correlationLines.length === 0 && (
                      <p className="py-2 text-sm font-sans text-slate-400">Sin coincidencias aún — los logs pueden tardar unos segundos</p>
                    )}
                    {correlationLines.map(({ line, kind }) => (
                      <div className={`flex gap-2 ${kind === "context" ? "opacity-60" : "rounded bg-cyan-500/20 ring-1 ring-cyan-400/60"}`} key={line.id}>
                        <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${levelStyles[line.level]}`}>{line.level}</span>
                        <span className="break-all py-0.5 text-slate-300">{line.raw}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </section>
  );
}
