/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { AssetTooLargeError, UnsupportedFormatError } from './error.js';
import { isSupportedReaderFormat } from './supportedFormats.js';
import type { WorkerManager } from './worker/workerManager.js';

// 1 GB
export const MAX_SIZE_IN_BYTES = 10 ** 9;

export interface ReaderFactory {
  /**
   * Create a reader from an asset's format and a blob of its bytes.
   *
   * @param format Asset format
   * @param blob Blob of asset bytes
   * @returns An object that provides methods for reading C2PA data from the provided asset.
   */
  fromBlob: (format: string, blob: Blob) => Promise<Reader>;

  fromBlobFragment: (
    format: string,
    init: Blob,
    fragment: Blob
  ) => Promise<Reader>;
}

export interface Reader {
  /**
   * @returns The object's full manifest store containing the all manifests, validation statuses, and the URI of the active manifest.
   */
  manifestStore: () => Promise<any>;

  /**
   * @returns The label of the active manifest.
   */
  activeLabel: () => Promise<string | null>;

  /**
   * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
   *
   * @param uri URI of the binary object to resolve.
   * @returns An array buffer of the resource's bytes.
   */
  resourceToBuffer: (uri: string) => Promise<ArrayBuffer>;
  free: () => Promise<void>;
}

/**
 *
 * @param worker - Worker (via WorkerManager) to be associated with this reader factory
 * @returns Object containing reader creation methods
 */
export function createReaderFactory(worker: WorkerManager): ReaderFactory {
  const registry = new FinalizationRegistry<number>((id) => {
    worker.execute({ method: 'reader_free', args: [id] });
  });

  return {
    async fromBlob(format: string, blob: Blob): Promise<Reader> {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      if (blob.size > MAX_SIZE_IN_BYTES) {
        throw new AssetTooLargeError(blob.size);
      }

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

    async fromBlobFragment(format: string, init: Blob, fragment: Blob) {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      if (init.size > MAX_SIZE_IN_BYTES) {
        throw new AssetTooLargeError(init.size);
      }

      const readerId = await worker.execute({
        method: 'reader_fromBlobFragment',
        args: [format, init, fragment],
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
