import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FileSystemLogSource, PermissionRequiredError } from "./fs-log-source.js";
import type { FileHandleLike } from "./fs-log-source.js";

class FakeFileHandle implements FileHandleLike {
  readonly name: string;
  private buf: string;
  private permissionState: "granted" | "denied" | "prompt";
  private failNextGetFile = false;

  constructor(name: string, initial = "", permissionState: "granted" | "denied" | "prompt" = "granted") {
    this.name = name;
    this.buf = initial;
    this.permissionState = permissionState;
  }

  append(str: string): void {
    this.buf += str;
  }

  truncateTo(size: number): void {
    this.buf = this.buf.slice(0, size);
  }

  setFailNextGetFile(value: boolean): void {
    this.failNextGetFile = value;
  }

  async getFile() {
    if (this.failNextGetFile) {
      this.failNextGetFile = false;
      throw new Error("temporary failure");
    }

    return {
      size: this.buf.length,
      slice: (start = 0, end = this.buf.length) => new Blob([this.buf.slice(start, end)]),
    };
  }

  async queryPermission(): Promise<"granted" | "denied" | "prompt"> {
    return this.permissionState;
  }

  async requestPermission(): Promise<"granted" | "denied" | "prompt"> {
    return this.permissionState;
  }
}

describe("FileSystemLogSource", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not emit preexisting lines when readFrom is end", async () => {
    const handle = new FakeFileHandle("app.log", "INFO ready\nERROR fail\n");
    const source = new FileSystemLogSource(handle, { readFrom: "end" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([]);
    await source.stop();
  });

  it("emits preexisting lines when readFrom is start", async () => {
    const handle = new FakeFileHandle("app.log", "INFO ready\nERROR fail\n");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO ready", "ERROR fail"]]);
    await source.stop();
  });

  it("emits a split line only after the full newline arrives", async () => {
    const handle = new FakeFileHandle("app.log", "GET /api/users ", "granted");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);
    expect(received).toEqual([]);

    handle.append("550e8400-e29b-41d4-a716-446655440000\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["GET /api/users 550e8400-e29b-41d4-a716-446655440000"]]);
    await source.stop();
  });

  it("emits multiple complete lines from one tick as a single batch", async () => {
    const handle = new FakeFileHandle("app.log", "INFO first\nWARN second\n");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO first", "WARN second"]]);
    await source.stop();
  });

  it("resets on truncation and reads from the beginning", async () => {
    const handle = new FakeFileHandle("app.log", "INFO old\nERROR stale\n");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);

    handle.truncateTo(0);
    handle.append("INFO fresh\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO old", "ERROR stale"], ["INFO fresh"]]);
    await source.stop();
  });

  it("throws PermissionRequiredError when permissions are denied", async () => {
    const handle = new FakeFileHandle("app.log", "INFO ready\n", "denied");
    const source = new FileSystemLogSource(handle);

    await expect(source.start()).rejects.toThrow(PermissionRequiredError);
  });

  it("does not emit after stop", async () => {
    const handle = new FakeFileHandle("app.log", "");
    const source = new FileSystemLogSource(handle, { readFrom: "end" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    handle.append("INFO first\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO first"]]);

    await source.stop();
    handle.append("INFO second\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO first"]]);
  });

  it("subscribers added after start receive subsequent batches", async () => {
    const handle = new FakeFileHandle("app.log", "");
    const source = new FileSystemLogSource(handle, { readFrom: "end" });
    const received: string[][] = [];

    await source.start();
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));
    handle.append("INFO second\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO second"]]);
    await source.stop();
  });

  it("continues polling after a transient getFile rejection", async () => {
    const handle = new FakeFileHandle("app.log", "");
    const source = new FileSystemLogSource(handle, { readFrom: "end" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    handle.setFailNextGetFile(true);
    await vi.advanceTimersByTimeAsync(300);
    handle.append("INFO second\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO second"]]);
    await source.stop();
  });

  it("extracts request IDs from emitted lines", async () => {
    const handle = new FakeFileHandle("app.log", "GET /api/users 550e8400-e29b-41d4-a716-446655440000\n");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["GET /api/users 550e8400-e29b-41d4-a716-446655440000"]]);
    expect(received[0][0].split(" ").slice(-1)[0]).toBe("550e8400-e29b-41d4-a716-446655440000");
    await source.stop();
  });

  it("keeps a partial line buffered until newline and then emits it once", async () => {
    const handle = new FakeFileHandle("app.log", "INFO partial");
    const source = new FileSystemLogSource(handle, { readFrom: "start" });
    const received: string[][] = [];
    source.subscribe((lines) => received.push(lines.map((line) => line.raw)));

    await source.start();
    await vi.advanceTimersByTimeAsync(300);
    expect(received).toEqual([]);

    handle.append(" 550e8400-e29b-41d4-a716-446655440000\n");
    await vi.advanceTimersByTimeAsync(300);

    expect(received).toEqual([["INFO partial 550e8400-e29b-41d4-a716-446655440000"]]);
    await source.stop();
  });
});
