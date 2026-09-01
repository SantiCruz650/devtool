export function placeholder(): void {}

export type { LogLine, LogSource } from "./types.js";
export { parseLine } from "./log-parser.js";
export { MockLogSource } from "./mock-log-source.js";
export { FileSystemLogSource, PermissionRequiredError } from "./fs-log-source.js";
export type { BlobLike, FileHandleLike, FileLike, PermissionStateLike } from "./fs-log-source.js";
