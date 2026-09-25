import Dexie, { type Table } from "dexie";
import type { HttpRequestInput, HttpResponseInfo } from "@devtool/core";

export interface HistoryEntry {
  requestId: string;
  method: string;
  url: string;
  status: number;
  durationMs: number;
  startedAt: number;
  backendRequestId?: string;
  requestHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
}

export const MAX_STORED_BODY = 10_000;

export class DevtoolDB extends Dexie {
  history!: Table<HistoryEntry, string>;
  constructor() {
    super("devtool");
    this.version(1).stores({ history: "requestId, startedAt, method, status" });
  }
}

export const db = new DevtoolDB();

function truncatePreview(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  // Truncado en chars UTF-16 (String.length/slice), no en bytes: es un preview
  // para la UI, no un offset de lectura de archivo.
  return value.length > MAX_STORED_BODY ? value.slice(0, MAX_STORED_BODY) : value;
}

export function toHistoryEntry(input: HttpRequestInput, res: HttpResponseInfo): HistoryEntry {
  return {
    requestId: res.requestId,
    method: input.method,
    url: input.url,
    status: res.status,
    durationMs: res.durationMs,
    startedAt: Date.now(),
    backendRequestId: res.backendRequestId,
    requestHeaders: input.headers,
    requestBody: truncatePreview(input.body),
    responseBody: truncatePreview(res.bodyText),
  };
}

export async function saveHistory(entry: HistoryEntry): Promise<void> {
  await db.history.put(entry);
  await pruneHistory();
}

export async function listHistory(limit = 100): Promise<HistoryEntry[]> {
  return db.history.orderBy("startedAt").reverse().limit(limit).toArray();
}

export async function getHistory(requestId: string): Promise<HistoryEntry | undefined> {
  return db.history.get(requestId);
}

export async function pruneHistory(keep = 500): Promise<void> {
  const count = await db.history.count();
  if (count <= keep) {
    return;
  }
  const toDelete = await db.history.orderBy("startedAt").reverse().offset(keep).primaryKeys();
  await db.history.bulkDelete(toDelete);
}
