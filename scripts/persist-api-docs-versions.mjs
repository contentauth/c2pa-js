/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  PACKAGE_NAMES,
  promoteVersions,
  validateManifest
} from './api-docs-manifest.mjs';
import { selectRelease, stableVersion } from './update-api-docs-version.mjs';

const MANIFESTS = Object.fromEntries(
  Object.keys(PACKAGE_NAMES).map((key) => [
    key,
    `api-docs/${key}-versions.json`
  ])
);

export function githubClient(repository, token, fetcher = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository || '') || !token) {
    throw new Error('Expected a repository and dedicated documentation App token.');
  }
  return async (route, options = {}) => {
    const response = await fetcher(
      `https://api.github.com/repos/${repository}/${route}`,
      {
        method: options.method || 'GET',
        headers: {
          Accept: 'application/vnd.github+json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-GitHub-Api-Version': '2022-11-28'
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(60000)
      }
    );
    if (!response.ok) {
      const error = new Error(`GitHub ${options.method || 'GET'} ${route}: HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  };
}

export async function publishedVersions(
  api,
  expectedTags = [],
  fetcher = fetch,
  wait = sleep
) {
  const keys = Object.keys(PACKAGE_NAMES);
  for (const tag of expectedTags) {
    if (!keys.some((key) => stableVersion(key, tag))) {
      throw new Error('Expected exact stable web or node documentation release tags.');
    }
  }
  for (let attempt = 0; attempt < 7; attempt++) {
    const releases = [];
    for (let page = 1; ; page++) {
      const entries = await api(`releases?per_page=100&page=${page}`);
      if (!Array.isArray(entries)) throw new Error('Expected GitHub releases array.');
      releases.push(...entries);
      if (entries.length < 100) break;
    }
    const result = {};
    for (const key of keys) {
      const name = PACKAGE_NAMES[key];
      const response = await fetcher(
        `https://registry.npmjs.org/${encodeURIComponent(name)}`,
        {
          headers: { Accept: 'application/vnd.npm.install-v1+json' },
          signal: AbortSignal.timeout(60000)
        }
      );
      if (!response.ok) {
        throw new Error(`Cannot verify ${name} on npm: HTTP ${response.status}`);
      }
      const metadata = await response.json();
      if (metadata.name !== name || !metadata.versions) {
        throw new Error(`Invalid npm metadata for ${name}.`);
      }
      result[key] = releases
        .filter((release) => release.draft === false && release.prerelease === false)
        .map((release) => stableVersion(key, release.tag_name))
        .filter((version) =>
          version &&
          metadata.versions[version]?.name === name &&
          metadata.versions[version]?.version === version
        );
    }
    if (expectedTags.every((tag) =>
      keys.some((key) => result[key].includes(stableVersion(key, tag)))
    )) {
      return result;
    }
    if (attempt < 6) await wait([5000, 10000, 20000, 30000, 50000, 70000][attempt]);
  }
  throw new Error('Expected GitHub release or exact npm publication unavailable after retrying.');
}

export async function persistVersions(api, versions, wait = sleep) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = await api('git/ref/heads/main');
    const head = ref.object.sha;
    const commit = await api(`git/commits/${head}`);
    const tree = [];
    for (const [key, filename] of Object.entries(MANIFESTS)) {
      const file = await api(`contents/${filename}?ref=${head}`);
      if (file.encoding !== 'base64' || typeof file.content !== 'string') {
        throw new Error(`Expected base64 manifest content for ${filename}.`);
      }
      const before = Buffer.from(file.content, 'base64').toString('utf8');
      const config = validateManifest(JSON.parse(before));
      const next = promoteVersions(config, versions[key] || []);
      if (JSON.stringify(config) !== JSON.stringify(next)) {
        tree.push({
          path: filename,
          mode: '100644',
          type: 'blob',
          content: JSON.stringify(next, null, 2) + '\n'
        });
      }
    }
    if (!tree.length) return head;
    const updatedTree = await api('git/trees', {
      method: 'POST',
      body: { base_tree: commit.tree.sha, tree }
    });
    const updatedCommit = await api('git/commits', {
      method: 'POST',
      body: {
        message:
          'docs: update published API documentation lines\n\n' +
          'Co-authored-by: Copilot App <223556219+Copilot@users.noreply.github.com>',
        tree: updatedTree.sha,
        parents: [head]
      }
    });
    try {
      await api('git/refs/heads/main', {
        method: 'PATCH',
        body: { sha: updatedCommit.sha, force: false }
      });
      return updatedCommit.sha;
    } catch (error) {
      if (![409, 422].includes(error.status) || attempt === 4) throw error;
      // Re-read both manifests: another writer or a human may have retired a line.
      await wait(1000 * (attempt + 1));
    }
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const api = githubClient(process.env.GITHUB_REPOSITORY, process.env.DOCS_APP_TOKEN);
  const event = JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
  if (process.env.DOCS_RELEASE_TAG) {
    event.inputs = {
      ...event.inputs,
      'docs-release-tag': process.env.DOCS_RELEASE_TAG
    };
  }
  const packages = JSON.parse(process.env.PUBLISHED_PACKAGES || '[]');
  const tags = Object.keys(PACKAGE_NAMES)
    .map((key) => selectRelease(key, packages, event))
    .filter(Boolean);
  const versions = await publishedVersions(api, tags);
  console.log(`Documentation manifests persisted at ${await persistVersions(api, versions)}.`);
}
