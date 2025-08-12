import type { WorkerManager } from './worker/workerManager.js';

export interface ReaderFactory {
  fromBuffer: (format: string, buffer: ArrayBuffer) => Promise<Reader>;
  fromBlob: (format: string, blob: Blob) => Promise<Reader>;
}

export interface Reader {
  manifestStore: () => Promise<any>;
  activeLabel: () => Promise<string | null>;
  resourceToBuffer: (uri: string) => Promise<ArrayBuffer>;
  free: () => Promise<void>;
}

/**
 * Returns an object with functions to create reader objects
 */
export function createReaderFactory(worker: WorkerManager): ReaderFactory {
  return {
    async fromBuffer(format: string, buffer: ArrayBuffer): Promise<Reader> {
      const readerId = await worker.execute({
        method: 'reader_fromBuffer',
        args: [format, buffer],
        transfer: [buffer],
      });

      return createReader(worker, readerId);
    },

    async fromBlob(format: string, blob: Blob): Promise<Reader> {
      const readerId = await worker.execute({
        method: 'reader_fromBlob',
        args: [format, blob],
      });

      return createReader(worker, readerId);
    },
  };
}

/**
 * Provides a convenient API to call reader methods on the worker. Creates a closure around the worker ID to hide that implementation from the caller.
 */
function createReader(worker: WorkerManager, id: number): Reader {
  return {
    // TODO: manifest type
    async manifestStore(): Promise<any> {
      const json = await worker.execute({ method: 'reader_json', args: [id] });

      const manifestStore = JSON.parse(json);

      return manifestStore;
    },
    async activeLabel(): Promise<string | null> {
      const label = await worker.execute({
        method: 'reader_activeLabel',
        args: [id],
      });
      return label;
    },
    async resourceToBuffer(uri: string): Promise<ArrayBuffer> {
      return worker.execute({
        method: 'reader_resourceToBuffer',
        args: [id, uri],
      });
    },
    async free(): Promise<void> {
      return worker.execute({ method: 'reader_free', args: [id] });
    },
  };
}
