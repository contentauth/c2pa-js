/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { createC2pa } from '@contentauth/c2pa-web';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';

const c2pa = await createC2pa({ wasmSrc });

const dropzone = document.getElementById('drop-zone');

dropzone?.addEventListener('dragenter', () => {
  dropzone.classList.add('active');
});

dropzone?.addEventListener('dragleave', () => {
  dropzone.classList.remove('active');
});

dropzone?.addEventListener('dragover', (e) => {
  e.preventDefault();
});

dropzone?.addEventListener('drop', (e) => {
  dropzone.classList.remove('active');

  if (e.dataTransfer?.items) {
    [...e.dataTransfer.items].forEach(async (item) => {
      if (item.kind === 'file') {
        const file = item.getAsFile();

        if (!file) {
          throw new Error('Could not get item as file');
        }

        try {
          const start = performance.now();

          const reader = await c2pa.reader.fromBlob(file.type, file);
          const manifestStore = await reader.manifestStore();

          const end = performance.now();

          console.log(manifestStore);
          console.log(`Took ${Math.round(end - start)}ms`);

          await reader.free();
        } catch (e) {
          console.log('caught error', e);
        }
      }
    });
  }
  e.preventDefault();
});
