/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Manifest, ManifestStore } from '@contentauth/c2pa-types';
import { WasmReader, initSync } from '@contentauth/c2pa-wasm';
import { UnsupportedFormatError } from './error.js';
import { isSupportedReaderFormat } from './supportedFormats.js';
import { sanitizeManifestStore } from './worker/sanitizeManifestStore.js';
import type { WorkerManager } from './worker/workerManager.js';
import type { RangeFetchEvent } from './worker/rpc.js';
import {
  Settings,
  resolveSettings,
  validateAssetSize
} from '@contentauth/c2pa-utilities';

// 1 GB
export const MAX_SIZE_IN_BYTES = 10 ** 9;

/** Lazily initializes the WASM module on the main thread (for worker-free reads). */
let mainThreadWasmReady = false;
function ensureMainThreadWasm(wasm: WebAssembly.Module): void {
  if (!mainThreadWasmReady) {
    initSync({ module: wasm });
    mainThreadWasmReady = true;
  }
}

/** Options for URL-based readers that fetch bytes over HTTP Range requests. */
export interface FromUrlOptions {
  /** Context settings for the reader. Overrides values from createC2pa. */
  settings?: Settings;
  /** Invoked for each Range fetch performed while reading the asset. */
  onFetch?: (event: RangeFetchEvent) => void;
  /**
   * Read strategy:
   * - `'verify'` (default): full validation including the data-hash binding. Runs
   *   in the Web Worker (synchronous XHR).
   * - `'discover'`: manifest + signature validation only, driven over asynchronous
   *   `fetch`; no data-hash binding is checked.
   */
  mode?: 'verify' | 'discover';
}

/**
 * A collection of functions that permit the creation of Reader objects from various sources.
 */
export interface ReaderFactory {
  /**
   * Create a {@link Reader} from an asset's format and a blob of its bytes.
   *
   * @param format Asset format.
   * @param blob Blob of asset bytes.
   * @param settings Optional context settings for the reader. Will override any values inherited by the top-level settings passed to createC2pa.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   */
  fromBlob: (
    format: string,
    blob: Blob,
    settings?: Settings
  ) => Promise<Reader | null>;

  /**
   *
   * @param format Asset format.
   * @param init Blob of initial fragment bytes.
   * @param fragment Blob of fragment bytes.
   * @param settings Optional context settings for the reader. Will override any values inherited by the top-level settings passed to createC2pa.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   */
  fromBlobFragment: (
    format: string,
    init: Blob,
    fragment: Blob,
    settings?: Settings
  ) => Promise<Reader | null>;

  /**
   * Create a {@link Reader} from an asset's format and URL, reading only the bytes
   * needed via HTTP Range requests instead of downloading the whole asset.
   *
   * @param format Asset format.
   * @param url URL of the asset. The host must support HTTP Range requests.
   * @param options Optional settings and an `onFetch` callback fired per Range request.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   */
  fromUrl: (
    format: string,
    url: string,
    options?: FromUrlOptions
  ) => Promise<Reader | null>;

  /**
   * Create a {@link Reader} from a fragmented asset addressed by an initialization
   * segment URL and an ordered list of fragment URLs, reading only the bytes needed
   * via HTTP Range requests.
   *
   * @param format Asset format.
   * @param initUrl URL of the initialization segment.
   * @param fragmentUrls Ordered URLs of the fragment segments.
   * @param options Optional settings and an `onFetch` callback fired per Range request.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   */
  fromUrlFragment: (
    format: string,
    initUrl: string,
    fragmentUrls: string[],
    options?: FromUrlOptions
  ) => Promise<Reader | null>;
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
   * @returns The asset's full {@link ManifestStore} containing all its manifests, validation statuses, and the URI of the active manifest.
   */
  manifestStore: () => Promise<ManifestStore>;

  /**
   * @returns The asset's active {@link Manifest}.
   */
  activeManifest: () => Promise<Manifest>;

  /**
   * @returns The asset's full {@link ManifestStore}.
   *
   * @deprecated Use {@link manifestStore} instead.
   */
  json: () => Promise<any>;

  /**
   * @returns The asset's manifest store as crJSON.
   */
  crJson: () => Promise<any>;

  /**
   * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
   *
   * @param uri URI of the binary object to resolve.
   * @returns A Uint8Array of the resource's bytes.
   *
   * @example Retrieving a thumbnail from the resource store:
   * ```
   * const reader = await c2pa.reader.fromBlob(blob.type, blob);
   *
   * const activeManifest = await reader.activeManifest();
   *
   * const thumbnailBuffer = await reader.resourceToBytes(activeManifest.thumbnail!.identifier);
   * ```
   */
  resourceToBytes: (uri: string) => Promise<Uint8Array<ArrayBuffer>>;

  /**
   * Dispose of this Reader, freeing the memory it occupied and preventing further use. Call this whenever the Reader is no longer needed.
   */
  free: () => Promise<void>;
}

/**
 * @param worker - Worker (via WorkerManager) to be associated with this reader factory.
 * @param settings - Optional settings to be used for all readers.
 * @returns A {@link ReaderFactory} object containing reader creation methods.
 */
export function createReaderFactory(
  worker: WorkerManager,
  settings?: Settings,
  wasm?: WebAssembly.Module
): ReaderFactory {
  const { tx } = worker;
  const baseSettings = settings;

  const registry = new FinalizationRegistry<number>(async (id) => {
    await tx.reader_free(id);
  });

  return {
    async fromBlob(
      format: string,
      blob: Blob,
      settings?: Settings
    ): Promise<Reader | null> {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      validateAssetSize(blob.size, MAX_SIZE_IN_BYTES);

      try {
        const settingsJson = await resolveSettings(baseSettings, settings);

        const readerId = await tx.reader_fromBlob(format, blob, settingsJson);

        const reader = createReader(worker, readerId, () => {
          registry.unregister(reader);
        });
        registry.register(reader, readerId, reader);

        return reader;
      } catch (e: unknown) {
        return handleReaderCreationError(e);
      }
    },

    async fromBlobFragment(
      format: string,
      init: Blob,
      fragment: Blob,
      settings?: Settings
    ) {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      validateAssetSize(init.size, MAX_SIZE_IN_BYTES);
      validateAssetSize(fragment.size, MAX_SIZE_IN_BYTES);

      try {
        const settingsJson = await resolveSettings(baseSettings, settings);

        const readerId = await tx.reader_fromBlobFragment(
          format,
          init,
          fragment,
          settingsJson
        );

        const reader = createReader(worker, readerId, () => {
          registry.unregister(reader);
        });
        registry.register(reader, readerId, reader);

        return reader;
      } catch (e: unknown) {
        return handleReaderCreationError(e);
      }
    },

    async fromUrl(
      format: string,
      url: string,
      options?: FromUrlOptions
    ): Promise<Reader | null> {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      const unsubscribe = options?.onFetch
        ? worker.onFetch(options.onFetch)
        : undefined;

      try {
        const settingsJson = await resolveSettings(baseSettings, options?.settings);

        // `discover` reads over async `fetch`, so it can run on the main thread
        // without a Web Worker; validates manifest + signature, not the data-hash.
        if (options?.mode === 'discover' && wasm) {
          ensureMainThreadWasm(wasm);
          const onFetch = options?.onFetch;
          const wasmReader = await WasmReader.fromUrl(
            format,
            url,
            settingsJson,
            onFetch
              ? (offset: number, length: number, total: number) =>
                  onFetch({ offset, length, total })
              : undefined,
            'discover'
          );
          return createMainThreadReader(wasmReader);
        }

        const readerId = await tx.reader_fromUrl(
          format,
          url,
          settingsJson,
          options?.mode
        );

        const reader = createReader(worker, readerId, () => {
          registry.unregister(reader);
        });
        registry.register(reader, readerId, reader);

        return reader;
      } catch (e: unknown) {
        return handleReaderCreationError(e);
      } finally {
        unsubscribe?.();
      }
    },

    async fromUrlFragment(
      format: string,
      initUrl: string,
      fragmentUrls: string[],
      options?: FromUrlOptions
    ): Promise<Reader | null> {
      if (!isSupportedReaderFormat(format)) {
        throw new UnsupportedFormatError(format);
      }

      const unsubscribe = options?.onFetch
        ? worker.onFetch(options.onFetch)
        : undefined;

      try {
        const settingsJson = await resolveSettings(baseSettings, options?.settings);

        const readerId = await tx.reader_fromUrlFragment(
          format,
          initUrl,
          fragmentUrls,
          settingsJson
        );

        const reader = createReader(worker, readerId, () => {
          registry.unregister(reader);
        });
        registry.register(reader, readerId, reader);

        return reader;
      } catch (e: unknown) {
        return handleReaderCreationError(e);
      } finally {
        unsubscribe?.();
      }
    }
  };
}

function handleReaderCreationError(maybeError: unknown): null {
  if (
    maybeError instanceof Error &&
    maybeError.message === 'C2pa(JumbfNotFound)'
  ) {
    return null;
  }

  throw maybeError;
}

function createReader(
  worker: WorkerManager,
  id: number,
  onFree: () => void
): Reader {
  const { tx } = worker;

  return {
    async activeLabel(): Promise<string | null> {
      const label = await tx.reader_activeLabel(id);
      return label;
    },
    async manifestStore(): Promise<ManifestStore> {
      const manifestStore = await tx.reader_manifestStore(id);
      return manifestStore;
    },
    async activeManifest(): Promise<Manifest> {
      const activeManifest = await tx.reader_activeManifest(id);

      return activeManifest;
    },
    async json(): Promise<any> {
      const json = await tx.reader_json(id);

      const manifestStore = JSON.parse(json);

      return manifestStore;
    },
    async crJson(): Promise<any> {
      const crJson = await tx.reader_crJson(id);
      return JSON.parse(crJson);
    },
    async resourceToBytes(uri: string): Promise<Uint8Array<ArrayBuffer>> {
      const buffer = await tx.reader_resourceToBytes(id, uri);
      return buffer;
    },
    async free(): Promise<void> {
      onFree();
      await tx.reader_free(id);
    }
  };
}

/** A [`Reader`] backed by a main-thread [`WasmReader`] (no worker RPC). */
function createMainThreadReader(wasmReader: WasmReader): Reader {
  return {
    async activeLabel(): Promise<string | null> {
      return wasmReader.activeLabel() ?? null;
    },
    async manifestStore(): Promise<ManifestStore> {
      return sanitizeManifestStore(wasmReader.manifestStore()) as ManifestStore;
    },
    async activeManifest(): Promise<Manifest> {
      return wasmReader.activeManifest() as Manifest;
    },
    async json(): Promise<any> {
      return JSON.parse(wasmReader.json());
    },
    async crJson(): Promise<any> {
      return JSON.parse(wasmReader.crJson());
    },
    async resourceToBytes(uri: string): Promise<Uint8Array<ArrayBuffer>> {
      return wasmReader.resourceToBytes(uri) as Uint8Array<ArrayBuffer>;
    },
    async free(): Promise<void> {
      wasmReader.free();
    }
  };
}
