import { useState } from "react";
import { executeRequest } from "@devtool/core";
import type { HttpRequestInput, HttpResponseInfo } from "@devtool/core";
import RequestForm from "./components/RequestForm";
import ResponseViewer from "./components/ResponseViewer";
import { useCorrelationStore } from "./lib/correlation-store";

export default function RequestRunner() {
  const [sending, setSending] = useState(false);
  const [response, setResponse] = useState<HttpResponseInfo | null>(null);

  async function handleSend(input: HttpRequestInput): Promise<void> {
    setSending(true);
    try {
      const res = await executeRequest(input);
      setResponse(res);
      useCorrelationStore.getState().recordRequest({
        requestId: res.requestId,
        method: input.method,
        url: input.url,
        statusCode: res.status,
        startedAt: Date.now(),
        durationMs: res.durationMs,
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="w-full max-w-5xl rounded-xl border border-slate-700 bg-slate-900/80 p-5 shadow-xl">
      <h2 className="text-xl font-semibold text-slate-100">Request runner</h2>
      <div className="mt-4">
        <RequestForm onSend={(input) => void handleSend(input)} sending={sending} />
      </div>
      <ResponseViewer response={response} />
    </section>
  );
}
