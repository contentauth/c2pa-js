/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Ingredient as IngredientDefinition } from '@contentauth/c2pa-types';

import type { WorkerManager } from './worker/workerManager.js';

/**
 * Factory for creating {@link IngredientRef} objects from assets or snapshots.
 */
export interface IngredientFactory {
  /**
   * Create an Ingredient from an asset file.
   *
   * @param format MIME type of the asset (e.g., 'image/jpeg').
   * @param blob The asset's bytes.
   */
  fromBlob: (format: string, blob: Blob) => Promise<IngredientRef>;

  /**
   * Rehydrate an Ingredient from a previously saved snapshot.
   *
   * @param snapshot A snapshot previously obtained from {@link IngredientRef.toSnapshot}.
   */
  fromSnapshot: (snapshot: IngredientSnapshot) => Promise<IngredientRef>;
}

/**
 * A serializable representation of an ingredient that can be persisted and later
 * restored via {@link IngredientFactory.fromSnapshot}.
 */
export interface IngredientSnapshot {
  /** The ingredient metadata. */
  ingredient: IngredientDefinition;
  /** The embedded C2PA manifest store bytes (JUMBF), if present on the source asset. */
  manifestStoreBytes?: Uint8Array;
}

/**
 * A handle to an ingredient in WASM memory. Must be freed when no longer needed.
 */
export interface IngredientRef {
  /**
   * Serialize this ingredient into a snapshot suitable for persistence.
   *
   * `manifestStoreBytes` will be omitted if no embedded manifest store exists on the source asset.
   */
  toSnapshot: () => Promise<IngredientSnapshot>;

  /**
   * Dispose of this Ingredient, freeing the memory it occupied and preventing further use.
   */
  free: () => Promise<void>;
}

export function createIngredientFactory(
  worker: WorkerManager
): IngredientFactory {
  const { tx } = worker;

  const registry = new FinalizationRegistry<number>((id) => {
    tx.ingredient_free(id);
  });

  return {
    async fromBlob(format: string, blob: Blob) {
      const ingredientId = await tx.ingredient_fromBlob(format, blob);

      const ingredient = createIngredient(worker, ingredientId, () => {
        registry.unregister(ingredient);
      });
      registry.register(ingredient, ingredientId, ingredient);

      return ingredient;
    },

    async fromSnapshot(snapshot: IngredientSnapshot) {
      const ingredientJson = JSON.stringify(snapshot.ingredient);
      const ingredientId = await tx.ingredient_fromJsonAndManifestStore(
        ingredientJson,
        snapshot.manifestStoreBytes
      );

      const ingredient = createIngredient(worker, ingredientId, () => {
        registry.unregister(ingredient);
      });
      registry.register(ingredient, ingredientId, ingredient);

      return ingredient;
    },
  };
}

function createIngredient(
  worker: WorkerManager,
  id: number,
  onFree: () => void
): IngredientRef {
  const { tx } = worker;

  return {
    async toSnapshot(): Promise<IngredientSnapshot> {
      const json = await tx.ingredient_toJson(id);
      const ingredient = JSON.parse(json) as IngredientDefinition;

      const manifestStoreBytes = await tx.ingredient_manifestStoreBytes(id);

      return {
        ingredient,
        manifestStoreBytes: manifestStoreBytes ?? undefined,
      };
    },

    async free(): Promise<void> {
      onFree();
      await tx.ingredient_free(id);
    },
  };
}
