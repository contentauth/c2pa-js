/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Manifest, ManifestStore } from '@contentauth/c2pa-types';
import { AssetTooLargeError, UnsupportedFormatError } from './error.js';
import { isSupportedReaderFormat } from './supportedFormats.js';
import type { WorkerManager } from './worker/workerManager.js';

// 1 GB
export const MAX_SIZE_IN_BYTES = 10 ** 9;

/**
 * A collection of functions that permit the creation of Reader objects from various sources.
 */
export interface ReaderFactory {
  /**
   * Create a Reader from an asset's format and a blob of its bytes.
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

/**
 * Exposes methods for reading C2PA data out of an asset.
 * 
 * @example Getting an asset's active manifest:
 * ```
 * const reader = await c2pa.reader.fromBlob(blob.type, blob);
 * 
 * const activeManifest = await reader.activeManfiest();
 * ```
 */
export interface Reader {
  /**
   * @returns The label of the active manifest.
   */
  activeLabel: () => Promise<string | null>;

  /**
   * @returns The asset's full manifest store containing all its manifests, validation statuses, and the URI of the active manifest.
   *
   * NOTE: At the moment, the manifest store returned by this method will not include decoded CAWG data. Use Reader.json() if CAWG is a requirement.
   */
  manifestStore: () => Promise<ManifestStore>;

  /**
   * @returns The asset's active manifest.
   *
   * NOTE: At the moment, the manifest returned by this method will not include decoded CAWG data. Use Reader.json() if CAWG is a requirement.
   */
  activeManifest: () => Promise<Manifest>;

  /**
   * @returns The asset's full manifest store, including decoded CAWG data.
   */
  json: () => Promise<any>;

  /**
   * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
   *
   * @param uri URI of the binary object to resolve.
   * @returns An array buffer of the resource's bytes.
   * 
   * @example Retrieving a thumbnail from the resource store:
   * ```
   * const reader = await c2pa.reader.fromBlob(blob.type, blob);
   * 
   * const activeManifest = await reader.activeManifest();
   * 
   * const thumbnailBuffer = await reader.resourceToBuffer(activeManifest.thumbnail!.identifier);
   * ```
   */
  resourceToBuffer: (uri: string) => Promise<ArrayBuffer>;

  /**
   * Dispose of this Reader, freeing the memory it occupied and preventing further use. Call this whenever the Reader is no longer needed.
   */
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

      const reader = createReader(worker, readerId, () => {
        registry.unregister(reader);
      });
      registry.register(reader, readerId, reader);

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

      const reader = createReader(worker, readerId, () => {
        registry.unregister(reader);
      });
      registry.register(reader, readerId, reader);

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
    async activeLabel(): Promise<string | null> {
      const label = await worker.execute({
        method: 'reader_activeLabel',
        args: [id],
      });
      return label;
    },
    async manifestStore(): Promise<ManifestStore> {
      const manifestStore = await worker.execute({
        method: 'reader_manifestStore',
        args: [id],
      });
      return manifestStore;
    },
    async activeManifest(): Promise<Manifest> {
      const activeManifest = await worker.execute({
        method: 'reader_activeManifest',
        args: [id],
      });

      return activeManifest;
    },
    async json(): Promise<any> {
      const json = await worker.execute({ method: 'reader_json', args: [id] });

      const manifestStore = JSON.parse(json);

      return manifestStore;
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
