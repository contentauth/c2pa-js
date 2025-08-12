/**
 * Maintains a map of wasm-bindgen objects in the worker's scope, keyed by unique ID
 */
export function createWorkerObjectMap<T>() {
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
    },
  };
}
