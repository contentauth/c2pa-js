/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, expect, test } from 'vitest';
import { sanitizeManifestStore } from './sanitizeManifestStore.js';

describe('sanitizeManifestStore', () => {
  test('returns the store unchanged when store is nullish', () => {
    expect(sanitizeManifestStore(null)).toBeNull();
    expect(sanitizeManifestStore(undefined)).toBeUndefined();
  });

  test('rebuilds manifests as a null-prototype object for normal labels', () => {
    const manifest = { title: 'test' };
    const store = {
      active_manifest: 'urn:c2pa:abc',
      manifests: { 'urn:c2pa:abc': manifest }
    };

    const result = sanitizeManifestStore(store);

    expect(Object.getPrototypeOf(result.manifests)).toBeNull();
    expect(result.manifests['urn:c2pa:abc']).toBe(manifest);
  });

  test('recovers a manifest displaced into the prototype chain by a "__proto__" label', () => {
    // Simulate what serde_wasm_bindgen produces when a HashMap key is "__proto__":
    // bracket assignment triggers [[SetPrototypeOf]] instead of creating an own
    // property, so the manifest ends up in the prototype chain and would be lost
    // when postMessage structured-clones the object.
    const manifest = { title: 'proto-manifest' };
    const poisoned: Record<string, unknown> = {};
    // eslint-disable-next-line no-proto
    (poisoned as any).__proto__ = manifest;

    // Confirm the poisoned state: no own property, but accessible via prototype.
    expect(Object.hasOwn(poisoned, '__proto__')).toBe(false);
    expect(Object.getPrototypeOf(poisoned)).toBe(manifest);

    const store = { active_manifest: '__proto__', manifests: poisoned };
    const result = sanitizeManifestStore(store);

    // After sanitization the manifest must be an own property so it survives
    // structured clone.
    expect(Object.hasOwn(result.manifests, '__proto__')).toBe(true);
    expect(result.manifests['__proto__']).toBe(manifest);
  });

  test('preserves sibling manifests alongside a recovered "__proto__" manifest', () => {
    const activeManifest = { title: 'active' };
    const siblingManifest = { title: 'sibling' };

    const poisoned: Record<string, unknown> = { 'urn:c2pa:sibling': siblingManifest };
    (poisoned as any).__proto__ = activeManifest;

    const store = { active_manifest: '__proto__', manifests: poisoned };
    const result = sanitizeManifestStore(store);

    expect(result.manifests['__proto__']).toBe(activeManifest);
    expect(result.manifests['urn:c2pa:sibling']).toBe(siblingManifest);
  });
});
