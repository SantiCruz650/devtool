import { useEffect, useState } from "react";
import { listHistory } from "../lib/db";
import type { HistoryEntry } from "../lib/db";

function methodBadgeClass(method: string): string {
  switch (method.toUpperCase()) {
    case "GET":
      return "bg-green-400/10 text-green-200 border-green-400/50";
    case "POST":
      return "bg-blue-400/10 text-blue-200 border-blue-400/50";
    case "PUT":
      return "bg-amber-400/10 text-amber-200 border-amber-400/50";
    case "DELETE":
      return "bg-red-400/10 text-red-200 border-red-400/50";
    default:
      return "bg-slate-400/10 text-slate-200 border-slate-400/50";
  }
}

function statusBadgeClass(status: number): string {
  if (status === 0) {
    return "bg-slate-400/10 text-slate-300 border-slate-400/50";
  }
  if (status >= 200 && status < 300) {
    return "bg-green-400/10 text-green-200 border-green-400/50";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-400/10 text-blue-200 border-blue-400/50";
  }
  if (status >= 400 && status < 500) {
    return "bg-amber-400/10 text-amber-200 border-amber-400/50";
  }
  return "bg-red-400/10 text-red-200 border-red-400/50";
}

function statusLabel(status: number): string {
  return status === 0 ? "red" : String(status);
}

function relativeTime(startedAt: number): string {
  const diffMs = Math.max(0, Date.now() - startedAt);
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) {
    return `hace ${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `hace ${minutes}m`;
  }
  return `hace ${Math.floor(minutes / 60)}h`;
}

function truncateUrl(url: string): string {
  return url.length > 60 ? `${url.slice(0, 60)}…` : url;
}

export default function HistoryPanel() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function reload(): Promise<void> {
    setLoading(true);
    try {
      setEntries(await listHistory(50));
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialEntries(): Promise<void> {
      try {
        const items = await listHistory(50);
        if (!cancelled) {
          setEntries(items);
        }
      } catch {
        if (!cancelled) {
          setEntries([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void loadInitialEntries();
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = entries.find((entry) => entry.requestId === selectedId) ?? null;

  async function copyRequestId(requestId: string): Promise<void> {
    await navigator.clipboard.writeText(requestId);
    setCopied(true);
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-slate-400">{loading ? "Cargando…" : `${entries.length} entradas`}</span>
        <button
          className="rounded border border-slate-600 px-2 py-1 text-sm text-slate-200 transition hover:border-cyan-400"
          onClick={() => void reload()}
          type="button"
        >
          ↻ Actualizar
        </button>
      </div>

      {entries.length === 0 && !loading ? (
        <p className="text-sm text-slate-400">Aún no hay historial. Envía tu primera request.</p>
      ) : (
        <div className="max-h-64 overflow-y-auto flex flex-col gap-1">
          {entries.map((entry) => (
            <button
              key={entry.requestId}
              className={`flex items-center gap-2 rounded border px-2 py-1.5 text-left text-sm transition hover:border-cyan-400 ${
                entry.requestId === selectedId ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700"
              }`}
              onClick={() => {
                setSelectedId(entry.requestId);
                setCopied(false);
              }}
              type="button"
            >
              <span className={`rounded border px-2 py-0.5 text-xs font-semibold ${methodBadgeClass(entry.method)}`}>
                {entry.method}
              </span>
              <span className="min-w-0 flex-1 truncate text-slate-200" title={entry.url}>
                {truncateUrl(entry.url)}
              </span>
              <span className={`rounded border px-2 py-0.5 text-xs ${statusBadgeClass(entry.status)}`}>
                {statusLabel(entry.status)}
              </span>
              <span className="shrink-0 text-xs text-slate-400">{relativeTime(entry.startedAt)}</span>
            </button>
          ))}
        </div>
      )}

      {selected !== null && (
        <div className="mt-4 rounded border border-slate-700 bg-slate-950 p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="max-w-full truncate rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-200"
              onClick={() => void copyRequestId(selected.requestId)}
              title="Copiar UUID de la petición"
              type="button"
            >
              {copied ? "UUID copiado" : `UUID: ${selected.requestId}`}
            </button>
            {selected.backendRequestId !== undefined && (
              <span className="max-w-full truncate text-slate-300">
                ID devuelto por el servidor: {selected.backendRequestId}
              </span>
            )}
          </div>
          <dl className="mt-3 flex flex-col gap-1 text-slate-300">
            <div className="flex gap-2">
              <dt className="text-slate-400">Method:</dt>
              <dd>{selected.method}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400">URL:</dt>
              <dd className="break-all">{selected.url}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400">Status:</dt>
              <dd>{selected.status === 0 ? "red" : selected.status}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-slate-400">Duración:</dt>
              <dd>{Math.round(selected.durationMs)} ms</dd>
            </div>
          </dl>
          {selected.requestHeaders !== undefined && Object.keys(selected.requestHeaders).length > 0 && (
            <details className="mt-2 text-slate-300">
              <summary className="cursor-pointer text-slate-200">Headers de la request</summary>
              <ul className="mt-2 flex flex-col gap-1">
                {Object.entries(selected.requestHeaders).map(([key, value]) => (
                  <li key={key} className="font-mono break-all">
                    {key}: {value}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {selected.requestBody !== undefined && (
            <div className="mt-2">
              <h4 className="text-slate-200">Body de la request</h4>
              <pre className="font-mono whitespace-pre-wrap mt-1 max-h-48 overflow-auto rounded border border-slate-700 bg-slate-900 p-2 text-slate-100">
                {selected.requestBody}
              </pre>
            </div>
          )}
          {selected.responseBody !== undefined && (
            <div className="mt-2">
              <h4 className="text-slate-200">Body de la respuesta</h4>
              <pre className="font-mono whitespace-pre-wrap mt-1 max-h-48 overflow-auto rounded border border-slate-700 bg-slate-900 p-2 text-slate-100">
                {selected.responseBody}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
