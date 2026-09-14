import { parseLine } from "./log-parser.js";
import type { LogLine, LogSource } from "./types.js";

export type PermissionStateLike = "granted" | "denied" | "prompt";

export interface BlobLike {
  text(): Promise<string>;
}

export interface FileLike {
  readonly size: number;
  slice(start?: number, end?: number): BlobLike;
}

export interface FileHandleLike {
  readonly name: string;
  getFile(): Promise<FileLike>;
  queryPermission?(desc: { mode: "read" }): Promise<PermissionStateLike>;
  requestPermission?(desc: { mode: "read" }): Promise<PermissionStateLike>;
}

export class PermissionRequiredError extends Error {
  constructor(message = "Permission required to read the log file.") {
    super(message);
    this.name = "PermissionRequiredError";
  }
}

export function extractCompleteLines(partial: string, chunk: string): { lines: string[]; remainder: string } {
  const parts = (partial + chunk).split("\n");
  const remainder = parts.pop() ?? "";
  return { lines: parts.map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line)), remainder };
}

export class FileSystemLogSource implements LogSource {
  readonly id: string;
  readonly name: string;

  private readonly handle: FileHandleLike;
  private readonly pollIntervalMs: number;
  private readonly readFrom: "start" | "end";
  private readonly subscribers = new Set<(lines: LogLine[]) => void>();
  private intervalId: ReturnType<typeof setInterval> | undefined;
  private offset = 0;
  private partialBuffer = "";
  private stopped = false;

  constructor(handle: FileHandleLike, opts: { pollIntervalMs?: number; readFrom?: "start" | "end" } = {}) {
    this.handle = handle;
    this.pollIntervalMs = opts.pollIntervalMs ?? 300;
    this.readFrom = opts.readFrom ?? "end";
    this.id = handle.name;
    this.name = handle.name;
  }

  async start(): Promise<void> {
    if (this.intervalId !== undefined) {
      return;
    }

    await this.ensurePermission();
    const file = await this.handle.getFile();
    this.offset = this.readFrom === "start" ? 0 : file.size;
    this.partialBuffer = "";
    this.stopped = false;

    this.intervalId = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.intervalId !== undefined) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.subscribers.clear();
  }

  subscribe(onLines: (lines: LogLine[]) => void): () => void {
    this.subscribers.add(onLines);
    return () => {
      this.subscribers.delete(onLines);
    };
  }

  private async ensurePermission(): Promise<void> {
    if (typeof this.handle.queryPermission !== "function") {
      return;
    }

    let permissionState = await this.handle.queryPermission({ mode: "read" });

    if (permissionState !== "granted") {
      if (typeof this.handle.requestPermission === "function") {
        try {
          permissionState = await this.handle.requestPermission({ mode: "read" });
        } catch {
          permissionState = "denied";
        }
      } else {
        permissionState = "denied";
      }
    }

    if (permissionState !== "granted") {
      throw new PermissionRequiredError();
    }
  }

  private async pollOnce(): Promise<void> {
    if (this.stopped) {
      return;
    }

    try {
      const file = await this.handle.getFile();
      const currentSize = file.size;

      if (currentSize < this.offset) {
        this.offset = 0;
        this.partialBuffer = "";
      }

      if (currentSize === this.offset) {
        return;
      }

      const chunk = await file.slice(this.offset).text();
      const extracted = extractCompleteLines(this.partialBuffer, chunk);
      this.partialBuffer = extracted.remainder;

      if (extracted.lines.length > 0) {
        const batch = extracted.lines.map((line) => parseLine(line, this.handle.name));
        this.emit(batch);
      }

      this.offset += chunk.length;
    } catch {
      // Ignore transient read failures; polling continues.
    }
  }

  private emit(lines: LogLine[]): void {
    for (const subscriber of this.subscribers) {
      subscriber(lines);
    }
  }
}
