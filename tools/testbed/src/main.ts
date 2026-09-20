/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { createC2pa, Reader } from '@contentauth/c2pa-web';
import {
  Context,
  isCancelled,
  type ProgressEvent
} from '@contentauth/c2pa-utilities';
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
const status = document.getElementById('progress-status');
const cancelButton = document.getElementById('progress-cancel');
const log = document.getElementById('progress-log');

// Set while a read is in flight, so the Cancel button knows what to abort.
let inFlight: AbortController | undefined;

function startProgress(controller: AbortController) {
  inFlight = controller;
  panel?.classList.add('visible');
  if (log) {
    log.textContent = '';
  }
  setStatus('reading', 'busy');
  if (cancelButton instanceof HTMLButtonElement) {
    cancelButton.disabled = false;
  }
}

function setStatus(text: string, state: 'busy' | 'done' | 'cancelled' | 'error') {
  if (status) {
    status.textContent = text;
    status.dataset.state = state;
  }
}

function appendProgress(event: ProgressEvent) {
  setStatus(event.phase, 'busy');

  if (!log) {
    return;
  }

  const row = document.createElement('div');
  row.className = 'progress-row';

  const phase = document.createElement('span');
  phase.className = 'progress-row-phase';
  phase.textContent = event.phase;

  const count = document.createElement('span');
  count.className = 'progress-row-count';
  // `total === 0` means the count is not known ahead of time, so a fraction would be
  // misleading; `total === 1` is a single-shot phase and needs no count at all.
  count.textContent =
    event.total > 1
      ? `${event.step}/${event.total}`
      : event.total === 0
        ? `step ${event.step}`
        : '';

  row.append(phase, count);
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function finishProgress(
  text: string,
  state: 'done' | 'cancelled' | 'error'
) {
  inFlight = undefined;
  setStatus(text, state);
  if (cancelButton instanceof HTMLButtonElement) {
    cancelButton.disabled = true;
  }
}

cancelButton?.addEventListener('click', () => {
  inFlight?.abort();
  // The engine only stops at its next checkpoint, so the read is still running here.
  setStatus('cancelling…', 'busy');
});

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

        const controller = new AbortController();
        startProgress(controller);

        try {
          const start = performance.now();

          const context = new Context(settings, {
            onProgress: appendProgress,
            signal: controller.signal
          });
          const reader = await Reader.fromBlob(c2pa, file.type, file, context);
          const manifestStore = await reader?.manifestStore();

          const elapsed = Math.round(performance.now() - start);

          console.log(manifestStore);
          console.log(`Took ${elapsed}ms`);
          finishProgress(`done in ${elapsed}ms`, 'done');

          await reader?.free();
        } catch (e) {
          if (isCancelled(e)) {
            finishProgress('cancelled', 'cancelled');
          } else {
            console.log('caught error', e);
            finishProgress('error — see console', 'error');
          }
        }
      }
    });
  }
  e.preventDefault();
});
