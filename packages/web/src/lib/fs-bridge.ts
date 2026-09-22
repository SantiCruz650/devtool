import { FileSystemLogSource, PermissionRequiredError } from '@devtool/core';

const OPFS_DEMO_DIR = 'demo';
const OPFS_DEMO_FILE = 'demo.log';

type ShowOpenFilePicker = (options?: {
  types?: Array<{
    description: string;
    accept: Record<string, string[]>;
  }>;
}) => Promise<FileSystemFileHandle[]>;

export async function createOpfsDemoHandle(): Promise<FileSystemFileHandle> {
  if (typeof navigator.storage?.getDirectory !== 'function') {
    throw new Error('OPFS no está disponible en este navegador.');
  }

  const root = await navigator.storage.getDirectory();
  const demoDir = await root.getDirectoryHandle(OPFS_DEMO_DIR, { create: true });
  return await demoDir.getFileHandle(OPFS_DEMO_FILE, { create: true });
}

export class OpfsLogSimulator {
  private readonly handle: FileSystemFileHandle;
  private readonly intervalMs: number;
  private intervalId: number | undefined;
  private offset = 0;
  private writeInFlight: Promise<void> | null = null;
  private stopped = false;

  constructor(handle: FileSystemFileHandle, intervalMs = 400) {
    this.handle = handle;
    this.intervalMs = intervalMs;
  }

  async start(): Promise<void> {
    if (this.intervalId !== undefined) {
      return;
    }

    const file = await this.handle.getFile();
    this.offset = file.size;
    this.stopped = false;
    this.intervalId = window.setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  async stop(): Promise<void> {
    this.stopped = true;
    if (this.intervalId !== undefined) {
      window.clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    if (this.writeInFlight !== null) {
      await this.writeInFlight;
    }
  }

  private async tick(): Promise<void> {
    if (this.stopped) {
      return;
    }

    const lineCount = 1 + Math.floor(Math.random() * 3);
    const lines = Array.from({ length: lineCount }, () => {
      const timestamp = new Date().toISOString();
      const level = ['DEBUG', 'INFO', 'WARN', 'ERROR'][Math.floor(Math.random() * 4)] ?? 'INFO';
      const maybeUuid = Math.random() < 0.4 ? crypto.randomUUID() : null;
      const messageTemplates = [
        'GET /api/users',
        'POST /api/users',
        'SELECT * FROM users LIMIT 20',
        'cache refresh completed',
        'query lenta detectada',
        'request processed successfully',
      ];
      const message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)] ?? 'request processed';
      const suffix = maybeUuid === null ? '' : ` ${maybeUuid}`;
      return `[${timestamp}] ${level} ${message}${suffix}\n`;
    });

    const entries = lines.slice();
    this.writeInFlight = (async () => {
      for (const line of entries) {
        if (typeof this.handle.createWritable !== 'function') {
          return;
        }

        const writable = await this.handle.createWritable({ keepExistingData: true });
        // VERIFY-API: write({ type: 'write', position, data }) y keepExistingData son parte de la spec de File System Access.
        await writable.write({
          type: 'write',
          position: this.offset,
          data: line,
        });
        await writable.close();
        this.offset += line.length;
      }
    })();

    try {
      await this.writeInFlight;
    } catch {
      // Ignorar fallos del stream simulador; la UI sigue funcionando.
    } finally {
      this.writeInFlight = null;
    }
  }
}

export async function pickLogFile(): Promise<FileSystemFileHandle> {
  if (typeof window === 'undefined') {
    throw new Error('showOpenFilePicker no está disponible en este navegador.');
  }

  const browserWindow = window as Window & { showOpenFilePicker?: ShowOpenFilePicker };
  // VERIFY-API: showOpenFilePicker no está declarado por lib.dom, aunque forma parte de File System Access.
  if (typeof browserWindow.showOpenFilePicker !== 'function') {
    throw new Error('showOpenFilePicker no está disponible en este navegador.');
  }

  const [handle] = await browserWindow.showOpenFilePicker({
    types: [
      {
        description: 'Logs',
        accept: {
          'text/plain': ['.log', '.txt'],
        },
      },
    ],
  });

  return handle;
}

export { FileSystemLogSource, PermissionRequiredError };
