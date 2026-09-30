import { useState } from "react";
import type { HttpResponseInfo } from "@devtool/core";

type ResponseViewerProps = {
  response: HttpResponseInfo | null;
};

function statusBadgeClass(status: number): string {
  if (status >= 200 && status < 300) {
    return "bg-green-400/10 text-green-200 border-green-400/50";
  }
  if (status >= 300 && status < 400) {
    return "bg-blue-400/10 text-blue-200 border-blue-400/50";
  }
  if (status >= 400 && status < 500) {
    return "bg-amber-400/10 text-amber-200 border-amber-400/50";
  }
  if (status >= 500) {
    return "bg-red-400/10 text-red-200 border-red-400/50";
  }
  return "bg-slate-400/10 text-slate-200 border-slate-400/50";
}

export default function ResponseViewer({ response }: ResponseViewerProps) {
  const [copied, setCopied] = useState(false);

  if (response === null) {
    return <p className="mt-4 text-sm text-slate-400">Envía una request para ver la respuesta</p>;
  }

  if (response.error === "network") {
    return (
      <p className="mt-4 rounded border border-red-400/50 bg-red-400/10 px-3 py-2 text-sm text-red-200">
        Error de red: ¿backend caído o bloqueo CORS? (Recuerda: la extensión de Chrome resolverá CORS en el futuro)
      </p>
    );
  }

  let prettyBody: string;
  try {
    const parsed: unknown = JSON.parse(response.bodyText);
    prettyBody = JSON.stringify(parsed, null, 2);
  } catch {
    prettyBody = response.bodyText;
  }

  async function copyRequestId(): Promise<void> {
    await navigator.clipboard.writeText(response?.requestId ?? "");
    setCopied(true);
  }

  return (
    <div className="mt-4">
      <span
        className={`inline-block rounded-full border px-3 py-1 text-sm ${statusBadgeClass(response.status)}`}
      >
        {response.status} {response.statusText}
      </span>
      <p className="mt-2 text-sm text-slate-300">
        {Math.round(response.durationMs)} ms · {response.bytesRead} bytes
        {response.bodyTruncated && <span className="ml-2 text-amber-200">Body truncado a 1 MB</span>}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          className="max-w-full truncate rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-1.5 text-sm text-cyan-200"
          onClick={() => void copyRequestId()}
          title="Copiar UUID de la petición"
          type="button"
        >
          {copied ? "UUID copiado" : `UUID: ${response.requestId}`}
        </button>
        {response.backendRequestId !== undefined && (
          <span className="max-w-full truncate rounded-full border border-slate-600 px-3 py-1.5 text-sm text-slate-300">
            ID devuelto por el servidor: {response.backendRequestId}
          </span>
        )}
      </div>
      <details className="mt-3 text-sm text-slate-300">
        <summary className="cursor-pointer text-slate-200">Headers de respuesta</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {Object.entries(response.responseHeaders).map(([key, value]) => (
            <li key={key} className="font-mono break-all">
              {key}: {value}
            </li>
          ))}
        </ul>
      </details>
      <pre className="font-mono whitespace-pre-wrap mt-3 max-h-96 overflow-auto rounded border border-slate-700 bg-slate-950 p-3 text-sm text-slate-100">
        {prettyBody}
      </pre>
    </div>
  );
}
