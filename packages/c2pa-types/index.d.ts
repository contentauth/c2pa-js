/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import type { Reader } from './types/ManifestStore.js';

// Renames the auto-generated "Reader" type to the more appropriate "ManifestStore"
// eslint-disable-next-line @typescript-eslint/no-empty-interface, @typescript-eslint/no-empty-object-type
export interface ManifestStore extends Reader {}

export type * from './types/ManifestStore.js';
export type * from './types/ManifestDefinition.js';
export type * from './types/Ingredient.js';
export type * from './types/Builder.js';
