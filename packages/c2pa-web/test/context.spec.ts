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
import {
  CONTEXT_MISSING,
  MAX_CACHED_CONTEXTS,
  type WorkerContext,
  type WorkerContextResult
} from '../src/lib/worker/rpc.js';
import ContextWorker from './context-worker?worker';
import type {
  ContextBoundarySnapshot,
  ContextHandleSnapshot
} from './context-worker.js';
import { getBlobForAsset } from './utils.js';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';
import signedJpeg from './assets/C.jpg';
import dashinit from './assets/dashinit.mp4';
import dash1 from './assets/dash1.m4s?url';
import trustAnchor from './trust/anchor-correct.pem?raw';

function registered(result: WorkerContextResult): number {
  if (result === CONTEXT_MISSING) {
    throw new Error('Expected a registered context');
  }
  return result;
}

class ContextGeneration extends Context {
  constructor(private generation: number) {
    super({ verify: { verifyTrust: false } });
  }

  override async toJson(): Promise<string> {
    // Whitespace creates distinct cache keys without changing native verification behavior.
    return `${await super.toJson()}${' '.repeat(this.generation)}`;
  }
}

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
  test('allows immediate handle disposal while Reader promises are pending and preserves JSON APIs', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    try {
      const result = await new Promise<ContextHandleSnapshot>(
        (resolve, reject) => {
          const timeout = setTimeout(() => {
            worker.removeEventListener('message', receive);
            reject(new Error('Direct WASM handle exercise timed out'));
          }, 10000);
          function receive(event: MessageEvent<ContextHandleSnapshot>) {
            if (event.data?.type === 'context-handles') {
              clearTimeout(timeout);
              worker.removeEventListener('message', receive);
              resolve(event.data);
            }
          }
          worker.addEventListener('message', receive);
          Promise.all([
            getBlobForAsset(signedJpeg),
            getBlobForAsset(dashinit),
            getBlobForAsset(dash1)
          ]).then(
            ([blob, init, fragment]) =>
              worker.postMessage({
                type: 'context-handles',
                blob,
                init,
                fragment
              }),
            reject
          );
        }
      );
      expect(result.error).toBeUndefined();
      expect(result.result).toMatchObject({
        firstTitle: 'first',
        secondTitle: 'second',
        compatible: true
      });
      expect(result.result?.label).toBeTruthy();
      expect(result.result?.fragmentLabel).toBeTruthy();
      expect(result.result?.error).toContain('C2pa(');
    } finally {
      c2pa.dispose();
    }
  });

  test('survives the failed-registration FIFO drift sequence from review', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const contexts = Array.from(
      { length: 18 },
      (_, index) => new ContextGeneration(index)
    );
    const badSettings = { verify: { verifyTrust: false } };
    Reflect.set(badSettings.verify, 'verifyTrust', 'not a boolean');
    const blob = await getBlobForAsset(signedJpeg);
    try {
      for (const context of contexts.slice(0, 16)) {
        await (await Builder.new(c2pa, context)).free();
      }
      await expect(Builder.new(c2pa, new Context(badSettings))).rejects.toThrow(
        'C2pa(BadParam('
      );
      await (await Builder.new(c2pa, contexts[0])).free();
      await (await Builder.new(c2pa, contexts[17])).free();
      const before = (await boundarySnapshot(worker)).settings.length;
      const reader = await Reader.fromBlob(c2pa, blob.type, blob, contexts[0]);
      expect(reader).not.toBeNull();
      await reader?.free();
      await (await Builder.new(c2pa, contexts[0])).free();
      expect((await boundarySnapshot(worker)).settings).toHaveLength(before);
    } finally {
      c2pa.dispose();
    }
  });

  test('recovers a delayed bare ID after eviction without retrying construction failures', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const context = new Context({ verify: { verifyTrust: false } });
    const settings = await context.toJson();
    let resume: () => void = () => {
      throw new Error('Gate not initialized');
    };
    let started: () => void = () => {
      throw new Error('Gate not initialized');
    };
    const gate = new Promise<void>((resolve) => {
      resume = resolve;
    });
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    try {
      await (await Builder.new(c2pa, context)).free();
      const create = vi.fn(async (descriptor: WorkerContext) => {
        if (descriptor.json === undefined) {
          expect(descriptor.json).toBeUndefined();
          started();
          await gate;
        }
        return c2pa.worker.tx.builder_new(descriptor);
      });
      const pending = c2pa.worker.withContext(settings, create);
      await ready;
      for (let generation = 1; generation <= 16; generation++) {
        const id = registered(
          await c2pa.worker.tx.builder_new(
            c2pa.worker.context(`${settings}${' '.repeat(generation)}`)
          )
        );
        await c2pa.worker.tx.builder_free(id);
      }
      resume();
      await c2pa.worker.tx.builder_free(await pending);
      expect(create).toHaveBeenLastCalledWith({ id: 0, json: settings });
      expect((await boundarySnapshot(worker)).settings).toHaveLength(18);
      expect(create).toHaveBeenCalledTimes(2);
      const fromJson = vi.fn((descriptor: WorkerContext) =>
        c2pa.worker.tx.builder_fromJson('invalid manifest JSON', descriptor)
      );
      await expect(
        c2pa.worker.withContext(settings, fromJson)
      ).rejects.toThrow();
      expect(fromJson).toHaveBeenCalledOnce();
    } finally {
      resume();
      vi.restoreAllMocks();
      c2pa.dispose();
    }
  });

  test('keeps more than 16 concurrent Reader/Builder constructions alive across eviction', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const blob = await getBlobForAsset(signedJpeg);
    const objects: (Reader | Builder | null)[] = [];
    try {
      objects.push(
        ...(await Promise.all(
          Array.from({ length: 40 }, async (_, index) => {
            const context = new ContextGeneration(index);
            return index % 2 === 0
              ? Reader.fromBlob(c2pa, blob.type, blob, context)
              : Builder.fromDefinition(
                  c2pa,
                  { title: `builder ${index}` },
                  context
                );
          })
        ))
      );
      for (const [index, object] of objects.entries()) {
        expect(object).not.toBeNull();
        if (object instanceof Reader) {
          expect(await object.activeLabel()).toBeTruthy();
        } else if (object instanceof Builder) {
          expect((await object.getDefinition()).title).toBe(`builder ${index}`);
        }
      }
      const snapshot = await boundarySnapshot(worker);
      expect(snapshot.settings).toHaveLength(40);
      expect(snapshot.calls.__wbg_wasmcontext_free).toBe(24);
    } finally {
      await Promise.all(objects.map((object) => object?.free()));
      c2pa.dispose();
    }
  });

  test('preserves native validation errors on repeated public calls with invalid settings', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const settings = {
      verify: { verifyTrust: false }
    };
    // JavaScript consumers can provide values that violate TypeScript's types.
    Reflect.set(settings.verify, 'verifyTrust', 'not a boolean');
    const context = new Context(settings);
    const readers: (Reader | null)[] = [];
    const builders: Builder[] = [];
    try {
      const settingsJson = await context.toJson();
      expect(JSON.parse(settingsJson).verify.verify_trust).toBe(
        'not a boolean'
      );
      const blob = await getBlobForAsset(signedJpeg);
      for (let attempt = 0; attempt < 2; attempt++) {
        await expect(Builder.new(c2pa, context)).rejects.toThrow(
          'C2pa(BadParam('
        );
        await expect(
          Reader.fromBlob(c2pa, blob.type, blob, context)
        ).rejects.toThrow('C2pa(BadParam(');
      }
      await expect(
        Builder.new(c2pa, new InlineContext(settings))
      ).rejects.toThrow('C2pa(BadParam(');
      expect((await boundarySnapshot(worker)).settings).toEqual(
        Array(5).fill(settingsJson)
      );

      const validContext = new Context({ verify: { verifyTrust: false } });
      builders.push(await Builder.new(c2pa, validContext));
      const reader = await Reader.fromBlob(c2pa, blob.type, blob, validContext);
      readers.push(reader);
      expect(reader).not.toBeNull();
      expect(await reader?.activeManifest()).toBeDefined();
      expect((await boundarySnapshot(worker)).settings).toEqual([
        ...Array(5).fill(settingsJson),
        await validContext.toJson()
      ]);
    } finally {
      await Promise.all(readers.map((reader) => reader?.free()));
      await Promise.all(builders.map((builder) => builder.free()));
      c2pa.dispose();
    }
  });

  test('retries failed registration before sending bare context IDs', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const context = new Context({ verify: { verifyTrust: false } });
    const settings = await context.toJson();
    const builders: Builder[] = [];
    try {
      worker.postMessage({ type: 'fail-next-context-registration' });
      await expect(Builder.new(c2pa, context)).rejects.toThrow(
        'Injected context registration failure'
      );
      expect(c2pa.worker.context(settings).json).toBe(settings);

      const blob = await getBlobForAsset(signedJpeg);
      const [reader, first, second] = await Promise.all([
        Reader.fromBlob(c2pa, blob.type, blob, context),
        Builder.new(c2pa, context),
        Builder.new(c2pa, context)
      ]);
      builders.push(first, second);
      expect(reader).not.toBeNull();
      await reader?.free();
      expect(c2pa.worker.context(settings).json).toBeUndefined();
      expect((await boundarySnapshot(worker)).settings).toEqual([
        settings,
        settings
      ]);

      for (let attempt = 0; attempt < 2; attempt++) {
        await expect(
          c2pa.worker.tx.builder_new(c2pa.worker.context('invalid JSON'))
        ).rejects.not.toThrow(
          'Worker context settings have not been registered'
        );
        expect(c2pa.worker.context('invalid JSON').json).toBe('invalid JSON');
      }
    } finally {
      await Promise.all(builders.map((builder) => builder.free()));
      c2pa.dispose();
    }
  });

  test('acknowledges registered settings even when construction fails', async () => {
    const { c2pa, worker } = await instrumentedC2pa();
    const settings = '{"verify":{"verify_trust":false}}';
    try {
      await expect(
        c2pa.worker.tx.builder_fromJson(
          'invalid manifest JSON',
          c2pa.worker.context(settings)
        )
      ).rejects.toThrow();
      expect(c2pa.worker.context(settings).json).toBeUndefined();
      const builder = registered(
        await c2pa.worker.tx.builder_new(c2pa.worker.context(settings))
      );
      await c2pa.worker.tx.builder_free(builder);
      expect((await boundarySnapshot(worker)).settings).toEqual([settings]);
    } finally {
      c2pa.dispose();
    }
  });

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
      const archiveBuilder = registered(
        await c2pa.worker.tx.builder_new(
          c2pa.worker.context(await context.toJson())
        )
      );
      const archive = await c2pa.worker.tx.builder_toArchive(archiveBuilder);
      await c2pa.worker.tx.builder_free(archiveBuilder);
      const archived = registered(
        await c2pa.worker.tx.builder_fromArchive(
          new Blob([archive]),
          c2pa.worker.context(await context.toJson())
        )
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
      expect(snapshot.calls.wasmcontext_new).toBe(1);
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
    const builder = registered(await c2pa.worker.tx.builder_new(first));
    const reader = registered(
      await c2pa.worker.tx.reader_fromBlob(blob.type, blob, first)
    );
    const definition = await c2pa.worker.tx.builder_getDefinition(builder);
    const manifest = await c2pa.worker.tx.reader_manifestStore(reader);
    try {
      for (
        let generation = 1;
        generation <= MAX_CACHED_CONTEXTS;
        generation++
      ) {
        const id = registered(
          await c2pa.worker.tx.builder_new(
            c2pa.worker.context(`${settings}${' '.repeat(generation)}`)
          )
        );
        await c2pa.worker.tx.builder_free(id);
      }
      await expect(c2pa.worker.tx.builder_new({ id: first.id })).resolves.toBe(
        CONTEXT_MISSING
      );
      const refreshed = c2pa.worker.context(settings);
      const id = registered(await c2pa.worker.tx.builder_new(refreshed));
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
          id: 1000,
          json: 'invalid JSON'
        })
      ).rejects.toThrow();
      expect(
        (await boundarySnapshot(worker)).calls.__wbg_wasmcontext_free
      ).toBe(2);
      const otherBuilder = registered(
        await other.c2pa.worker.tx.builder_new(
          other.c2pa.worker.context(settings)
        )
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
