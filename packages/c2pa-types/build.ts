#!/usr/bin/env zx

/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { $, fs, path } from 'zx';
import { compileFromFile } from 'json-schema-to-typescript';

const typesDir = './types';
const schemasDir = './schemas';

// Clean output
await fs.emptyDir(typesDir);
await fs.emptyDir(schemasDir);

// Generate json schema
await $`cargo run`;

const schemaPaths = await fs.readdir(schemasDir);

// Compile schemas to TS files
for (const schemaPath of schemaPaths) {
  const schemaName = schemaPath.split('.')[0];
  const resolvedPath = path.join(schemasDir, schemaPath);
  const outputPath = path.join(typesDir, `${schemaName}.ts`);

  const compiled = await compileFromFile(resolvedPath);
  await fs.writeFile(outputPath, compiled);
}

// Run tsc to typecheck + generate final output
await $`tsc`;
