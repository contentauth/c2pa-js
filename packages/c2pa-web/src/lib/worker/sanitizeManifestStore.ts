/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * Rebuilds the manifest store's manifests map as a null-prototype object so
 * that reserved property names like "__proto__" are safe to use as keys.
 *
 * serde_wasm_bindgen uses bracket assignment when serializing HashMap entries.
 * For the key "__proto__", `obj["__proto__"] = value` triggers [[SetPrototypeOf]]
 * instead of creating an own property, putting that manifest in the prototype
 * chain rather than the object itself. postMessage's structured clone only
 * copies own properties, so it would disappear in transit. We detect this by
 * checking whether the prototype was changed, and restore the manifest as an
 * own property before the value leaves the worker.
 *
 * The recovered value's key is always the literal string "__proto__" -
 * that's the only key whose bracket assignment triggers [[SetPrototypeOf]] -
 * regardless of which manifest is active. It must be restored under that
 * key rather than `store.active_manifest`, otherwise a poisoned manifest
 * that isn't the active one would overwrite the genuine active manifest.
 */
export function sanitizeManifestStore(store: any): any {
  if (!store?.manifests) {
    return store;
  }

  const rawManifests = store.manifests;
  const sanitizedManifests = Object.assign(Object.create(null), rawManifests);

  const proto = Object.getPrototypeOf(rawManifests);
  if (proto !== null && proto !== Object.prototype) {
    sanitizedManifests['__proto__'] = proto;
  }

  store.manifests = sanitizedManifests;
  return store;
}
