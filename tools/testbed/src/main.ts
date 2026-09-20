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
  type ProgressReportEvent
} from '@contentauth/c2pa-utilities';
import wasmSrc from '@contentauth/c2pa-wasm/assets/c2pa_bg.wasm?url';

const c2pa = await createC2pa({ wasmSrc });

// One Context for every read, with settings configured and resolved once.
// Progress and cancellation are per call instead, as each read is independent.
const context = new Context({
  verify: { verifyTrust: false },
  cawgTrust: { verifyTrustList: false }
});

const dropzone = document.getElementById('drop-zone');
const panel = document.getElementById('progress-panel');
const status = document.getElementById('progress-status');
const cancelButton = document.getElementById('progress-cancel');
const log = document.getElementById('progress-log');

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

function appendProgress(event: ProgressReportEvent) {
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
  count.textContent =
    event.total === null
      ? `step ${event.step}`
      : event.total > 1
        ? `${event.step}/${event.total}`
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

        let reader: Reader | null = null;
        try {
          const start = performance.now();

          reader = await Reader.fromBlob(c2pa, file.type, file, context, {
            onProgress: appendProgress,
            signal: controller.signal
          });
          const manifestStore = await reader?.manifestStore();

          const elapsed = Math.round(performance.now() - start);

          console.log(manifestStore);
          console.log(`Took ${elapsed}ms`);
          finishProgress(`done in ${elapsed}ms`, 'done');
        } catch (e) {
          if (isCancelled(e)) {
            finishProgress('cancelled', 'cancelled');
          } else {
            console.log('caught error', e);
            finishProgress('error — see console', 'error');
          }
        } finally {
          await reader?.free();
        }
      }
    });
  }
  e.preventDefault();
});
