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

export type {
  Actor,
  AssertionMetadata,
  AssetType,
  ClaimGeneratorInfo,
  Coordinate,
  DataSource,
  DateT,
  Frame,
  HashedUri,
  Ingredient,
  IngredientDeltaValidationResult,
  Item,
  Manifest,
  ManifestAssertion,
  ManifestAssertionKind,
  Range,
  Reader,
  RegionOfInterest,
  ResourceRef,
  ReviewRating,
  Role,
  Shape,
  SignatureInfo,
  SigningAlg,
  StatusCodes,
  Text,
  TextSelector,
  TextSelectorRange,
  Time,
  UriOrResource,
  ValidationResults,
  ValidationState,
  ValidationStatus,
} from './types/ManifestStore.js';

export type {
  AssertionDefinition,
  ManifestDefinition,
} from './types/ManifestDefinition.js';

export type {
  Builder,
  BuilderIntent,
  DigitalSourceType,
} from './types/Builder.js';

export type { Action } from './types/Action.js';
