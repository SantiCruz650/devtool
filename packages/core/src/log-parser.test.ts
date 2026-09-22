import { describe, expect, it } from "vitest";
import { parseLine } from "./log-parser.js";

const requestId = "550e8400-e29b-41d4-a716-446655440000";

 describe("parseLine", () => {
  it("extracts a UUID v4", () => {
    expect(parseLine(`GET /api/users ${requestId}`, "app.log").requestIds).toEqual([requestId]);
  });

  it("returns no request IDs when there is no UUID", () => {
    expect(parseLine("health check passed", "app.log").requestIds).toEqual([]);
  });

  it("extracts an ISO-8601 timestamp", () => {
    expect(parseLine("2026-08-28T12:34:56.789Z INFO ready", "app.log").timestamp).toBe("2026-08-28T12:34:56.789Z");
  });

  it("returns null when there is no timestamp", () => {
    expect(parseLine("INFO ready", "app.log").timestamp).toBeNull();
  });

  it("detects the error level", () => {
    expect(parseLine("ERROR request failed", "app.log").level).toBe("error");
  });

  it("uses unknown for an unrecognized level", () => {
    expect(parseLine("NOTICE request received", "app.log").level).toBe("unknown");
  });

  it("extracts unique multiple UUIDs", () => {
    const secondRequestId = "123e4567-e89b-42d3-a456-426614174000";
    expect(parseLine(`${requestId} ${secondRequestId} ${requestId}`, "app.log").requestIds).toEqual([requestId, secondRequestId]);
  });

  it("handles an empty line", () => {
    expect(parseLine("", "app.log")).toMatchObject({
      raw: "",
      timestamp: null,
      level: "unknown",
      requestIds: [],
      filePath: "app.log",
    });
  });
});
