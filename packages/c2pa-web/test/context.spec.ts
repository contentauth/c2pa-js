/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { describe, test, expect } from './methods.js';
import { vi } from 'vitest';
import { createC2pa, Context, Reader, Builder } from '../src/index.js';
import { Context as InlineContext } from '../src/inline.js';
import { MAX_CACHED_CONTEXTS } from '../src/lib/worker/rpc.js';
import ContextWorker from './context-worker?worker';
import type { ContextBoundarySnapshot } from './context-worker.js';
import { getBlobForAsset } from './utils.js';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';
import signedJpeg from './assets/C.jpg';
import dashinit from './assets/dashinit.mp4';
import dash1 from './assets/dash1.m4s?url';
import trustAnchor from './trust/anchor-correct.pem?raw';

function boundarySnapshot(worker: Worker): Promise<ContextBoundarySnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      worker.removeEventListener('message', receive);
      reject(new Error('WASM boundary instrumentation timed out'));
    }, 5000);
    function receive(event: MessageEvent<ContextBoundarySnapshot>) {
      if (event.data?.type === 'context-boundary') {
        clearTimeout(timeout);
        worker.removeEventListener('message', receive);
        resolve(event.data);
      }
    }
    worker.addEventListener('message', receive);
    worker.postMessage({ type: 'context-boundary' });
  });
}

async function instrumentedC2pa() {
  const worker = new ContextWorker();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const failed = new Promise<never>((_, reject) => {
    worker.addEventListener(
      'error',
      (event) => reject(new Error(event.message)),
      {
        once: true
      }
    );
    timeout = setTimeout(
      () =>
        reject(new Error('Instrumented WASM worker initialization timed out')),
      5000
    );
  });
  const workerSpy = vi
    .spyOn(globalThis, 'Worker')
    .mockImplementationOnce(() => worker);
  try {
    return {
      c2pa: await Promise.race([createC2pa({ wasmSrc }), failed]),
      worker
    };
  } catch (error) {
    worker.terminate();
    throw error;
  } finally {
    clearTimeout(timeout);
    workerSpy.mockRestore();
  }
}

describe('WASM context boundary', () => {
  test('transfers settings exactly once across every Reader and Builder constructor', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const context = new Context({
      verify: { verifyTrust: false },
      trust: { trustAnchors: trustAnchor },
      builder: { generateC2paArchive: true }
    });
    const blob = await getBlobForAsset(signedJpeg);
    const readers: (Reader | null)[] = [];
    const builders: Builder[] = [];
    try {
      expect(InlineContext).toBe(Context);
      const [reader, builder] = await Promise.all([
        Reader.fromBlob(c2pa, blob.type, blob, context),
        Builder.new(c2pa, context)
      ]);
      readers.push(reader);
      builders.push(builder);
      const equivalentContext = new InlineContext({
        verify: { verifyTrust: false },
        trust: { trustAnchors: trustAnchor },
        builder: { generateC2paArchive: true }
      });
      expect(await equivalentContext.toJson()).toBe(await context.toJson());
      readers.push(
        await Reader.fromBlob(c2pa, blob.type, blob, equivalentContext)
      );
      builders.push(
        await Builder.fromDefinition(c2pa, { title: 'independent' }, context)
      );
      const archiveBuilder = await c2pa.worker.tx.builder_new(
        c2pa.worker.context(await context.toJson())
      );
      const archive = await c2pa.worker.tx.builder_toArchive(archiveBuilder);
      await c2pa.worker.tx.builder_free(archiveBuilder);
      const archived = await c2pa.worker.tx.builder_fromArchive(
        new Blob([archive]),
        c2pa.worker.context(await context.toJson())
      );
      await c2pa.worker.tx.builder_free(archived);
      const init = await getBlobForAsset(dashinit);
      readers.push(
        await Reader.fromBlobFragment(
          c2pa,
          init.type,
          init,
          await getBlobForAsset(dash1),
          context
        )
      );
      const snapshot = await boundarySnapshot(worker);
      expect(snapshot.settings).toEqual([await context.toJson()]);
      expect(snapshot.calls.registerContext).toBe(1);
      expect(snapshot.calls.wasmreader_fromBlobWithContext).toBe(2);
      expect(snapshot.calls.wasmreader_fromBlobFragmentWithContext).toBe(1);
      expect(snapshot.calls.wasmbuilder_newWithContext).toBe(2);
      expect(snapshot.calls.wasmbuilder_fromJsonWithContext).toBe(1);
      expect(snapshot.calls.wasmbuilder_fromArchiveWithContext).toBe(1);
      for (const name of [
        'wasmreader_fromBlob',
        'wasmreader_fromBlobFragment',
        'wasmbuilder_new',
        'wasmbuilder_fromJson',
        'wasmbuilder_fromArchive'
      ]) {
        expect(snapshot.calls[name]).toBeUndefined();
      }
      expect(readers.every((value) => value !== null)).toBe(true);
      expect((await builders[0].getDefinition()).title).not.toBe('independent');
      expect((await builders[1].getDefinition()).title).toBe('independent');
    } finally {
      await Promise.all(readers.map((reader) => reader?.free()));
      await Promise.all(builders.map((builder) => builder.free()));
      c2pa.dispose();
    }
  });

  test('re-registers after 16-entry eviction, preserves live objects and isolates SDK workers', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const other = await instrumentedC2pa();
    const settings = '{"verify":{"verify_trust":false}}';
    const blob = await getBlobForAsset(signedJpeg);
    const first = c2pa.worker.context(settings);
    const builder = await c2pa.worker.tx.builder_new(first);
    const reader = await c2pa.worker.tx.reader_fromBlob(blob.type, blob, first);
    const definition = await c2pa.worker.tx.builder_getDefinition(builder);
    const manifest = await c2pa.worker.tx.reader_manifestStore(reader);
    try {
      for (
        let generation = 1;
        generation <= MAX_CACHED_CONTEXTS;
        generation++
      ) {
        const id = await c2pa.worker.tx.builder_new(
          c2pa.worker.context(`${settings}${' '.repeat(generation)}`)
        );
        await c2pa.worker.tx.builder_free(id);
      }
      await expect(
        c2pa.worker.tx.builder_new({ id: first.id })
      ).rejects.toThrow('Worker context settings have not been registered');
      const refreshed = c2pa.worker.context(settings);
      const id = await c2pa.worker.tx.builder_new(refreshed);
      await c2pa.worker.tx.builder_free(id);
      expect((await boundarySnapshot(worker)).settings).toEqual([
        settings,
        ...Array.from(
          { length: 16 },
          (_, index) => `${settings}${' '.repeat(index + 1)}`
        ),
        settings
      ]);
      expect(await c2pa.worker.tx.builder_getDefinition(builder)).toEqual(
        definition
      );
      expect(await c2pa.worker.tx.reader_manifestStore(reader)).toEqual(
        manifest
      );
      await expect(
        c2pa.worker.tx.builder_new({
          id: refreshed.id,
          json: '{}'
        })
      ).rejects.toThrow('Worker context ID was reused with different settings');
      await expect(
        c2pa.worker.tx.builder_new({
          id: 1000,
          json: 'invalid JSON'
        })
      ).rejects.toThrow();
      const otherBuilder = await other.c2pa.worker.tx.builder_new(
        other.c2pa.worker.context(settings)
      );
      await other.c2pa.worker.tx.builder_free(otherBuilder);
      expect((await boundarySnapshot(other.worker)).settings).toEqual([
        settings
      ]);
      const terminate = vi.spyOn(worker, 'terminate');
      c2pa.dispose();
      expect(terminate).toHaveBeenCalledOnce();
      expect(c2pa.worker.context(settings).json).toBe(settings);
    } finally {
      c2pa.dispose();
      other.c2pa.dispose();
    }
  });
});
