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
import {
  Context,
  isCancelled,
  type ProgressReportEvent,
  type ProgressPhase
} from '@contentauth/c2pa-utilities';
import { getBlobForAsset, createTestSigner } from 'test/utils.js';

import C from 'test/assets/C.jpg';
import PirateShip_cloud from 'test/assets/PirateShip_save_credentials_to_cloud.jpg';

// Known phases.
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

describe('progress and cancellation', () => {
  test('reports progress while reading', async ({ c2pa }) => {
    const events: ProgressReportEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const blob = await getBlobForAsset(C);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(reader).not.toBeNull();
    // Count and ordering depend on asset size and c2pa-rs internals, so assert only
    // that reporting happened and every event is well formed.
    expect(events.length).toBeGreaterThan(0);

    for (const event of events) {
      expect(KNOWN_PHASES).toContain(event.phase);
      expect(event.step).toBeGreaterThanOrEqual(1);
      if (event.total !== null) {
        expect(event.total).toBeGreaterThanOrEqual(1);
      }
    }

    await reader?.free();
  });

  test('reads without a progress callback', async ({ c2pa }) => {
    // The additive path: a Context built the old way must behave exactly as before.
    const context = new Context(settings);
    expect(context.onProgress).toBeUndefined();

    const blob = await getBlobForAsset(C);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(reader).not.toBeNull();
    expect(await reader?.activeManifest()).toBeTruthy();

    await reader?.free();
  });

  test('reports progress while signing', async ({ c2pa }) => {
    // A builder's reports arrive during signing, not construction, so its handler has
    // to outlive the constructor call that registered it.
    const events: ProgressReportEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const builder = await Builder.new(c2pa, context);
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(C);
    const signer = await createTestSigner();
    const signedBytes = await builder.sign(signer, 'image/jpeg', blob);

    expect(signedBytes.length).toBeGreaterThan(0);
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(KNOWN_PHASES).toContain(event.phase);
    }

    await builder.free();
  });

  test('cancels a sign with a signal given to sign', async ({ c2pa }) => {
    const controller = new AbortController();
    const builder = await Builder.new(c2pa, new Context(settings));
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(C);
    const signer = await createTestSigner();

    let caught: unknown;
    try {
      await builder.sign(signer, 'image/jpeg', blob, undefined, {
        onProgress: () => controller.abort(),
        signal: controller.signal
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeDefined();
    expect(isCancelled(caught)).toBe(true);

    await builder.free();
  });

  test('refuses to sign again after a cancelled sign', async ({ c2pa }) => {
    const controller = new AbortController();
    const builder = await Builder.new(c2pa, new Context(settings), {
      onProgress: () => controller.abort(),
      signal: controller.signal
    });
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(C);
    const signer = await createTestSigner();

    await expect(
      builder.sign(signer, 'image/jpeg', blob)
    ).rejects.toThrow();

    // Documented behavior: the cancellation entry lives until `free()`, so a retry on
    // the same builder is refused rather than silently starting new work.
    await expect(
      builder.sign(signer, 'image/jpeg', blob)
    ).rejects.toThrow();

    await builder.free();
  });

  test('keeps reporting across a sign', async ({ c2pa }) => {
    const events: ProgressReportEvent[] = [];
    const context = new Context(settings, {
      onProgress: (event) => events.push(event)
    });

    const builder = await Builder.new(c2pa, context);
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(C);
    const signer = await createTestSigner();

    await builder.sign(signer, 'image/jpeg', blob);
    const afterFirst = events.length;
    expect(afterFirst).toBeGreaterThan(0);

    await builder.sign(signer, 'image/jpeg', blob);
    expect(events.length).toBeGreaterThan(afterFirst);

    await builder.free();
  });

  test('rejects before starting when already aborted', async ({ c2pa }) => {
    const controller = new AbortController();
    controller.abort();

    let progressEvents = 0;
    const context = new Context(settings, {
      onProgress: () => progressEvents++,
      signal: controller.signal
    });

    const blob = await getBlobForAsset(C);
    await expect(
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context)
    ).rejects.toThrow();

    // Nothing was dispatched, so the engine never ran.
    expect(progressEvents).toBe(0);
  });

  test('rejects a read aborted mid-flight', async ({ c2pa }) => {
    const controller = new AbortController();
    const phasesSeen: ProgressPhase[] = [];

    // Abort at the first report, which is the earliest point the engine is running.
    const context = new Context(settings, {
      onProgress: (event) => {
        phasesSeen.push(event.phase);
        controller.abort();
      },
      signal: controller.signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);

    let message = '';
    try {
      await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);
    } catch (e: unknown) {
      message = e instanceof Error ? e.message : String(e);
    }

    expect(message).toContain('OperationCancelled');
    // Records where cancellation actually lands. With a small asset the engine may
    // complete several phases first: the guarantee is that it stops at a checkpoint,
    // not that it stops immediately.
    expect(phasesSeen.length).toBeGreaterThan(0);
  });

  test('cancels every read sharing a signal', async ({ c2pa }) => {
    // A signal lives on the Context, so reads sharing one share its cancellation:
    // aborting stops all of them. Documented behaviour, pinned here because the
    // alternative — cancelling only the first, or only the one that reported — would
    // be a silent difference.
    const controller = new AbortController();
    const context = new Context(settings, {
      onProgress: () => controller.abort(),
      signal: controller.signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);

    // A bystander on its own Context, in flight at the same time: the abort must reach
    // exactly the reads that share the signal and no others.
    const [first, second, third, bystander] = await Promise.allSettled([
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, new Context(settings))
    ]);

    for (const result of [first, second, third]) {
      expect(result.status).toBe('rejected');
    }
    expect(bystander.status).toBe('fulfilled');

    if (bystander.status === 'fulfilled') {
      expect(bystander.value).not.toBeNull();
      await bystander.value?.free();
    }
  });

  test('clears cancellation when an operation settles', async ({ c2pa }) => {
    // The worker clears an operation's cancellation entry when it settles. If it did
    // not, a later operation could inherit it and fail for no reason.
    const controller = new AbortController();
    const cancelledContext = new Context(settings, {
      onProgress: () => controller.abort(),
      signal: controller.signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    await expect(
      Reader.fromBlob(c2pa, 'image/jpeg', blob, cancelledContext)
    ).rejects.toThrow();

    const reader = await Reader.fromBlob(
      c2pa,
      'image/jpeg',
      blob,
      new Context(settings)
    );
    expect(reader).not.toBeNull();
    await reader?.free();
  });

  test('cancels reads on one Context independently', async ({ c2pa }) => {
    // The capability this override exists for: settings resolved once, but each read
    // cancellable on its own. Without it this needs one Context per read, and each of
    // those re-resolves its settings.
    const context = new Context(settings);
    const controllers = [
      new AbortController(),
      new AbortController(),
      new AbortController()
    ];

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reads = controllers.map((controller, index) =>
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context, {
        // Abort only the first read, from inside its own progress reports.
        onProgress: () => {
          if (index === 0) {
            controller.abort();
          }
        },
        signal: controller.signal
      })
    );

    const [cancelled, ...survivors] = await Promise.allSettled(reads);

    expect(cancelled.status).toBe('rejected');
    for (const survivor of survivors) {
      expect(survivor.status).toBe('fulfilled');
      if (survivor.status === 'fulfilled') {
        await survivor.value?.free();
      }
    }
  });

  test('keeps the Context callback when a call overrides the signal', async ({
    c2pa
  }) => {
    // Per-field precedence: overriding `signal` must not silence the Context's
    // progress reporting. The rule most likely to regress without being noticed.
    let events = 0;
    const context = new Context(settings, {
      onProgress: () => events++,
      signal: new AbortController().signal
    });

    const blob = await getBlobForAsset(C);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context, {
      signal: new AbortController().signal
    });

    expect(events).toBeGreaterThan(0);
    expect(reader).not.toBeNull();
    await reader?.free();
  });

  test('keeps the Context signal when a call omits it', async ({ c2pa }) => {
    // `undefined` means "not specified", so the Context's signal still applies and
    // still cancels. There is deliberately no way to opt out of it per call.
    const controller = new AbortController();
    const context = new Context(settings, {
      onProgress: () => controller.abort(),
      signal: controller.signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    await expect(
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context, { signal: undefined })
    ).rejects.toThrow();
  });

  test('ignores a throwing progress callback', async ({ c2pa }) => {
    let calls = 0;
    const context = new Context(settings, {
      onProgress: () => {
        calls += 1;
        throw new Error('progress handler is broken');
      }
    });

    const blob = await getBlobForAsset(C);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(calls).toBeGreaterThan(0);
    expect(reader).not.toBeNull();
    expect(await reader?.activeManifest()).toBeTruthy();

    await reader?.free();
  });
});
