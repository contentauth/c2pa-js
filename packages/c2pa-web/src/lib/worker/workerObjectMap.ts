/**
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export interface WorkerObjectMap<T> {
  add(object: T): number;
  get(id: number): T;
  remove(id: number): boolean;
}

export function createWorkerObjectMap<T>(): WorkerObjectMap<T> {
  let objId = 0;
  const objectMap = new Map<number, T>();

  return {
    add(object: T): number {
      const id = objId++;
      objectMap.set(id, object);
      return id;
    },

    get(id: number): T {
      const maybeObject = objectMap.get(id);

      if (!maybeObject) {
        throw new Error('Attempted to use an object that has been freed');
      }

      return maybeObject;
    },

    remove(id: number): boolean {
      return objectMap.delete(id);
    }
  };
}
