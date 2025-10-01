/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { WorkerManager } from './worker/workerManager.js';
import { getSerializablePayload, type Signer } from './signer.js';
import type { Ingredient, ManifestDefinition } from '@contentauth/c2pa-types';

/**
 * Functions that permit the creation of Builder objects.
 */
export interface BuilderFactory {
  /**
   * Create a {@link Builder} from a {@link ManifestDefinition}.
   *
   * @param definition The {@link ManifestDefinition} to be used as the builder's initial state.
   * @returns A {@link Builder} object.
   */
  fromDefinition: (definition: ManifestDefinition) => Promise<Builder>;
}

/**
 * Exposes methods for building C2PA manifests and signing assets.
 */
export interface Builder {
  /**
   * Sets the remote URL for a remote manifest. The manifest is expected to be available at this location.
   *
   * @param url URL pointing to the location the remote manifest will be stored.
   */
  setRemoteUrl: (url: string) => Promise<void>;

  /**
   * Sets the state of the no_embed flag. To skip embedding a manifest (e.g. for the remote-only case) set this to `true`.
   *
   * @param noEmbed Value to set the no_embed flag.
   * @returns
   */
  setNoEmbed: (noEmbed: boolean) => Promise<void>;

  /**
   * Set a thumbnail from a blob to be included in the manifest. The blob should represent the asset being signed.
   *
   * @param format Format of the thumbnail
   * @param blob Blob of the thumbnail bytes
   */
  setThumbnailFromBlob: (format: string, blob: Blob) => Promise<void>;

  /**
   * Add an ingredient to the builder from a definition, format, and blob.
   * Values specified in the ingredient definition will be merged with the ingredient, and these values take precendence.
   *
   * @param ingredientDefinition Ingredient definition.
   * @param format Format of the ingredient.
   * @param blob Blob of the ingredient's bytes.
   */
  addIngredientFromBlob: (
    ingredientDefinition: Ingredient,
    format: string,
    blob: Blob
  ) => Promise<void>;

  /**
   *  Add a resource to the builder's resource store with an ID and blob of the resource's bytes.
   * @param resourceId ID associated with the resource being added.
   * @param blob Blob of the resource's bytes.
   */
  addResourceFromBlob: (resourceId: string, blob: Blob) => Promise<void>;

  /**
   * Gets the current manifest definition held by the builder.
   *
   * @returns The {@link ManifestDefinition} held by the builder.
   */
  getDefinition: () => Promise<ManifestDefinition>;

  /**
   * Sign an asset.
   *
   * @todo Docs coming soon
   */
  sign: (signer: Signer, format: string, blob: Blob) => Promise<Uint8Array>;

  /**
   * Dispose of this Builder, freeing the memory it occupied and preventing further use. Call this whenever the Builder is no longer needed.
   */
  free: () => Promise<void>;
}

/**
 * @param worker - Worker (via WorkerManager) to be associated with this reader factory.
 * @returns A {@link BuilderFactory} object containing builder creation methods.
 */
export function createBuilderFactory(worker: WorkerManager): BuilderFactory {
  const { tx } = worker;

  const registry = new FinalizationRegistry<number>((id) => {
    tx.builder_free(id);
  });

  return {
    async fromDefinition(definition: ManifestDefinition) {
      const json = JSON.stringify(definition);
      const builderId = await tx.builder_fromJson(json);

      const builder = createBuilder(worker, builderId, () => {
        registry.unregister(builder);
      });
      registry.register(builder, builderId, builder);

      return builder;
    },
  };
}

function createBuilder(
  worker: WorkerManager,
  id: number,
  onFree: () => void
): Builder {
  const { tx } = worker;

  return {
    async setRemoteUrl(url) {
      await tx.builder_setRemoteUrl(id, url);
    },

    async setNoEmbed(noEmbed) {
      await tx.builder_setNoEmbed(id, noEmbed);
    },

    async setThumbnailFromBlob(format, blob) {
      await tx.builder_setThumbnailFromBlob(id, format, blob);
    },

    async addIngredientFromBlob(
      ingredientDefinition: Ingredient,
      format: string,
      blob: Blob
    ) {
      const json = JSON.stringify(ingredientDefinition);
      await tx.builder_addIngredientFromBlob(id, json, format, blob);
    },

    async addResourceFromBlob(resourceId: string, blob: Blob) {
      await tx.builder_addResourceFromBlob(id, resourceId, blob);
    },

    async getDefinition(): Promise<ManifestDefinition> {
      const definition = await tx.builder_getDefinition(id);

      return definition;
    },

    async sign(
      signer: Signer,
      format: string,
      blob: Blob
    ): Promise<Uint8Array> {
      const payload = await getSerializablePayload(signer);
      const requestId = worker.registerSignReceiver(signer.sign);

      const result = await tx.builder_sign(
        id,
        requestId,
        payload,
        format,
        blob
      );

      return result;
    },

    async free() {
      onFree();
      await tx.builder_free(id);
    },
  };
}
