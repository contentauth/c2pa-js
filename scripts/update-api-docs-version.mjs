/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PACKAGE_NAMES,
  STABLE_VERSION,
  promoteVersions,
  validateManifest
} from './api-docs-manifest.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));

function packageName(packageKey) {
  if (!Object.hasOwn(PACKAGE_NAMES, packageKey)) {
    throw new Error('Choose a documentation package: node or web.');
  }
  return PACKAGE_NAMES[packageKey];
}

export function stableVersion(packageKey, tag) {
  const prefix = `${packageName(packageKey)}@`;
  if (typeof tag !== 'string' || !tag.startsWith(prefix)) return null;
  const version = tag.slice(prefix.length);
  return STABLE_VERSION.test(version) ? version : null;
}

export function selectRelease(packageKey, publishedPackages, event) {
  const name = packageName(packageKey);
  const dispatchedTag = event.inputs?.['docs-release-tag'];
  if (dispatchedTag) {
    if (
      !Object.keys(PACKAGE_NAMES).some((key) => stableVersion(key, dispatchedTag))
    ) {
      throw new Error(
        'Expected an exact stable release tag for a documentation package.'
      );
    }
    return stableVersion(packageKey, dispatchedTag) ? dispatchedTag : '';
  }
  if (event.release) {
    const release = event.release;
    return release.prerelease === false &&
      release.draft === false &&
      stableVersion(packageKey, release.tag_name)
      ? release.tag_name
      : '';
  }
  if (!Array.isArray(publishedPackages)) {
    throw new Error('Expected Changesets publishedPackages to be an array.');
  }
  const packages = publishedPackages.filter((entry) => entry.name === name);
  if (packages.length > 1) {
    throw new Error(`Changesets returned multiple releases for ${name}.`);
  }
  if (!packages.length) return '';
  const version = packages[0].version;
  if (
    typeof version !== 'string' ||
    !/^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version)
  ) {
    throw new Error('Expected an exact npm version from Changesets.');
  }
  return STABLE_VERSION.test(version) ? `${name}@${version}` : '';
}

export async function updateReleaseVersion(
  packageKey,
  release,
  expectedTag,
  root = ROOT
) {
  packageName(packageKey);
  if (release.tag_name !== expectedTag) {
    throw new Error('GitHub returned a different release than requested.');
  }
  if (
    typeof release.prerelease !== 'boolean' ||
    typeof release.draft !== 'boolean'
  ) {
    throw new Error('Expected GitHub release draft and prerelease flags.');
  }
  const version = stableVersion(packageKey, release.tag_name);
  if (!version || release.prerelease || release.draft) return false;

  const filename = path.join(root, `api-docs/${packageKey}-versions.json`);
  const config = validateManifest(JSON.parse(await readFile(filename, 'utf8')));
  const next = promoteVersions(config, [version]);
  if (JSON.stringify(config) === JSON.stringify(next)) return false;
  await writeFile(
    filename,
    JSON.stringify(next, null, 2) + '\n'
  );
  return true;
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const [command, packageKey, metadataFile] = process.argv.slice(2);
  if (command === 'select') {
    const event = JSON.parse(
      await readFile(process.env.GITHUB_EVENT_PATH, 'utf8')
    );
    const publishedPackages = JSON.parse(
      process.env.PUBLISHED_PACKAGES || '[]'
    );
    console.log(selectRelease(packageKey, publishedPackages, event));
  } else if (command === 'update') {
    const release = JSON.parse(await readFile(metadataFile, 'utf8'));
    const changed = await updateReleaseVersion(
      packageKey,
      release,
      process.env.DOCS_RELEASE_TAG
    );
    console.log(
      changed ? 'Documentation version promoted.' : 'No index change.'
    );
  } else {
    throw new Error('Choose select or update.');
  }
}
