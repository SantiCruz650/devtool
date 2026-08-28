import type { LogLine } from "./types.js";

const timestampPattern = /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\b/;
const uuidV4Pattern = /\b[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const levelPatterns: Array<{ level: LogLine["level"]; pattern: RegExp }> = [
  { level: "error", pattern: /(?:\[\s*E\s*\]|\bERROR\b)/i },
  { level: "warn", pattern: /(?:\[\s*W\s*\]|\bWARN(?:ING)?\b)/i },
  { level: "info", pattern: /(?:\[\s*I\s*\]|\bINFO\b)/i },
  { level: "debug", pattern: /(?:\[\s*D\s*\]|\bDEBUG\b)/i },
];

function createUuidV4(): string {
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function parseLine(raw: string, filePath: string): LogLine {
  const requestIds = [...new Set(raw.match(uuidV4Pattern) ?? [])];
  const matchedLevel = levelPatterns.find(({ pattern }) => pattern.test(raw));

  return {
    id: createUuidV4(),
    raw,
    timestamp: raw.match(timestampPattern)?.[0] ?? null,
    level: matchedLevel?.level ?? "unknown",
    requestIds,
    filePath,
  };
}
