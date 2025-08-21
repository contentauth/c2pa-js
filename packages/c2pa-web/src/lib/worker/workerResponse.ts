/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export function postSuccess(payload?: any, transfer?: Transferable[]): void {
  const responseObject = {
    type: 'success',
    ...(payload !== undefined ? { payload } : {}),
  };

  postMessage(responseObject, transfer ?? []);
}

export function postError(error: unknown): void {
  postMessage({ type: 'error', error });
}

export interface ResponseHandlers {
  onSuccess: (data?: any) => void;
  onError: (error?: any) => void;
}

export function handleWorkerResponse(
  worker: Worker,
  responseHandlers: ResponseHandlers
) {
  worker.onmessage = (event) => {
    const { data } = event;

    if (data.type === 'success') {
      responseHandlers.onSuccess(data?.payload);
    } else {
      responseHandlers.onError(data?.error);
    }
  };

  // @TODO: should these have their own error handlers?
  worker.onerror = (event) => {
    responseHandlers.onError(event.error);
  };

  worker.onmessageerror = (event) => {
    responseHandlers.onError(event.data);
  };
}
