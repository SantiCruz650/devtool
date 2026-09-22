export interface LogLine {
  id: string;              // uuid v4
  raw: string;             // línea original sin modificar
  timestamp: string | null;// ISO-8601 si se pudo extraer, sino null
  level: 'debug' | 'info' | 'warn' | 'error' | 'unknown';
  requestIds: string[];    // UUIDs de X-Request-ID encontrados en la línea
  filePath: string;        // identificador del origen
}

export interface LogSource {
  readonly id: string;
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  subscribe(onLines: (lines: LogLine[]) => void): () => void;
}
