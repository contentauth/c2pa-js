/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { getBlobForAsset } from 'test/utils.js';

import C_with_CAWG_data from 'test/assets/C_with_CAWG_data.jpg';
import C_with_CAWG_data_thumbnail from 'test/assets/C_with_CAWG_data_thumbnail.jpg';

describe('ingredient', () => {
  test('should omit manifestStoreBytes when not present on the source asset', async ({
    c2pa,
  }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data_thumbnail);

    const ingredientRef = await c2pa.ingredient.fromBlob(blob.type, blob);
    const snapshot = await ingredientRef.toSnapshot();

    expect(snapshot.ingredient).toBeTruthy();
    expect(snapshot.manifestStoreBytes).toBeUndefined();

    const rehydratedIngredientRef = await c2pa.ingredient.fromSnapshot(
      snapshot
    );
    const snapshotFromRehydrated = await rehydratedIngredientRef.toSnapshot();

    expect(snapshotFromRehydrated.ingredient).toEqual(snapshot.ingredient);
    expect(snapshotFromRehydrated.manifestStoreBytes).toBeUndefined();

    await ingredientRef.free();
    await rehydratedIngredientRef.free();
  });

  test('should snapshot and rehydrate an ingredient (with manifest store bytes)', async ({
    c2pa,
  }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const ingredientRef = await c2pa.ingredient.fromBlob(blob.type, blob);

    const snapshot = await ingredientRef.toSnapshot();

    expect(snapshot.ingredient).toBeTruthy();
    expect(snapshot.manifestStoreBytes).toBeInstanceOf(Uint8Array);
    expect(snapshot.manifestStoreBytes!.byteLength).toBeGreaterThan(0);

    const rehydratedIngredientRef = await c2pa.ingredient.fromSnapshot(
      snapshot
    );
    const snapshotFromRehydrated = await rehydratedIngredientRef.toSnapshot();

    expect(snapshotFromRehydrated.ingredient).toEqual(snapshot.ingredient);
    expect(snapshotFromRehydrated.manifestStoreBytes).toEqual(
      snapshot.manifestStoreBytes
    );

    await ingredientRef.free();
    await rehydratedIngredientRef.free();
  });

  test('builder.addIngredientFromRef should accept an IngredientRef and relationship', async ({
    c2pa,
  }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const ingredientRef = await c2pa.ingredient.fromBlob(blob.type, blob);

    const builder = await c2pa.builder.new();
    await builder.addIngredientFromRef(ingredientRef, 'componentOf');

    const definition = await builder.getDefinition();

    expect(definition.ingredients).toBeDefined();
    expect(definition.ingredients!).toHaveLength(1);
    expect(definition.ingredients![0]).toHaveProperty(
      'relationship',
      'componentOf'
    );

    await ingredientRef.free();
    await builder.free();
  });

  test('builder.addIngredientFromRef should work with a rehydrated IngredientRef', async ({
    c2pa,
  }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const ingredientRef = await c2pa.ingredient.fromBlob(blob.type, blob);
    const snapshot = await ingredientRef.toSnapshot();
    const rehydratedIngredientRef = await c2pa.ingredient.fromSnapshot(
      snapshot
    );

    const builder = await c2pa.builder.new();
    await builder.addIngredientFromRef(rehydratedIngredientRef, 'componentOf');

    const definition = await builder.getDefinition();

    expect(definition.ingredients).toBeDefined();
    expect(definition.ingredients!).toHaveLength(1);
    expect(definition.ingredients![0]).toHaveProperty(
      'relationship',
      'componentOf'
    );

    await ingredientRef.free();
    await rehydratedIngredientRef.free();
    await builder.free();
  });

  test('should be freeable', async ({ c2pa }) => {
    const blob = await getBlobForAsset(C_with_CAWG_data);

    const ingredientRef = await c2pa.ingredient.fromBlob(blob.type, blob);

    await ingredientRef.free();

    await expect(ingredientRef.toSnapshot()).rejects.toThrowError();
  });
});
