import type { HttpRequestInput, HttpResponseInfo } from "@devtool/core";

const TAG = "devtool-webapp";
const EXT_TAG = "devtool-extension";
const PING_TIMEOUT_MS = 600;
const REQUEST_TIMEOUT_MS = 30_000;

interface BridgeMessage {
  source?: unknown;
  type?: unknown;
  requestId?: unknown;
  response?: unknown;
  bridgeError?: unknown;
}

function post(msg: unknown): void {
  window.postMessage(msg, "*");
}

function waitForMessage<T>(
  type: string,
  predicate: (m: BridgeMessage) => boolean,
  timeoutMs: number,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      reject(new Error("timeout"));
    }, timeoutMs);

    function onMessage(event: MessageEvent): void {
      const data = event.data as BridgeMessage | null | undefined;
      if (data === null || data === undefined || typeof data !== "object") {
        return;
      }
      if (data.source !== EXT_TAG || data.type !== type) {
        return;
      }
      let ok: boolean;
      try {
        ok = predicate(data);
      } catch {
        return;
      }
      if (!ok) {
        return;
      }
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data as unknown as T);
    }

    window.addEventListener("message", onMessage);
  });
}

export async function isExtensionAvailable(): Promise<boolean> {
  post({ source: TAG, type: "DEVTOOL_PING" });
  try {
    await waitForMessage<BridgeMessage>("DEVTOOL_PONG", () => true, PING_TIMEOUT_MS);
    return true;
  } catch {
    return false;
  }
}

export async function executeRequestViaExtension(input: HttpRequestInput): Promise<HttpResponseInfo> {
  post({ source: TAG, type: "EXECUTE_REQUEST", payload: input });
  const msg = await waitForMessage<BridgeMessage>(
    "EXECUTE_RESPONSE",
    (m) => m.requestId === input.requestId,
    REQUEST_TIMEOUT_MS,
  );
  if (msg.bridgeError !== null && msg.bridgeError !== undefined) {
    throw new Error(typeof msg.bridgeError === "string" ? msg.bridgeError : "bridgeError");
  }
  if (msg.response === null || msg.response === undefined) {
    throw new Error("bridgeError");
  }
  return msg.response as HttpResponseInfo;
}
