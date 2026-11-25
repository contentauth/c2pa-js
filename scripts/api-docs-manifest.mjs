/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

export const STABLE_VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const LINE = /^(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
export const PACKAGE_NAMES = {
  web: '@contentauth/c2pa-web',
  node: '@contentauth/c2pa-node'
};

export function versionLine(version) {
  return version.split('.').slice(0, 2).join('.');
}

export function compareVersions(left, right) {
  const a = left.split('.').map(BigInt);
  const b = right.split('.').map(BigInt);
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i] ? -1 : 1;
  }
  return 0;
}

export function validateVersions(versions) {
  if (
    !Array.isArray(versions) ||
    versions.length === 0 ||
    versions.some(
      (version) => typeof version !== 'string' || !STABLE_VERSION.test(version)
    ) ||
    new Set(versions.map(versionLine)).size !== versions.length ||
    versions.some(
      (version, i) =>
        i > 0 && compareVersions(versions[i - 1], version) >= 0
    )
  ) {
    throw new Error(
      'Documentation versions must be a non-empty list of unique exact npm versions, stable and descending, one per major/minor line.'
    );
  }
  return versions;
}

export function validateManifest(config) {
  validateVersions(config?.versions);
  const active = new Set(config.versions.map(versionLine));
  if (
    !Array.isArray(config.retiredLines) ||
    config.retiredLines.some(
      (line) => typeof line !== 'string' || !LINE.test(line) || active.has(line)
    ) ||
    new Set(config.retiredLines).size !== config.retiredLines.length ||
    !config.aliases ||
    typeof config.aliases !== 'object' ||
    Array.isArray(config.aliases)
  ) {
    throw new Error(
      'Expected unique retiredLines disjoint from active lines and an aliases object.'
    );
  }
  for (const [alias, line] of Object.entries(config.aliases)) {
    if (
      !STABLE_VERSION.test(alias) ||
      !active.has(line) ||
      versionLine(alias) !== line
    ) {
      throw new Error(
        'Aliases must map historical exact versions to their active major/minor line.'
      );
    }
    const selected = config.versions.find(
      (version) => versionLine(version) === line
    );
    if (compareVersions(alias, selected) < 0) {
      throw new Error('An alias cannot be newer than the selected patch.');
    }
  }
  return config;
}

export function promoteVersions(config, publishedVersions) {
  validateManifest(config);
  const selected = new Map(
    config.versions.map((version) => [versionLine(version), version])
  );
  const aliases = { ...config.aliases };
  const highest = [...selected.keys(), ...config.retiredLines]
    .map((line) => `${line}.0`)
    .sort(compareVersions)[0];
  for (const version of publishedVersions) {
    if (typeof version !== 'string' || !STABLE_VERSION.test(version)) {
      throw new Error('Expected exact stable npm versions to promote.');
    }
    const line = versionLine(version);
    if (config.retiredLines.includes(line)) continue;
    const previous = selected.get(line);
    if (!previous && compareVersions(`${line}.0`, highest) >= 0) continue;
    if (!previous || compareVersions(version, previous) < 0) {
      selected.set(line, version);
    }
    if (previous) aliases[previous] = line;
    aliases[version] = line;
  }
  return validateManifest({
    ...config,
    versions: [...selected.values()].sort(compareVersions),
    aliases: Object.fromEntries(
      Object.entries(aliases).sort(([a], [b]) => compareVersions(a, b))
    )
  });
}
