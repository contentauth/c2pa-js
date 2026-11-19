/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export interface ContextBoundarySnapshot {
  type: 'context-boundary';
  calls: Record<string, number>;
  settings: string[];
}

export interface ContextHandleSnapshot {
  type: 'context-handles';
  result?: {
    label: string | undefined;
    fragmentLabel: string | undefined;
    firstTitle: string;
    secondTitle: string;
    error: string;
    compatible: boolean;
  };
  error?: string;
}

const snapshot: ContextBoundarySnapshot = {
  type: 'context-boundary',
  calls: {},
  settings: []
};
let failNextRegistration = false;

// Instrument actual WASM exports, not RPC messages or the JavaScript JSON cache.
WebAssembly.Instance = class extends WebAssembly.Instance {
  #instrumentedExports?: WebAssembly.Exports;

  override get exports(): WebAssembly.Exports {
    if (this.#instrumentedExports) {
      return this.#instrumentedExports;
    }

    const exports = super.exports;
    const instrumented = { ...exports };
    for (const [name, value] of Object.entries(exports)) {
      if (
        typeof value !== 'function' ||
        !/^(wasmcontext_new|__wbg_wasmcontext_free|wasmreader_from|wasmbuilder_(new|from))/.test(
          name
        )
      ) {
        continue;
      }

      instrumented[name] = (...args: unknown[]) => {
        snapshot.calls[name] = (snapshot.calls[name] ?? 0) + 1;
        if (name === 'wasmcontext_new') {
          const [pointer, length] = args;
          if (
            typeof pointer !== 'number' ||
            typeof length !== 'number' ||
            !(exports.memory instanceof WebAssembly.Memory)
          ) {
            throw new Error('Unexpected WASM context registration ABI');
          }
          snapshot.settings.push(
            new TextDecoder().decode(
              new Uint8Array(exports.memory.buffer, pointer, length)
            )
          );
          if (failNextRegistration) {
            failNextRegistration = false;
            throw new Error('Injected context registration failure');
          }
        }
        return value(...args);
      };
    }

    this.#instrumentedExports = instrumented;
    return instrumented;
  }
};

self.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type === 'fail-next-context-registration') {
    failNextRegistration = true;
  }
  if (event.data?.type === 'context-boundary') {
    self.postMessage(snapshot);
  }
  if (event.data?.type === 'context-handles') {
    exerciseHandles(event.data.blob, event.data.init, event.data.fragment).then(
      (result) => self.postMessage({ type: 'context-handles', result }),
      (error: unknown) =>
        self.postMessage({ type: 'context-handles', error: String(error) })
    );
  }
});

import { WasmContext, WasmReader, WasmBuilder } from '@contentauth/c2pa-wasm';
import '../src/lib/worker.js';

async function exerciseHandles(blob: Blob, init: Blob, fragment: Blob) {
  const settings =
    '{"verify":{"verify_trust":false},"builder":{"generate_c2pa_archive":true}}';
  const context = new WasmContext(settings);
  const first = WasmBuilder.fromJsonWithContext('{"title":"first"}', context);
  const second = WasmBuilder.fromJsonWithContext('{"title":"second"}', context);
  const archive = new Blob([first.toArchive()]);
  const archived = WasmBuilder.fromArchiveWithContext(archive, context);
  const pending = WasmReader.fromBlobWithContext(blob.type, blob, context);
  const pendingFragment = WasmReader.fromBlobFragmentWithContext(
    init.type,
    init,
    fragment,
    context
  );
  // This must succeed before either Promise gets its first microtask.
  context.free();
  const [reader, fragmentReader] = await Promise.all([
    pending,
    pendingFragment
  ]);
  const invalidContext = new WasmContext(settings);
  const failed = WasmReader.fromBlobWithContext(
    'image/jpeg',
    new Blob(['invalid']),
    invalidContext
  );
  invalidContext.free();
  const error = await failed.then(
    () => {
      throw new Error('Invalid image unexpectedly succeeded');
    },
    (error: unknown) => String(error)
  );
  const jsonReader = await WasmReader.fromBlob(blob.type, blob, settings);
  const jsonFragment = await WasmReader.fromBlobFragment(
    init.type,
    init,
    fragment,
    settings
  );
  const jsonBytes = await WasmReader.fromBytes(
    blob.type,
    new Uint8Array(await blob.arrayBuffer()),
    settings
  );
  const jsonBuilder = WasmBuilder.new(settings);
  const jsonDefinition = WasmBuilder.fromJson('{"title":"first"}', settings);
  const jsonArchive = WasmBuilder.fromArchive(archive, settings);
  try {
    return {
      label: reader.activeLabel(),
      fragmentLabel: fragmentReader.activeLabel(),
      firstTitle: definitionTitle(first),
      secondTitle: definitionTitle(second),
      error,
      compatible:
        jsonReader.activeLabel() === reader.activeLabel() &&
        jsonBytes.activeLabel() === reader.activeLabel() &&
        jsonFragment.activeLabel() === fragmentReader.activeLabel() &&
        JSON.stringify(jsonArchive.getDefinition()) ===
          JSON.stringify(archived.getDefinition()) &&
        definitionTitle(jsonDefinition) === 'first'
    };
  } finally {
    for (const object of [
      reader,
      fragmentReader,
      first,
      second,
      archived,
      jsonReader,
      jsonFragment,
      jsonBytes,
      jsonBuilder,
      jsonDefinition,
      jsonArchive
    ]) {
      object.free();
    }
  }
}

function definitionTitle(builder: WasmBuilder): string {
  const definition: unknown = builder.getDefinition();
  if (
    typeof definition !== 'object' ||
    definition === null ||
    !('title' in definition) ||
    typeof definition.title !== 'string'
  ) {
    throw new Error('Expected a builder definition with a title');
  }
  return definition.title;
}
