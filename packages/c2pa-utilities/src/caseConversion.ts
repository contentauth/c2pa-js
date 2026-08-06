/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

/**
 * Any value that can appear inside a resolved Settings object when `snakeCaseifyValue` walks
 * it: the primitives Settings fields actually use (string, boolean), undefined (optional
 * fields), a nested object, or an array of any of these — recursive so arbitrarily nested
 * structures (including arrays of objects) get walked without losing array-ness. Deliberately
 * narrower than "any JSON value" (no numbers, for instance) since no current Settings field
 * needs one. We can widen this if that changes.
 */
export type SettingsValue =
  | string
  | boolean
  | undefined
  | SettingsObjectType
  | SettingsValue[];
export type SettingsObjectType = {
  [k: string]: SettingsValue;
};

/**
 * Recursively converts an object's camelCase keys to snake_case, matching the format
 * `c2pa-rs` expects for settings JSON/TOML. Arrays are preserved as arrays — only their
 * object elements (if any) get their keys snake-cased — since `typeof [] === 'object'` in
 * JS and a naive `Object.entries`-based recursion would otherwise flatten an array into a
 * `{"0": ..., "1": ...}` object instead of a JSON array.
 */
export function snakeCaseify(object: SettingsObjectType): SettingsObjectType {
  const formattedObject = Object.entries(object).reduce(
    (formattedObject, [key, val]) => {
      formattedObject[snakeCase(key)] = snakeCaseifyValue(val);
      return formattedObject;
    },
    {} as SettingsObjectType
  );

  return formattedObject;
}

function snakeCaseifyValue(val: SettingsValue): SettingsValue {
  if (Array.isArray(val)) {
    return val.map(snakeCaseifyValue);
  }
  if (typeof val === 'object' && val !== null) {
    return snakeCaseify(val);
  }
  return val;
}

function snakeCase(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
