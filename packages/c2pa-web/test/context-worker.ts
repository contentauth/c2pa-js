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

const snapshot: ContextBoundarySnapshot = {
  type: 'context-boundary',
  calls: {},
  settings: []
};

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
        !/^(registerContext|wasmreader_from|wasmbuilder_(new|from))/.test(name)
      ) {
        continue;
      }

      instrumented[name] = (...args: unknown[]) => {
        snapshot.calls[name] = (snapshot.calls[name] ?? 0) + 1;
        if (name === 'registerContext') {
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
        }
        return value(...args);
      };
    }

    this.#instrumentedExports = instrumented;
    return instrumented;
  }
};

self.addEventListener('message', (event: MessageEvent) => {
  if (event.data?.type === 'context-boundary') {
    self.postMessage(snapshot);
  }
});

import '../src/lib/worker.js';
