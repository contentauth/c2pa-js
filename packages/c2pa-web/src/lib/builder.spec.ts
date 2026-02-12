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
import { getBlobForAsset } from 'test/utils.js';
import { SettingsContext } from './settings.js';

const JPEG_TEST_ASSET_PATH = 'test/assets/C.jpg';

describe('builder', () => {
  describe('creation', () => {
    describe('new', () => {
      test('should create a builder with a default manifest', async ({
        c2pa,
      }) => {
        const builder = await c2pa.builder.new();
        const definition = await builder.getDefinition();
        expect(definition).toEqual({
          assertions: [],
          claim_generator_info: [],
          format: '',
          ingredients: [],
          instance_id: '',
        });
      });

      describe('manifestDefinition', () => {
        test('should create a builder with the provided manifest definition', async ({
          c2pa,
        }) => {
          const manifestDefinition: ManifestDefinition = {
            claim_generator_info: [
              {
                name: 'c2pa-web-test',
                version: '1.0.0',
              },
            ],
            title: 'Test_Manifest',
            format: 'image/jpeg',
            instance_id: '1234',
            assertions: [],
            ingredients: [],
          };

          const builder = await c2pa.builder.fromDefinition(manifestDefinition);

          const manifestDefinitionFromBuilder = await builder.getDefinition();

          expect(manifestDefinitionFromBuilder).toEqual(manifestDefinition);
        });
      });

      describe('fromArchive', () => {
        test('should re-create a builder from an archive', async ({ c2pa }) => {
          const manifestDefinition: ManifestDefinition = {
            claim_generator_info: [
              {
                name: 'c2pa-web-test',
                version: '1.0.0',
              },
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

          expect(definitionFromArchivedBuilder).toMatchObject(manifestDefinition);
        });

        test('should re-create a builder from an archive with ingredient from blob', async ({
          c2pa,
        }) => {
          const manifestDefinition: ManifestDefinition = {
            claim_generator_info: [
              {
                name: 'c2pa-web-test',
                version: '1.0.0',
              },
            ],
            assertions: [],
            format: '',
            ingredients: [],
            instance_id: '',
          };

          const builder = await c2pa.builder.fromDefinition(manifestDefinition);

          const blob = await getBlobForAsset(JPEG_TEST_ASSET_PATH);
          const blobType = blob.type;

          const ingredient: Ingredient = {
            title: 'C.jpg',
            format: blobType,
            instance_id: 'ingredient-instance-123',
          };
          
          await builder.addIngredientFromBlob(ingredient, blob.type, blob);

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
            instance_id: 'ingredient-instance-123',
          });
        });

        test('should read builder archive with context settings', async ({
          c2pa,
        }) => {
          // Configure builder to generate C2PA archive
          const builderContext: SettingsContext = {
            builder: {
              generateC2paArchive: true,
            },
          };

          const manifestDefinition: ManifestDefinition = {
            claim_generator_info: [
              {
                name: 'c2pa-web-test',
                version: '1.0.0',
              },
            ],
            title: 'Test_Manifest',
            format: 'image/jpeg',
            assertions: [],
            ingredients: [],
            instance_id: '',
          };

          // Create builder with generateC2paArchive enabled
          const builder = await c2pa.builder.fromDefinition(
            manifestDefinition,
            builderContext
          );

          const blob = await getBlobForAsset(JPEG_TEST_ASSET_PATH);
          const blobType = blob.type;

          const ingredient: Ingredient = {
            title: 'C.jpg',
            format: blobType,
            instance_id: 'ingredient-instance-123',
          };

          await builder.addIngredientFromBlob(ingredient, blobType, blob);

          // Create C2PA archive from the builder
          const archive = await builder.toArchive();
          expect(archive).toBeDefined();
          expect(archive.byteLength).toBeGreaterThan(0);

          // Configure reader to skip verification for unsigned archive
          const readerContext: SettingsContext = {
            verify: {
              verifyAfterReading: false,
            },
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

          // Verify the manifest contains our data
          const activeManifestLabel = manifestStore.active_manifest;
          expect(activeManifestLabel).toBeDefined();

          if (activeManifestLabel) {
            const activeManifest = manifestStore.manifests[activeManifestLabel];
            expect(activeManifest?.title).toBe('Test_Manifest');
            // Verify our claim generator info is present (c2pa-rs may add its own)
            expect(activeManifest?.claim_generator_info).toEqual(
              expect.arrayContaining([
                expect.objectContaining({
                  name: 'c2pa-web-test',
                  version: '1.0.0',
                }),
              ])
            );
          }
        });
      });
    });

    describe('methods', () => {
      describe('addAction', () => {
        test('should add the provided actions', async ({ c2pa }) => {
          const builder = await c2pa.builder.new();

          await builder.addAction({
            action: 'c2pa.opened',
          });

          await builder.addAction({
            action: 'c2pa.edited',
          });

          const definition = await builder.getDefinition();

          expect(definition).toEqual({
            assertions: [
              {
                data: {
                  actions: [
                    {
                      action: 'c2pa.opened',
                    },
                    {
                      action: 'c2pa.edited',
                    },
                  ],
                },
                label: 'c2pa.actions',
              },
            ],
            claim_generator_info: [],
            format: '',
            ingredients: [],
            instance_id: '',
          });
        });
      });

      describe('addIngredient', () => {
        test('should add the provided ingredient', async ({ c2pa }) => {
          const builder = await c2pa.builder.new();

          const ingredient: Ingredient = {
            title: 'source-image.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-123',
            document_id: 'ingredient-doc-456',
          };

          await builder.addIngredient(ingredient);

          const definition = await builder.getDefinition();

          expect(definition.ingredients).toHaveLength(1);
          expect(definition.ingredients[0]).toMatchObject({
            title: 'source-image.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-123',
            document_id: 'ingredient-doc-456',
          });
        });

        test('should add multiple ingredients', async ({ c2pa }) => {
          const builder = await c2pa.builder.new();

          const ingredient1: Ingredient = {
            title: 'source-image-1.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-1',
          };

          const ingredient2: Ingredient = {
            title: 'source-image-2.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-2',
          };

          await builder.addIngredient(ingredient1);
          await builder.addIngredient(ingredient2);

          const definition = await builder.getDefinition();

          expect(definition.ingredients).toHaveLength(2);
          expect(definition.ingredients[0]).toMatchObject({
            title: 'source-image-1.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-1',
          });
          expect(definition.ingredients[1]).toMatchObject({
            title: 'source-image-2.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-2',
          });
        });

        test('should add ingredient with custom metadata', async ({ c2pa }) => {
          const builder = await c2pa.builder.new();

          const ingredient: Ingredient = {
            title: 'source-image.jpg',
            format: 'image/jpeg',
            instance_id: 'ingredient-instance-123',
            document_id: 'ingredient-doc-456',
            metadata: {
              customString: "my custom value",
              customNumber: 42,
              customBool: true,
              customObject: {
                  nested: "value",
                  count: 123
              },
              customArray: ["item1", "item2", "item3"]
            }
          };

          await builder.addIngredient(ingredient);

          const definition = await builder.getDefinition();

          expect(definition.ingredients).toHaveLength(1);
          expect(definition.ingredients[0]).toMatchObject(ingredient);
        });
      });
    });
  });
});
