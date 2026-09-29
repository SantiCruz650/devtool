import { useEffect, useState } from "react";
import { executeRequest } from "@devtool/core";
import type { HttpRequestInput, HttpResponseInfo } from "@devtool/core";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";
import { useCorrelationStore } from "./lib/correlation-store";
import { saveHistory, toHistoryEntry } from "./lib/db";
import { executeRequestViaExtension, isExtensionAvailable } from "./lib/extension-bridge";

type ExtStatus = "checking" | "connected" | "unavailable";

export default function RequestRunner() {
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<HttpResponseInfo | null>(null);
  const [extStatus, setExtStatus] = useState<ExtStatus>("checking");

  useEffect(() => {
    isExtensionAvailable()
      .then((ok) => setExtStatus(ok ? "connected" : "unavailable"))
      .catch(() => setExtStatus("unavailable"));
  }, []);

  async function handleSend(input: HttpRequestInput): Promise<void> {
    setSending(true);
    try {
      let res: HttpResponseInfo;
      if (extStatus === "connected") {
        try {
          res = await executeRequestViaExtension(input);
        } catch (e) {
          console.warn("Extensión falló, usando fetch directo:", e);
          res = await executeRequest(input);
        }
      } else {
        res = await executeRequest(input);
      }
      setResponse(res);
      useCorrelationStore.getState().recordRequest({
        requestId: res.requestId,
        method: input.method,
        url: input.url,
        statusCode: res.status,
        startedAt: Date.now(),
        durationMs: res.durationMs,
      });
      try {
        await saveHistory(toHistoryEntry(input, res));
      } catch (e) {
        console.warn("No se pudo guardar en historial:", e);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-100">Request runner</h2>
      <div className="mt-2 text-sm" role="status" aria-live="polite">
        {extStatus === "checking" && <span className="text-slate-400">Detectando extensión…</span>}
        {extStatus === "connected" && (
          <span className="flex items-center gap-2 text-slate-200">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" aria-hidden="true" />
            Extensión conectada — requests vía puente CORS
          </span>
        )}
        {extStatus === "unavailable" && (
          <span className="flex items-center gap-2 text-slate-200">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" aria-hidden="true" />
            Extensión no detectada — modo fetch directo (CORS limitado)
          </span>
        )}
      </div>
      <div className="mt-4">
        <RequestForm onSend={(input) => void handleSend(input)} sending={sending} />
      </div>
      <ResponseViewer response={response} />
    </section>
  );
}
