/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { ManifestDefinition, Ingredient } from '@contentauth/c2pa-types';
import { getBlobForAsset, createTestSigner } from 'test/utils.js';
import { Settings } from './settings.js';
import { createC2pa } from './c2pa.js';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

import C_JPG from 'test/assets/C.jpg';
import PirateShip_cloud from 'test/assets/PirateShip_save_credentials_to_cloud.jpg';
import C_with_CAWG_data from 'test/assets/C_with_CAWG_data.jpg';
import SAMPLE1_JXL from 'test/assets/sample1.jxl';

describe('builder', () => {
  describe('creation', () => {
    describe('new', () => {
      test('should create a builder with a default manifest', async ({
        c2pa
      }) => {
        const builder = await c2pa.builder.new();
        const definition = await builder.getDefinition();
        expect(definition).toEqual({
          assertions: [],
          format: '',
          ingredients: [],
          instance_id: ''
        });
      });

      test('should use local "context" settings when provided', async () => {
        const settings: Settings = {
          verify: {
            verifyTrust: false
          }
        };

        const overrideSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings });

        const builder = await c2pa.builder.new(overrideSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          );

        expect(ingredientFailureCodes).toContain('signingCredential.untrusted');
      });

      test('should inherit global settings when per-call settings are provided', async () => {
        // Global settings enable trust verification.
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        // Per-call settings touch an unrelated key only.
        const perCallSettings: Settings = {
          builder: {
            generateC2paArchive: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const builder = await c2pa.builder.new(perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        // Trust verification from globalSettings should still be in effect, so the
        // results should report untrusted.
        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          );

        expect(ingredientFailureCodes).toContain('signingCredential.untrusted');

        c2pa.dispose();
      });

      test('should allow per-call settings to override conflicting global settings', async () => {
        // Global settings enable trust verification.
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        // Per-call settings disable trust verification and should override the global setting.
        const perCallSettings: Settings = {
          verify: {
            verifyTrust: false
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const builder = await c2pa.builder.new(perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          ) ?? [];

        // Per-call settings should overwrite, so no trust failure should be reported.
        expect(ingredientFailureCodes).not.toContain('signingCredential.untrusted');

        c2pa.dispose();
      });
    });

    describe('fromDefinition', () => {
      test('should inherit global settings when per-call settings are provided', async () => {
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        const perCallSettings: Settings = {
          builder: {
            generateC2paArchive: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const builder = await c2pa.builder.fromDefinition({}, perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          );

        // Global settings are configured to verify trust, so the result should be untrusted.
        expect(ingredientFailureCodes).toContain('signingCredential.untrusted');

        c2pa.dispose();
      });

      test('should allow per-call settings to override conflicting global settings', async () => {
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        const perCallSettings: Settings = {
          verify: {
            verifyTrust: false
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const builder = await c2pa.builder.fromDefinition({}, perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          ) ?? [];

        // Per-call settings should overwrite and not do trust verification, so the result should be trusted
        expect(ingredientFailureCodes).not.toContain('signingCredential.untrusted');

        c2pa.dispose();
      });
    });

    describe('manifestDefinition', () => {
      test('should create a builder with the provided manifest definition', async ({
        c2pa
      }) => {
        const manifestDefinition: ManifestDefinition = {
          claim_generator_info: [
            {
              name: 'c2pa-web-test',
              version: '1.0.0'
            }
          ],
          title: 'Test_Manifest',
          format: 'image/jpeg',
          instance_id: '1234',
          assertions: [],
          ingredients: []
        };

        const builder = await c2pa.builder.fromDefinition(manifestDefinition);

        const manifestDefinitionFromBuilder = await builder.getDefinition();

        expect(manifestDefinitionFromBuilder).toEqual(manifestDefinition);
      });
    });

    describe('fromArchive', () => {
      test('should inherit global settings when per-call settings are provided', async () => {
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        const perCallSettings: Settings = {
          builder: {
            generateC2paArchive: true
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        // Build and serialise an archive to restore from.
        const archive = await (await c2pa.builder.new()).toArchive();

        const builder = await c2pa.builder.fromArchive(new Blob([archive]), perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          );

        expect(ingredientFailureCodes).toContain('signingCredential.untrusted');

        c2pa.dispose();
      });

      test('should allow per-call settings to override conflicting global settings', async () => {
        const globalSettings: Settings = {
          verify: {
            verifyTrust: true
          }
        };

        const perCallSettings: Settings = {
          verify: {
            verifyTrust: false
          }
        };

        const c2pa = await createC2pa({ wasmSrc, settings: globalSettings });

        const archive = await (await c2pa.builder.new()).toArchive();

        const builder = await c2pa.builder.fromArchive(new Blob([archive]), perCallSettings);

        const blob = await getBlobForAsset(C_JPG);

        await builder.addIngredientFromBlob({}, blob.type, blob);

        const definition = await builder.getDefinition();

        const ingredientFailureCodes =
          definition.ingredients?.[0].validation_results?.activeManifest?.failure.map(
            (entry) => entry.code
          ) ?? [];

        expect(ingredientFailureCodes).not.toContain('signingCredential.untrusted');

        c2pa.dispose();
      });

      test('should re-create a builder from an archive', async ({ c2pa }) => {
        const manifestDefinition: ManifestDefinition = {
          claim_generator_info: [
            {
              name: 'c2pa-web-test',
              version: '1.0.0'
            }
          ],
          assertions: [],
          format: '',
          ingredients: [],
          instance_id: ''
        };

        const builder = await c2pa.builder.fromDefinition(manifestDefinition);

        const archive = await builder.toArchive();

        const builderFromArchive = await c2pa.builder.fromArchive(
          new Blob([archive])
        );

        const definitionFromArchivedBuilder =
          await builderFromArchive.getDefinition();

        const manifestDefinitionWithoutAssertions = { ...manifestDefinition };
        delete manifestDefinitionWithoutAssertions.assertions;
        expect(definitionFromArchivedBuilder).toMatchObject(
          manifestDefinitionWithoutAssertions
        );
      });

      test('should re-create a builder from an archive with ingredient from blob', async ({
        c2pa
      }) => {
        const manifestDefinition: ManifestDefinition = {
          claim_generator_info: [
            {
              name: 'c2pa-web-test',
              version: '1.0.0'
            }
          ],
          assertions: [],
          format: '',
          ingredients: [],
          instance_id: ''
        };

        const builder = await c2pa.builder.fromDefinition(manifestDefinition);

        const blob = await getBlobForAsset(C_JPG);
        const blobType = blob.type;

        const ingredient: Ingredient = {
          title: 'C.jpg',
          format: blobType,
          instance_id: 'ingredient-instance-123'
        };

        await builder.addIngredientFromBlob(ingredient, blobType, blob);

        const archive = await builder.toArchive();

        const builderFromArchive = await c2pa.builder.fromArchive(
          new Blob([archive])
        );

        const definitionFromArchivedBuilder =
          await builderFromArchive.getDefinition();

        expect(definitionFromArchivedBuilder.ingredients).toHaveLength(1);
        expect(definitionFromArchivedBuilder.ingredients![0]).toMatchObject({
          title: 'C.jpg',
          format: blobType,
          instance_id: 'ingredient-instance-123'
        });
      });

      test('should create a readable archive', async ({ c2pa }) => {
        const manifestDefinition: ManifestDefinition = {
          claim_generator_info: [
            {
              name: 'c2pa-web-test',
              version: '1.0.0'
            }
          ],
          title: 'Test_Manifest',
          format: 'image/jpeg',
          assertions: [],
          ingredients: [],
          instance_id: ''
        };

        // Create builder with generateC2paArchive enabled
        const builder = await c2pa.builder.fromDefinition(manifestDefinition);

        const blob = await getBlobForAsset(C_JPG);
        const blobType = blob.type;

        const ingredient: Ingredient = {
          title: 'C.jpg',
          format: blobType,
          instance_id: 'ingredient-instance-123'
        };

        await builder.addIngredientFromBlob(ingredient, blobType, blob);

        // Create C2PA archive from the builder
        const archive = await builder.toArchive();
        expect(archive).toBeDefined();
        expect(archive.byteLength).toBeGreaterThan(0);

        // Configure reader to skip verification for unsigned archive
        const readerContext: Settings = {
          verify: {
            verifyAfterReading: false
          }
        };

        // Read the C2PA archive with Reader using application/c2pa format
        const archiveBlob = new Blob([archive]);
        const reader = await c2pa.reader.fromBlob(
          'application/c2pa',
          archiveBlob,
          readerContext
        );

        expect(reader).not.toBeNull();
        expect(reader).toBeDefined();

        // Verify we can read the manifest from the archive
        const manifestStore = await reader!.manifestStore();
        expect(manifestStore).toBeDefined();
        expect(manifestStore.manifests).toBeDefined();

        const activeManifest = await reader!.activeManifest();

        // Verify the manifest contains our data
        expect(activeManifest.title).toEqual(manifestDefinition.title);
        expect(activeManifest.claim_generator_info).toMatchObject(
          manifestDefinition.claim_generator_info!
        );

        const activeManifestLabel = manifestStore.active_manifest;
        expect(activeManifestLabel).toBeDefined();
      });
    });
  });

  describe('methods', () => {
    describe('addAction', () => {
      test('should add the provided actions', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();

        await builder.addAction({
          action: 'c2pa.opened'
        });

        await builder.addAction({
          action: 'c2pa.edited'
        });

        const definition = await builder.getDefinition();

        expect(definition).toEqual({
          assertions: [
            {
              data: {
                actions: [
                  {
                    action: 'c2pa.opened'
                  },
                  {
                    action: 'c2pa.edited'
                  }
                ]
              },
              label: 'c2pa.actions.v2'
            }
          ],
          format: '',
          ingredients: [],
          instance_id: ''
        });
      });
    });

    describe('addRedaction', () => {
      test('should redact a thumbnail from an ingredient manifest', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        const originalReader = await c2pa.reader.fromBlob('image/jpeg', blob);
        const parentLabel = await originalReader!.activeLabel();

        const originalManifest = await originalReader!.activeManifest();
        expect(originalManifest.thumbnail).toBeDefined();
        expect(originalManifest.thumbnail).not.toBeNull();

        const thumbnailUri = `self#jumbf=/c2pa/${parentLabel}/c2pa.assertions/c2pa.thumbnail.claim`;

        const builder = await c2pa.builder.new();
        await builder.setIntent('edit');
        await builder.addRedaction(thumbnailUri, 'c2pa.PII.present');

        const signer = await createTestSigner();
        const signedBytes = await builder.sign(signer, 'image/jpeg', blob);

        const readerSettings: Settings = {
          verify: { verifyAfterReading: false }
        };
        const signedReader = await c2pa.reader.fromBlob(
          'image/jpeg',
          new Blob([signedBytes], { type: 'image/jpeg' }),
          readerSettings
        );

        const manifestStore = await signedReader!.manifestStore();
        const parentManifest = manifestStore.manifests![parentLabel!];
        expect(parentManifest.thumbnail).toBeUndefined();
      });

      test('should redact an assertion from an ingredient manifest', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(C_with_CAWG_data);

        // Read the original image to get its active manifest label
        const originalReader = await c2pa.reader.fromBlob('image/jpeg', blob);
        const parentLabel = await originalReader!.activeLabel();
        expect(parentLabel).toBeDefined();

        // C_with_CAWG_data.jpg has 3 assertions: c2pa.actions.v2, cawg.training-mining, cawg.identity
        const originalStore = await originalReader!.manifestStore();
        const originalLabels = originalStore.manifests![parentLabel!].assertions!.map(
          (a) => a.label
        );
        expect(originalLabels).toContain('cawg.training-mining');

        // Construct JUMBF URI for the assertion to redact
        const redactionUri = `self#jumbf=/c2pa/${parentLabel}/c2pa.assertions/cawg.training-mining`;

        const builder = await c2pa.builder.new();
        await builder.setIntent('edit');
        await builder.addRedaction(redactionUri, 'c2pa.PII.present');

        const signer = await createTestSigner();
        const signedBytes = await builder.sign(signer, 'image/jpeg', blob);

        const readerSettings: Settings = {
          verify: { verifyAfterReading: false }
        };
        const signedReader = await c2pa.reader.fromBlob(
          'image/jpeg',
          new Blob([signedBytes], { type: 'image/jpeg' }),
          readerSettings
        );
        expect(signedReader).not.toBeNull();

        const activeManifest = await signedReader!.activeManifest();
        expect(activeManifest.ingredients).toHaveLength(1);

        const manifestStore = await signedReader!.manifestStore();
        const parentManifest = manifestStore.manifests![parentLabel!];
        expect(parentManifest).toBeDefined();

        const assertionLabels = parentManifest.assertions!.map((a) => a.label);
        expect(assertionLabels).not.toContain('cawg.training-mining');
        expect(assertionLabels).toContain('c2pa.actions.v2');
        expect(assertionLabels).toContain('cawg.identity');
      });
    });

    describe('addIngredient', () => {
      test('should add the provided ingredient', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();

        const ingredient: Ingredient = {
          title: 'source-image.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-123',
          document_id: 'ingredient-doc-456'
        };

        await builder.addIngredient(ingredient);

        const definition = await builder.getDefinition();

        expect(definition.ingredients).toHaveLength(1);
        expect(definition.ingredients?.[0]).toMatchObject({
          title: 'source-image.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-123',
          document_id: 'ingredient-doc-456'
        });
      });

      test('should add multiple ingredients', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();

        const ingredient1: Ingredient = {
          title: 'source-image-1.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-1'
        };

        const ingredient2: Ingredient = {
          title: 'source-image-2.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-2'
        };

        await builder.addIngredient(ingredient1);
        await builder.addIngredient(ingredient2);

        const definition = await builder.getDefinition();

        expect(definition.ingredients).toHaveLength(2);
        expect(definition.ingredients?.[0]).toMatchObject({
          title: 'source-image-1.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-1'
        });
        expect(definition.ingredients?.[1]).toMatchObject({
          title: 'source-image-2.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-2'
        });
      });

      test('should add ingredient from blob and archive for cloud-only file', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(PirateShip_cloud);

        const builder = await c2pa.builder.new();

        const ingredient: Ingredient = {
          relationship: 'parentOf',
          title: 'PirateShip_cloud',
          format: blob.type
        };

        // addIngredientFromBlob can fetch remote manifests,
        await builder.addIngredientFromBlob(ingredient, blob.type, blob);

        // Verify the remote manifest was fetched: the ingredient should have
        // both activeManifest and validationResults present.
        const definition = await builder.getDefinition();
        expect(definition.ingredients).toHaveLength(1);
        const addedIngredient = definition.ingredients![0];
        expect(addedIngredient.active_manifest).toBeDefined();
        expect(addedIngredient.validation_results).toBeDefined();
      });

      test('should add ingredient with custom metadata', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();

        const ingredient: Ingredient = {
          title: 'source-image.jpg',
          format: 'image/jpeg',
          instance_id: 'ingredient-instance-123',
          document_id: 'ingredient-doc-456',
          metadata: {
            customString: 'my custom value',
            customNumber: 42,
            customBool: true,
            customObject: {
              nested: 'value',
              count: 123
            },
            customArray: ['item1', 'item2', 'item3']
          }
        };

        await builder.addIngredient(ingredient);

        const definition = await builder.getDefinition();

        expect(definition.ingredients).toHaveLength(1);
        expect(definition.ingredients?.[0]).toMatchObject(ingredient);
      });
    });

    describe('filterActions', () => {
      test('invokes the predicate for each action and honors its return', async ({
        c2pa
      }) => {
        const builder = await c2pa.builder.new();
        await builder.addAction({ action: 'c2pa.created' });
        await builder.addAction({ action: 'c2pa.edited' });
        await builder.addAction({ action: 'c2pa.color_adjustments' });

        const seen: string[] = [];
        await builder.filterActions((action) => {
          seen.push(action.action);
          return action.action !== 'c2pa.color_adjustments';
        });

        // The binding enumerated every action and passed it to the predicate.
        expect(seen).toEqual([
          'c2pa.created',
          'c2pa.edited',
          'c2pa.color_adjustments'
        ]);

        // The predicate's return value decided what survives.
        const definition = await builder.getDefinition();
        const actionsAssertion = definition.assertions?.find((a) =>
          a.label.startsWith('c2pa.actions')
        );
        const names = (
          actionsAssertion?.data as { actions: { action: string }[] }
        ).actions.map((a) => a.action);
        expect(names).toContain('c2pa.created');
        expect(names).toContain('c2pa.edited');
        expect(names).not.toContain('c2pa.color_adjustments');
      });

      test('surfaces an error thrown by the predicate', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();
        await builder.addAction({ action: 'c2pa.created' });
        await builder.addAction({ action: 'c2pa.edited' });

        await expect(
          builder.filterActions(() => {
            throw new Error('boom from predicate');
          })
        ).rejects.toThrow('boom from predicate');
      });
    });

    describe('filterIngredients', () => {
      test('invokes the predicate and prunes ingredients it does not rescue', async ({
        c2pa
      }) => {
        const builder = await c2pa.builder.new();
        await builder.addAction({ action: 'c2pa.created' });
        await builder.addIngredient({
          title: 'orphan',
          format: 'image/jpeg',
          instance_id: 'orphan-1',
          relationship: 'componentOf'
        });

        const seen: (string | null | undefined)[] = [];
        // Rescue nothing, so the orphan should be pruned.
        await builder.filterIngredients((ingredient) => {
          seen.push(ingredient.title);
          return false;
        });

        // The binding passed the ingredient to the predicate.
        expect(seen).toEqual(['orphan']);

        const definition = await builder.getDefinition();
        expect(definition.ingredients ?? []).toHaveLength(0);
      });

      test('surfaces an error thrown by the predicate', async ({ c2pa }) => {
        const builder = await c2pa.builder.new();
        await builder.addAction({ action: 'c2pa.created' });
        await builder.addIngredient({
          title: 'orphan',
          format: 'image/jpeg',
          relationship: 'componentOf'
        });

        await expect(
          builder.filterIngredients(() => {
            throw new Error('ingredient boom');
          })
        ).rejects.toThrow('ingredient boom');
      });
    });

    describe('sign JXL file, then read it back', () => {
      test('should sign a jxl asset and read back the signed result', async ({
        c2pa
      }) => {
        const blob = await getBlobForAsset(SAMPLE1_JXL);

        const jxlMimetype = 'image/jxl';

        const builder = await c2pa.builder.new();
        const signer = await createTestSigner();
        const signedBytes = await builder.sign(signer, jxlMimetype, blob);

        expect(signedBytes).toBeDefined();
        expect(signedBytes.byteLength).toBeGreaterThan(0);

        const readerSettings: Settings = {
          verify: { verifyAfterReading: false }
        };
        const reader = await c2pa.reader.fromBlob(
          jxlMimetype,
          new Blob([signedBytes], { type: jxlMimetype }),
          readerSettings
        );

        expect(reader).not.toBeNull();

        const manifestStore = await reader!.manifestStore();
        expect(manifestStore).toBeDefined();
        expect(manifestStore.manifests).toBeDefined();
        expect(manifestStore.active_manifest).toBeDefined();
      });
    });
  });
});
