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
export interface ManifestStore extends Reader {}

export type { Manifest } from './types/ManifestStore.js';
