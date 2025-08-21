/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { WorkerManager } from './worker/workerManager.js';

export interface ReaderFactory {
  /**
   * Create a reader from an asset's format and a blob of its bytes.
   *
   * @param format Asset format
   * @param blob Blob of asset bytes
   * @returns An object that provides methods for reading C2PA data from the provided asset.
   */
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
  const registry = new FinalizationRegistry<number>((id) => {
    worker.execute({ method: 'reader_free', args: [id] });
  });

  return {
    async fromBlob(format: string, blob: Blob): Promise<Reader> {
      const readerId = await worker.execute({
        method: 'reader_fromBlob',
        args: [format, blob],
      });

      const unregisterToken = Symbol(readerId);
      const reader = createReader(worker, readerId, () => {
        registry.unregister(unregisterToken);
      });
      registry.register(reader, readerId, unregisterToken);

      return reader;
    },
  };
}

function createReader(
  worker: WorkerManager,
  id: number,
  onFree: () => void
): Reader {
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
      onFree();
      return worker.execute({ method: 'reader_free', args: [id] });
    },
  };
}
