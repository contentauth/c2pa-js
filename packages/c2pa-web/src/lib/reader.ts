/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { Manifest, ManifestStore } from '@contentauth/c2pa-types';
import { UnsupportedFormatError } from './error.js';
import { isSupportedReaderFormat } from './supportedFormats.js';
import type { C2pa } from './c2pa.js';
import type { WorkerManager } from './worker/workerManager.js';
import { Context, validateAssetSize } from '@contentauth/c2pa-utilities';

// 1 GB
export const MAX_SIZE_IN_BYTES = 10 ** 9;

// Module-level registry for garbage collection
const registry = new FinalizationRegistry<{ worker: WorkerManager; id: number }>(
  async ({ worker, id }) => {
    await worker.tx.reader_free(id);
  }
);

/**
 * The `Reader` class supports reading C2PA data out of an asset.
 *
 * @example Getting an asset's active manifest:
 * ```
 * const reader = await Reader.fromBlob(c2pa, blob.type, blob);
 * const activeManifest = await reader.activeManifest();
 * ```
 */
export class Reader {
  // Native private fields, which are inaccessible from outside the class at runtime.
  // These properties cannot leak and will not appear if the reader object is logged
  // or serialized.
  #worker: WorkerManager;
  #id: number;

  private constructor(worker: WorkerManager, id: number) {
    this.#worker = worker;
    this.#id = id;
  }

  /**
   * Create a {@link Reader} from an asset's format and a blob of its bytes.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this reader on.
   * @param format Asset format.
   * @param blob Blob of asset bytes.
   * @param context Optional `Context` configuring this reader's behavior.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   * @throws If the specified format is not supported, or if the asset is too large.
   */
  static async fromBlob(
    c2pa: C2pa,
    format: string,
    blob: Blob,
    context: Context = new Context()
  ): Promise<Reader | null> {
    if (!isSupportedReaderFormat(format)) {
      throw new UnsupportedFormatError(format);
    }

    validateAssetSize(blob.size, MAX_SIZE_IN_BYTES);

    try {
      const settingsJson = await context.toJson();
      const { worker } = c2pa;

      const readerId = await worker.tx.reader_fromBlob(format, blob, settingsJson);

      const reader = new Reader(worker, readerId);
      registry.register(reader, { worker, id: readerId }, reader);

      return reader;
    } catch (e: unknown) {
      return handleReaderCreationError(e);
    }
  }

  /**
   * Create a {@link Reader} from an initial fragment and a subsequent fragment.
   *
   * @param c2pa The `C2pa` instance (from {@link createC2pa}) to create this reader on.
   * @param format Asset format.
   * @param init Blob of initial fragment bytes.
   * @param fragment Blob of fragment bytes.
   * @param context Optional `Context` configuring this reader's behavior.
   * @returns A {@link Reader} object or null if no C2PA metadata was found.
   * @throws If the specified format is not supported, or if the asset is too large.
   */
  static async fromBlobFragment(
    c2pa: C2pa,
    format: string,
    init: Blob,
    fragment: Blob,
    context: Context = new Context()
  ): Promise<Reader | null> {
    if (!isSupportedReaderFormat(format)) {
      throw new UnsupportedFormatError(format);
    }

    validateAssetSize(init.size, MAX_SIZE_IN_BYTES);
    validateAssetSize(fragment.size, MAX_SIZE_IN_BYTES);

    try {
      const settingsJson = await context.toJson();
      const { worker } = c2pa;

      const readerId = await worker.tx.reader_fromBlobFragment(
        format,
        init,
        fragment,
        settingsJson
      );

      const reader = new Reader(worker, readerId);
      registry.register(reader, { worker, id: readerId }, reader);

      return reader;
    } catch (e: unknown) {
      return handleReaderCreationError(e);
    }
  }

  /**
   * @returns The label of the active manifest.
   */
  async activeLabel(): Promise<string | null> {
    const label = await this.#worker.tx.reader_activeLabel(this.#id);
    return label;
  }

  /**
   * @returns The asset's full {@link ManifestStore} containing all its manifests, validation statuses, and the URI of the active manifest.
   */
  async manifestStore(): Promise<ManifestStore> {
    const manifestStore = await this.#worker.tx.reader_manifestStore(this.#id);
    return manifestStore;
  }

  /**
   * @returns The asset's active {@link Manifest}.
   */
  async activeManifest(): Promise<Manifest> {
    const activeManifest = await this.#worker.tx.reader_activeManifest(this.#id);
    return activeManifest;
  }

  /**
   * @returns The asset's full {@link ManifestStore}.
   *
   * @deprecated Use {@link manifestStore} instead.
   */
  async json(): Promise<any> {
    const json = await this.#worker.tx.reader_json(this.#id);
    return JSON.parse(json);
  }

  /**
   * @returns The asset's manifest store as crJSON.
   */
  async crJson(): Promise<any> {
    const crJson = await this.#worker.tx.reader_crJson(this.#id);
    return JSON.parse(crJson);
  }

  /**
   * Resolves a URI reference to a binary object (e.g. a thumbnail) in the resource store.
   *
   * @param uri URI of the binary object to resolve.
   * @returns A Uint8Array of the resource's bytes.
   *
   * @example Retrieving a thumbnail from the resource store:
   * ```
   * const reader = await Reader.fromBlob(c2pa, blob.type, blob);
   *
   * const activeManifest = await reader.activeManifest();
   *
   * const thumbnailBuffer = await reader.resourceToBytes(activeManifest.thumbnail!.identifier);
   * ```
   */
  async resourceToBytes(uri: string): Promise<Uint8Array<ArrayBuffer>> {
    const buffer = await this.#worker.tx.reader_resourceToBytes(this.#id, uri);
    return buffer;
  }

  /**
   * Dispose of this Reader, freeing the memory it occupied and preventing further use.
   * Call this whenever the Reader is no longer needed.
   */
  async free(): Promise<void> {
    registry.unregister(this);
    await this.#worker.tx.reader_free(this.#id);
  }
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
