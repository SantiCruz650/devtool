export interface HttpRequestInput {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
  requestId: string;
}

export interface HttpResponseInfo {
  requestId: string;
  backendRequestId?: string;
  status: number;
  statusText: string;
  responseHeaders: Record<string, string>;
  bodyText: string;
  bodyTruncated: boolean;
  bytesRead: number;
  durationMs: number;
  error?: "network";
}

export const MAX_BODY_CHARS = 1_000_000;

export async function executeRequest(
  input: HttpRequestInput,
  fetcher: typeof fetch = fetch,
): Promise<HttpResponseInfo> {
  const headers: Record<string, string> = { ...input.headers };
  const hasRequestId = Object.keys(headers).some((key) => key.toLowerCase() === "x-request-id");
  if (!hasRequestId) {
    headers["X-Request-ID"] = input.requestId;
  }

  const methodUpper = input.method.toUpperCase();
  const body = methodUpper === "GET" || methodUpper === "HEAD" ? undefined : input.body;

  const t0 = performance.now();

  let res: Response;
  try {
    res = await fetcher(input.url, { method: input.method, headers, body });
  } catch {
    return {
      requestId: input.requestId,
      status: 0,
      statusText: "",
      responseHeaders: {},
      bodyText: "",
      bodyTruncated: false,
      bytesRead: 0,
      durationMs: performance.now() - t0,
      error: "network",
    };
  }

  const bodyTextFull = await res.text();
  const truncated = bodyTextFull.length > MAX_BODY_CHARS;
  const bodyText = truncated ? bodyTextFull.slice(0, MAX_BODY_CHARS) : bodyTextFull;
  // bytesRead = longitud completa leída de la red (bodyTextFull.length), no la truncada.
  const bytesRead = bodyTextFull.length;

  const responseHeaders: Record<string, string> = {};
  for (const [key, value] of res.headers.entries()) {
    const prev = responseHeaders[key];
    responseHeaders[key] = prev === undefined ? value : `${prev}, ${value}`;
  }

  let backendRequestId: string | undefined;
  try {
    const parsed: unknown = JSON.parse(bodyText);
    if (typeof parsed === "object" && parsed !== null && "requestId" in parsed) {
      const candidate = (parsed as Record<string, unknown>)["requestId"];
      if (typeof candidate === "string") {
        backendRequestId = candidate;
      }
    }
  } catch {
    // Body no es JSON válido: se ignora sin tocar input.requestId.
  }

  return {
    requestId: input.requestId,
    backendRequestId,
    status: res.status,
    statusText: res.statusText,
    responseHeaders,
    bodyText,
    bodyTruncated: truncated,
    bytesRead,
    durationMs: performance.now() - t0,
  };
}
