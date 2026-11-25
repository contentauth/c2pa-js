/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  PACKAGE_NAMES,
  promoteVersions,
  validateManifest
} from './api-docs-manifest.mjs';
import {
  githubClient,
  persistVersions,
  publishedVersions
} from './persist-api-docs-versions.mjs';

const ROOT = new URL('../', import.meta.url);
const initial = {
  versions: ['0.16.1', '0.15.4'],
  retiredLines: ['0.14'],
  aliases: { '0.16.1': '0.16', '0.16.0': '0.16', '0.15.4': '0.15' },
  metadata: { keep: true }
};
const tag = '@contentauth/c2pa-web@0.17.0';
const release = { tag_name: tag, draft: false, prerelease: false };

test('manifest validation rejects duplicate, unsafe, prerelease, unsorted and inconsistent lines', () => {
  assert.equal(validateManifest(initial), initial);
  for (const versions of [
    [], ['latest'], ['^0.16.1'], ['../main'], ['--help'], ['v0.16.1'],
    ['0.16.1\n'], ['01.16.1'], [15], [null], ['0.16.1-rc.1'],
    ['0.16.1', '0.16.0'], ['0.15.4', '0.16.1']
  ]) {
    assert.throws(() => validateManifest({ ...initial, versions }), /exact npm versions/);
  }
  for (const change of [
    { retiredLines: undefined }, { retiredLines: ['0.14', '0.14'] },
    { retiredLines: ['v0.14'] }, { retiredLines: ['0.16'] },
    { aliases: null }, { aliases: [] }, { aliases: { '../main': '0.16' } },
    { aliases: { '0.14.1': '0.14' } },
    { aliases: { '0.16.0': '0.15' } },
    { aliases: { '0.16.2': '0.16' } }
  ]) {
    assert.throws(() => validateManifest({ ...initial, ...change }));
  }
});

test('numeric promotion is monotonic, order-independent and idempotent', () => {
  const releases = ['0.16.0', '0.16.2', '0.16.10', '0.17.0', '0.15.5', '0.14.9', '0.13.8'];
  const promoted = promoteVersions(initial, releases);
  assert.deepEqual(promoted.versions, ['0.17.0', '0.16.10', '0.15.5']);
  assert.equal(promoted.aliases['0.16.2'], '0.16');
  assert.equal(promoted.aliases['0.14.9'], undefined);
  assert.equal(promoted.aliases['0.13.8'], undefined);
  assert.deepEqual(promoted.metadata, initial.metadata);
  assert.deepEqual(promoteVersions(initial, releases.toReversed()), promoted);
  assert.deepEqual(promoteVersions(promoted, releases), promoted);
  assert.deepEqual(promoteVersions(promoted, ['0.15.4']).versions, promoted.versions);
});

test('no historical backfill below the highest active or retired line', () => {
  const config = { ...initial, retiredLines: ['0.20'] };
  const promoted = promoteVersions(config, ['0.17.9', '0.19.0', '0.20.1', '0.21.0', '0.16.3']);
  assert.deepEqual(promoted.versions, ['0.21.0', '0.16.3', '0.15.4']);
  assert.deepEqual(promoted.retiredLines, ['0.20']);
  assert.equal(promoted.aliases['0.17.9'], undefined);
});

test('reconciliation requires exact GitHub and npm evidence, paginates and retries expected publications', async () => {
  let attempts = 0;
  const calls = [];
  const api = async (route) => {
    calls.push(route);
    if (route.endsWith('page=2')) return [];
    attempts++;
    return [
      ...Array.from({ length: 95 }, () => ({ ...release, tag_name: 'unrelated' })),
      release,
      { ...release, tag_name: '@contentauth/c2pa-node@0.12.0' },
      { ...release, tag_name: '@contentauth/c2pa-web@0.17.1', draft: true },
      { ...release, tag_name: '@contentauth/c2pa-web@0.18.0', prerelease: true },
      { ...release, tag_name: '@contentauth/c2pa-web@0.16.9' }
    ];
  };
  const fetcher = async (url, options) => {
    assert.equal(options.headers.Authorization, undefined, 'App token never sent to npm');
    const name = decodeURIComponent(new URL(url).pathname.slice(1));
    const version = name === PACKAGE_NAMES.web ? '0.17.0' : '0.12.0';
    return { ok: true, json: async () => ({
      name, versions: attempts > 1 ? { [version]: { name, version } } : {}
    }) };
  };
  assert.deepEqual(await publishedVersions(api, [tag], fetcher, async () => undefined), {
    web: ['0.17.0'], node: ['0.12.0']
  });
  assert.equal(attempts, 2);
  assert.ok(calls.includes('releases?per_page=100&page=2'));
  await assert.rejects(publishedVersions(async () => [], [tag], fetcher, async () => undefined), /unavailable after retrying/);
  await assert.rejects(publishedVersions(api, ['invalid'], fetcher), /exact stable/);
  await assert.rejects(publishedVersions(api, [], async () => ({ ok: false, status: 503 })), /HTTP 503/);
});

function fakeGitHub({ conflict = false, reject = 0 } = {}) {
  let head = 'head-1';
  const configs = { web: structuredClone(initial), node: structuredClone(initial) };
  const trees = [];
  const commits = [];
  const api = async (route, options = {}) => {
    if (route === 'git/ref/heads/main') return { object: { sha: head } };
    if (route.startsWith('git/commits/')) return { tree: { sha: `tree-${head}` } };
    if (route.startsWith('contents/')) {
      assert.ok(route.endsWith(`?ref=${head}`));
      const key = route.includes('web-versions') ? 'web' : 'node';
      return { encoding: 'base64', content: Buffer.from(JSON.stringify(configs[key])).toString('base64') };
    }
    if (route === 'git/trees') {
      trees.push(options.body);
      return { sha: `tree-${trees.length}` };
    }
    if (route === 'git/commits') {
      commits.push(options.body);
      return { sha: `commit-${commits.length}` };
    }
    if (route === 'git/refs/heads/main') {
      assert.equal(options.body.force, false);
      if (reject) throw Object.assign(new Error('Protection denied'), { status: reject });
      if (conflict && commits.length === 1) {
        head = 'head-2';
        configs.web = {
          ...initial, versions: ['0.16.20'], retiredLines: ['0.15', '0.14'],
          aliases: { '0.16.20': '0.16' }
        };
        throw Object.assign(new Error('Non-fast-forward'), { status: 422 });
      }
      head = options.body.sha;
      for (const entry of trees.at(-1).tree) {
        configs[entry.path.includes('web-') ? 'web' : 'node'] = JSON.parse(entry.content);
      }
      return { object: { sha: head } };
    }
    throw new Error(`Unexpected route: ${route}`);
  };
  return { api, trees, commits, configs };
}

test('App writer batches exactly two allowlisted manifests atomically and is idempotent', async () => {
  const fake = fakeGitHub();
  const versions = { web: ['0.17.0'], node: ['0.18.0'] };
  assert.equal(await persistVersions(fake.api, versions), 'commit-1');
  assert.deepEqual(fake.trees[0].tree.map((entry) => entry.path), [
    'api-docs/web-versions.json', 'api-docs/node-versions.json'
  ]);
  assert.equal(fake.commits.length, 1);
  assert.deepEqual(fake.commits[0].parents, ['head-1']);
  assert.equal(await persistVersions(fake.api, versions), 'commit-1');
  assert.equal(fake.commits.length, 1);
});

test('concurrent main updates recompute promotions, preserve retirement and cannot downgrade', async () => {
  const fake = fakeGitHub({ conflict: true });
  assert.equal(await persistVersions(fake.api, {
    web: ['0.15.8', '0.16.10'], node: ['0.17.0']
  }, async () => undefined), 'commit-2');
  assert.deepEqual(fake.commits[1].parents, ['head-2']);
  assert.deepEqual(fake.configs.web.versions, ['0.16.20']);
  assert.deepEqual(fake.configs.web.retiredLines, ['0.15', '0.14']);
  assert.equal(fake.configs.web.aliases['0.15.8'], undefined);
  assert.deepEqual(fake.configs.node.versions, ['0.17.0', '0.16.1', '0.15.4']);
});

test('protection failures fail immediately and repeated conflicts are bounded', async () => {
  for (const status of [403, 422]) {
    const fake = fakeGitHub({ reject: status });
    await assert.rejects(persistVersions(fake.api, { web: ['0.17.0'] }, async () => undefined), /Protection denied/);
    assert.equal(fake.commits.length, status === 403 ? 1 : 5);
  }
});

test('GitHub client requires a dedicated token and surfaces HTTP errors', async () => {
  assert.throws(() => githubClient('contentauth/c2pa-js', ''), /dedicated/);
  const api = githubClient('contentauth/c2pa-js', 'test-token', async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/contentauth/c2pa-js/git/refs/heads/main');
    assert.equal(options.headers.Authorization, 'Bearer test-token');
    assert.deepEqual(JSON.parse(options.body), { sha: 'new', force: false });
    return { ok: false, status: 403 };
  });
  await assert.rejects(api('git/refs/heads/main', { method: 'PATCH', body: { sha: 'new', force: false } }), /HTTP 403/);
});

test('workflow isolates the App writer and explicitly deploys after publication', async () => {
  const releaseWorkflow = await readFile(new URL('.github/workflows/release.yml', ROOT), 'utf8');
  const docs = await readFile(new URL('.github/workflows/docs.yml', ROOT), 'utf8');
  const writer = docs.split('  promote:\n')[1].split('  build:\n')[0];
  const build = docs.split('  build:\n')[1].split('  deploy:\n')[0];
  assert.match(writer, /app-id: \$\{\{ vars.C2PA_DOCS_APP_ID \}\}/);
  assert.match(writer, /private-key: \$\{\{ secrets.C2PA_DOCS_APP_PRIVATE_KEY \}\}/);
  assert.match(writer, /repositories: \$\{\{ github.event.repository.name \}\}/);
  assert.match(writer, /permission-contents: write/);
  assert.match(writer, /persist-credentials: false/);
  assert.doesNotMatch(writer, /install-dependencies|pnpm|npm install|concurrency:/);
  assert.doesNotMatch(writer, /GITHUB_TOKEN|pages: write|id-token: write/);
  assert.match(build, /needs: promote/);
  assert.doesNotMatch(build, /DOCS_APP_TOKEN|pages: write|id-token: write/);
  assert.match(docs, /Reject stale main snapshots/);
  assert.match(docs, /if: steps.current.outputs.deploy == 'true'/);
  assert.match(docs, /push:\n {4}branches: \[main\]/);
  assert.match(releaseWorkflow, /needs.release.outputs.published == 'true'/);
  assert.match(releaseWorkflow, /uses: \.\/\.github\/workflows\/docs.yml/);
  assert.match(releaseWorkflow, /publish: pnpm ci:release/);
  assert.doesNotMatch(releaseWorkflow, /^concurrency:/m);
});

test('release gate excludes bot/docs pushes but retains Changesets and package publication', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'docs-release-gate-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  await writeFile(path.join(root, 'package.json'), '{}');
  git('add', '.');
  git('commit', '-m', 'fixture');
  const workflow = await readFile(new URL('.github/workflows/release.yml', ROOT), 'utf8');
  const shell = workflow.split('        run: |\n')[1].split('\n  dispatch-release-docs:')[0]
    .split('\n').map((line) => line.replace(/^ {10}/, '')).join('\n');
  for (const [filename, expected] of [
    ['api-docs/web-versions.json', false], ['docs/guide.md', false],
    ['scripts/persist-api-docs-versions.mjs', false],
    ['.changeset/release.md', true], ['packages/c2pa-web/src/index.ts', true]
  ]) {
    const before = git('rev-parse', 'HEAD');
    await mkdir(path.dirname(path.join(root, filename)), { recursive: true });
    await writeFile(path.join(root, filename), 'changed');
    git('add', filename);
    git('commit', '-m', 'change');
    const output = path.join(root, 'output');
    await writeFile(output, '');
    const result = spawnSync('bash', ['-eo', 'pipefail', '-c', shell], {
      cwd: root, encoding: 'utf8',
      env: { ...process.env, BEFORE: before, AFTER: git('rev-parse', 'HEAD'), RUNNER_TEMP: root, GITHUB_OUTPUT: output }
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(await readFile(output, 'utf8'), `publish=${expected}\n`);
  }
});
