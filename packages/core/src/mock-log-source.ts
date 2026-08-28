import { parseLine } from "./log-parser.js";
import type { LogLine, LogSource } from "./types.js";

const requestId = "550e8400-e29b-41d4-a716-446655440000";
const templates = [
  `2026-08-28T12:00:00.000Z INFO GET /api/users ${requestId}`,
  `2026-08-28T12:00:01.000Z [E] Request failed for ${requestId}`,
  "2026-08-28T12:00:02.000Z DEBUG cache refresh completed",
  "2026-08-28T12:00:03.000Z WARN slow database query detected",
  "INFO health check passed",
];

export class MockLogSource implements LogSource {
  readonly id: string;
  readonly name: string;
  private interval: ReturnType<typeof setInterval> | undefined;
  private readonly subscribers = new Set<(lines: LogLine[]) => void>();
  private readonly filePath: string;

  constructor(id = "mock-log-source", name = "Mock log source") {
    this.id = id;
    this.name = name;
    this.filePath = name;
  }

  async start(): Promise<void> {
    if (this.interval !== undefined) {
      return;
    }

    this.interval = setInterval(() => {
      const lineCount = Math.floor(Math.random() * 5) + 1;
      const lines = Array.from({ length: lineCount }, () => {
        const template = templates[Math.floor(Math.random() * templates.length)];
        return parseLine(template, this.filePath);
      });
      this.subscribers.forEach((subscriber) => subscriber(lines));
    }, 300);
  }

  async stop(): Promise<void> {
    if (this.interval !== undefined) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
  }

  subscribe(onLines: (lines: LogLine[]) => void): () => void {
    this.subscribers.add(onLines);
    return () => {
      this.subscribers.delete(onLines);
    };
  }
}
