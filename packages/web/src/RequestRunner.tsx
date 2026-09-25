import { useState } from "react";
import type { RequestRecord } from "@devtool/core";
import { useCorrelationStore } from "./lib/correlation-store";

const REQUEST_URL_KEY = "devtool.requestUrl";

export default function RequestRunner() {
  const [url, setUrl] = useState(() => localStorage.getItem(REQUEST_URL_KEY) ?? "http://localhost:3000/api/users");
  const [status, setStatus] = useState<number | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const recordRequest = useCorrelationStore((state) => state.recordRequest);

  async function sendRequest(): Promise<void> {
    const id = crypto.randomUUID();
    const startedAt = Date.now();
    setRequestId(id);
    setStatus(null);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch(url, { headers: { "X-Request-ID": id } });
      const durationMs = Date.now() - startedAt;
      let backendRequestId: string = id;
      try {
        const body: unknown = await response.clone().json();
        if (typeof body === "object" && body !== null && "requestId" in body) {
          const responseRequestId = body.requestId;
          if (typeof responseRequestId === "string") {
            backendRequestId = responseRequestId;
          }
        }
      } catch {
        // Some endpoints may return an empty or non-JSON body.
      }
      setStatus(response.status);
      setRequestId(backendRequestId);
      const request: RequestRecord = {
        requestId: backendRequestId,
        method: "GET",
        url,
        statusCode: response.status,
        startedAt,
        durationMs,
      };
      recordRequest(request);
    } catch {
      setError("No se pudo conectar con el backend.");
    }
  }

  async function copyRequestId(): Promise<void> {
    if (requestId === null) {
      return;
    }
    await navigator.clipboard.writeText(requestId);
    setCopied(true);
  }

  return (
    <section className="w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-100">Request runner</h2>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="min-w-0 flex-1 rounded border border-slate-600 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-cyan-400"
          onChange={(event) => {
            setUrl(event.target.value);
            localStorage.setItem(REQUEST_URL_KEY, event.target.value);
          }}
          type="url"
          value={url}
        />
        <button
          className="rounded-md bg-cyan-400 px-4 py-2 font-medium text-slate-950 transition hover:bg-cyan-300"
          onClick={() => void sendRequest()}
          type="button"
        >
          Enviar
        </button>
      </div>
      {status !== null && <p className="mt-3 text-sm text-slate-300">Status HTTP: {status}</p>}
      {requestId !== null && (
        <button
          className="mt-3 max-w-full truncate rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-200"
          onClick={() => void copyRequestId()}
          title="Copiar UUID de la petición"
          type="button"
        >
          {copied ? "UUID copiado" : `UUID: ${requestId}`}
        </button>
      )}
      {error !== null && <p className="mt-3 text-sm text-red-300">{error}</p>}
    </section>
  );
}