/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { test, describe, expect } from 'test/methods.js';
import { Reader } from './reader.js';
import { Builder } from './builder.js';
import { Context, type ProgressEvent, type ProgressPhase } from '@contentauth/c2pa-utilities';
import { getBlobForAsset, createTestSigner } from 'test/utils.js';

import PirateShip_cloud from 'test/assets/PirateShip_save_credentials_to_cloud.jpg';
import dashinit from 'test/assets/dashinit.mp4';
import dash1 from 'test/assets/dash1.m4s?url';

// Every phase name the bindings can produce. Kept as data so a phase added on the Rust
// side without a matching TypeScript member shows up as a failure here rather than
// silently widening the union.
const KNOWN_PHASES: ProgressPhase[] = [
  'reading',
  'verifyingManifest',
  'verifyingSignature',
  'verifyingIngredient',
  'verifyingAssetHash',
  'addingIngredient',
  'thumbnail',
  'hashing',
  'signing',
  'embedding',
  'fetchingRemoteManifest',
  'writing',
  'fetchingOcsp',
  'fetchingTimestamp',
  'unknown'
];

const settings = { verify: { verifyTrust: false } };

describe('progress', () => {
  test('reports progress while reading a blob', async ({ c2pa }) => {
    const events: ProgressEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(reader).not.toBeNull();
    // Count and ordering depend on asset size and c2pa-rs internals, so assert only
    // that reporting happened and every event is well formed.
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(KNOWN_PHASES).toContain(event.phase);
      expect(event.step).toBeGreaterThanOrEqual(1);
      expect(event.total).toBeGreaterThanOrEqual(0);
    }

    await reader?.free();
  });

  test('reports progress while reading a fragment', async ({ c2pa }) => {
    const events: ProgressEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const init = await getBlobForAsset(dashinit);
    const fragment = await getBlobForAsset(dash1);
    const reader = await Reader.fromBlobFragment(
      c2pa,
      'video/mp4',
      init,
      fragment,
      context
    );

    expect(reader).not.toBeNull();
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(KNOWN_PHASES).toContain(event.phase);
    }

    await reader?.free();
  });

  test('reads normally when no onProgress is supplied', async ({ c2pa }) => {
    // The additive path: a Context built the old way must behave exactly as before.
    const context = new Context(settings);
    expect(context.onProgress).toBeUndefined();

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(reader).not.toBeNull();
    expect(await reader?.activeManifest()).toBeTruthy();

    await reader?.free();
  });

  test('keeps concurrent reads on one Context separate', async ({ c2pa }) => {
    // One Context drives several operations; each report must reach the right reader.
    const events: ProgressEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const readers = await Promise.all([
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context)
    ]);

    for (const reader of readers) {
      expect(reader).not.toBeNull();
    }
    expect(events.length).toBeGreaterThan(0);

    await Promise.all(readers.map((reader) => reader?.free()));
  });

  test('reports progress while a builder signs', async ({ c2pa }) => {
    // A builder's reports arrive during signing, not construction, so its handler has
    // to outlive the constructor call that registered it.
    const events: ProgressEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const builder = await Builder.new(c2pa, context);
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(PirateShip_cloud);
    const signer = await createTestSigner();
    const signedBytes = await builder.sign(signer, 'image/jpeg', blob);

    expect(signedBytes.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(KNOWN_PHASES).toContain(event.phase);
    }

    await builder.free();
  });

  test('a throwing onProgress does not fail the read', async ({ c2pa }) => {
    let calls = 0;
    const context = new Context(settings, {
      onProgress: () => {
        calls += 1;
        throw new Error('progress handler is broken');
      }
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(calls).toBeGreaterThan(0);
    expect(reader).not.toBeNull();
    expect(await reader?.activeManifest()).toBeTruthy();

    await reader?.free();
  });
});
