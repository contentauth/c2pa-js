/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { ManifestDefinition } from '@contentauth/c2pa-types';

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
            instance_id: '',
          };

          const builder = await c2pa.builder.fromDefinition(manifestDefinition);

          const archive = await builder.toArchive();

          const builderFromArchive = await c2pa.builder.fromArchive(
            new Blob([archive])
          );

          const definitionFromArchivedBuilder =
            await builderFromArchive.getDefinition();

          expect(definitionFromArchivedBuilder).toEqual(manifestDefinition);
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
    });
  });
});
