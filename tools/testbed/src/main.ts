/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { createC2pa, Reader } from '@contentauth/c2pa-web';
import { Context, type ProgressEvent } from '@contentauth/c2pa-utilities';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';

const c2pa = await createC2pa({ wasmSrc });

// Settings ride on the Context alongside the progress callback, so one object carries
// everything an individual read needs.
const settings = {
  verify: { verifyTrust: false },
  cawgTrust: { verifyTrustList: false }
};

const dropzone = document.getElementById('drop-zone');
const panel = document.getElementById('progress-panel');
const phaseLabel = document.getElementById('progress-phase');
const bar = document.getElementById('progress-bar');
const log = document.getElementById('progress-log');

function resetProgress() {
  panel?.classList.add('visible');
  if (log) {
    log.textContent = '';
  }
  setPhase('starting', 0, 0);
}

function setPhase(phase: string, step: number, total: number) {
  if (phaseLabel) {
    phaseLabel.textContent =
      total > 1 ? `${phase} ${step}/${total}` : phase;
  }

  if (!bar) {
    return;
  }

  // `total === 0` means the count is not known ahead of time, so show a moving bar
  // rather than a fraction.
  if (total > 1) {
    bar.classList.remove('indeterminate');
    bar.style.width = `${Math.round((step / total) * 100)}%`;
  } else {
    bar.classList.add('indeterminate');
    bar.style.width = '100%';
  }
}

function appendProgress(event: ProgressEvent) {
  setPhase(event.phase, event.step, event.total);

  if (log) {
    const line = document.createElement('div');
    line.textContent = `${event.phase} ${event.step}/${event.total}`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
  }
}

function finishProgress(text: string) {
  if (phaseLabel) {
    phaseLabel.textContent = text;
  }
  bar?.classList.remove('indeterminate');
  if (bar) {
    bar.style.width = '100%';
  }
}

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

        resetProgress();

        try {
          const start = performance.now();

          const context = new Context(settings, {
            onProgress: appendProgress
          });
          const reader = await Reader.fromBlob(c2pa, file.type, file, context);
          const manifestStore = await reader?.manifestStore();

          const end = performance.now();
          const elapsed = Math.round(end - start);

          console.log(manifestStore);
          console.log(`Took ${elapsed}ms`);
          finishProgress(`done in ${elapsed}ms`);

          await reader?.free();
        } catch (e) {
          console.log('caught error', e);
          finishProgress('error — see console');
        }
      }
    });
  }
  e.preventDefault();
});
