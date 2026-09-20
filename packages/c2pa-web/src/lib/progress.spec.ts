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
    const events: ProgressReportEvent[] = [];
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
    const events: ProgressReportEvent[] = [];
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
    const events: ProgressReportEvent[] = [];
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
    const events: ProgressReportEvent[] = [];
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

  test('cancels a builder during signing', async ({ c2pa }) => {
    // Signing is the only long operation this API can cancel: a reader's work is over
    // when its constructor resolves, but a builder's runs here, inside `sign`. The
    // progress closure registered at construction is what observes the cancellation,
    // so this also pins that the closure is still consulted during signing.
    const controller = new AbortController();

    const builder = await Builder.new(c2pa, new Context(settings), {
      // Abort at the first report. The engine stops at its next checkpoint, so some
      // further work runs before `sign` rejects.
      onProgress: () => controller.abort(),
      signal: controller.signal
    });
    await builder.setIntent('edit');

    const blob = await getBlobForAsset(PirateShip_cloud);
    const signer = await createTestSigner();

    let caught: unknown;
    try {
      await builder.sign(signer, 'image/jpeg', blob);
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeDefined();
    expect(isCancelled(caught)).toBe(true);

    await builder.free();
  });

  test('an already-aborted signal rejects without calling the worker', async ({
    c2pa
  }) => {
    const controller = new AbortController();
    controller.abort();

    let progressEvents = 0;
    const context = new Context(settings, {
      onProgress: () => progressEvents++,
      signal: controller.signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    await expect(
      Reader.fromBlob(c2pa, 'image/jpeg', blob, context)
    ).rejects.toThrow();

    // Nothing was dispatched, so the engine never ran.
    expect(progressEvents).toBe(0);
  });

  test('aborting during a read rejects it as cancelled', async ({ c2pa }) => {
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

  test('a read with no signal is unaffected', async ({ c2pa }) => {
    const context = new Context(settings, { onProgress: () => undefined });
    expect(context.signal).toBeUndefined();

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context);

    expect(reader).not.toBeNull();
    await reader?.free();
  });

  test('separate Contexts cancel independently', async ({ c2pa }) => {
    // Independent cancellation needs a Context each, since the signal lives on the
    // Context. Aborting one must not reach the other — which is what would fail if the
    // worker's cancellation set leaked across operation ids.
    const doomed = new AbortController();
    const cancelledContext = new Context(settings, {
      onProgress: () => doomed.abort(),
      signal: doomed.signal
    });
    const survivingContext = new Context(settings, {
      signal: new AbortController().signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const [cancelled, survivor] = await Promise.allSettled([
      Reader.fromBlob(c2pa, 'image/jpeg', blob, cancelledContext),
      Reader.fromBlob(c2pa, 'image/jpeg', blob, survivingContext)
    ]);

    expect(cancelled.status).toBe('rejected');
    expect(survivor.status).toBe('fulfilled');

    if (survivor.status === 'fulfilled') {
      expect(survivor.value).not.toBeNull();
      await survivor.value?.free();
    }
  });

  test('one Context cancels every read it configures', async ({ c2pa }) => {
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

  test('a cancelled operation does not poison a later one', async ({ c2pa }) => {
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

  test('one Context serves reads that cancel independently', async ({
    c2pa
  }) => {
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

  test('a call-level signal overrides the Context signal', async ({ c2pa }) => {
    const contextController = new AbortController();
    const context = new Context(settings, {
      signal: contextController.signal
    });

    // Aborting the context's controller must not reach a read that brought its own.
    contextController.abort();

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context, {
      signal: new AbortController().signal
    });

    expect(reader).not.toBeNull();
    await reader?.free();
  });

  test('a call-level onProgress overrides the Context callback', async ({
    c2pa
  }) => {
    let fromContext = 0;
    let fromCall = 0;

    const context = new Context(settings, {
      onProgress: () => fromContext++
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context, {
      onProgress: () => fromCall++
    });

    expect(fromCall).toBeGreaterThan(0);
    expect(fromContext).toBe(0);

    await reader?.free();
  });

  test('overriding one field leaves the other from the Context', async ({
    c2pa
  }) => {
    // Per-field precedence: overriding `signal` must not silence the Context's
    // progress reporting. The rule most likely to regress without being noticed.
    let events = 0;
    const context = new Context(settings, {
      onProgress: () => events++,
      signal: new AbortController().signal
    });

    const blob = await getBlobForAsset(PirateShip_cloud);
    const reader = await Reader.fromBlob(c2pa, 'image/jpeg', blob, context, {
      signal: new AbortController().signal
    });

    expect(events).toBeGreaterThan(0);
    expect(reader).not.toBeNull();
    await reader?.free();
  });

  test('an explicit undefined override falls through to the Context', async ({
    c2pa
  }) => {
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

  test('a Builder honours a call-level signal', async ({ c2pa }) => {
    const controller = new AbortController();
    controller.abort();

    // The pre-abort guard must consult the merged signal, not the Context's.
    await expect(
      Builder.new(c2pa, new Context(settings), { signal: controller.signal })
    ).rejects.toThrow();
  });

  test('isCancelled recognizes both cancellation paths', async ({ c2pa }) => {
    const blob = await getBlobForAsset(PirateShip_cloud);

    // Mid-read: the engine reports it.
    const during = new AbortController();
    let midRead: unknown;
    try {
      await Reader.fromBlob(c2pa, 'image/jpeg', blob, new Context(settings), {
        onProgress: () => during.abort(),
        signal: during.signal
      });
    } catch (e: unknown) {
      midRead = e;
    }

    // Pre-call: the signal's own reason, a different error type entirely.
    const before = new AbortController();
    before.abort();
    let preAbort: unknown;
    try {
      await Reader.fromBlob(c2pa, 'image/jpeg', blob, new Context(settings), {
        signal: before.signal
      });
    } catch (e: unknown) {
      preAbort = e;
    }

    expect(isCancelled(midRead)).toBe(true);
    expect(isCancelled(preAbort)).toBe(true);
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
