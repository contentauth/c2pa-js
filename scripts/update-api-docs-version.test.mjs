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
import {
  chmod,
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { ROOT } from './generate-api-docs.mjs';
import {
  selectRelease,
  updateReleaseVersion
} from './update-api-docs-version.mjs';

const tag = '@contentauth/c2pa-web@0.16.0';
const release = { tag_name: tag, draft: false, prerelease: false };
const initial = {
  versions: ['0.15.4', '0.16.0', '0.15.3', '0.16.0'],
  metadata: { keep: ['unchanged'] }
};

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'docs-release-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'api-docs'));
  await writeFile(
    path.join(root, 'api-docs/web-versions.json'),
    JSON.stringify(initial)
  );
  await writeFile(
    path.join(root, 'api-docs/node-versions.json'),
    '{"versions":["0.9.10"]}\n'
  );
  return root;
}

test('selects only the requested stable Changesets package or published release', () => {
  assert.equal(
    selectRelease(
      'web',
      [
        { name: '@contentauth/c2pa-node', version: '0.10.0' },
        { name: '@contentauth/c2pa-web', version: '0.16.0' }
      ],
      {}
    ),
    tag
  );
  assert.equal(selectRelease('web', [], { release }), tag);
  assert.equal(
    selectRelease('web', [], { inputs: { 'docs-release-tag': tag } }),
    tag
  );
  assert.equal(
    selectRelease('web', [], { inputs: { 'docs-release-tag': '' } }),
    ''
  );
  for (const invalidTag of [
    '@contentauth/c2pa-node@0.16.0',
    '@contentauth/c2pa-web@0.16.0-rc.1',
    '@contentauth/c2pa-web@../main',
    `${tag}\nunexpected`
  ]) {
    assert.throws(
      () =>
        selectRelease('web', [], {
          inputs: { 'docs-release-tag': invalidTag }
        }),
      /exact stable release tag/
    );
  }
  for (const eventRelease of [
    { ...release, prerelease: true },
    { ...release, draft: true },
    { ...release, tag_name: '@contentauth/c2pa-node@0.16.0' },
    { ...release, tag_name: '@contentauth/c2pa-wasm@0.16.0' },
    { ...release, tag_name: '@contentauth/c2pa-web@0.16.0-rc.1' },
    { ...release, tag_name: '@contentauth/c2pa-web@../main' }
  ]) {
    assert.equal(selectRelease('web', [], { release: eventRelease }), '');
  }
  for (const packages of [
    [],
    [{ name: '@contentauth/c2pa-node', version: '0.10.0' }],
    [{ name: '@contentauth/c2pa-web', version: '0.16.0-rc.1' }]
  ]) {
    assert.equal(selectRelease('web', packages, {}), '');
  }
  assert.throws(() => selectRelease('unknown', [], {}), /Choose/);
  assert.throws(() => selectRelease('web', {}, {}), /array/);
  assert.throws(
    () =>
      selectRelease(
        'web',
        [{ name: '@contentauth/c2pa-web', version: 'latest' }],
        {}
      ),
    /exact npm/
  );
  assert.throws(
    () =>
      selectRelease(
        'web',
        [
          { name: '@contentauth/c2pa-web', version: '0.16.0' },
          { name: '@contentauth/c2pa-web', version: '0.16.1' }
        ],
        {}
      ),
    /multiple/
  );
});

test('promotes, deduplicates and prepends exact versions preserving metadata and node index', async (t) => {
  const root = await fixture(t);
  const nodeBefore = await readFile(
    path.join(root, 'api-docs/node-versions.json'),
    'utf8'
  );
  assert.equal(await updateReleaseVersion('web', release, tag, root), true);
  const filename = path.join(root, 'api-docs/web-versions.json');
  const promoted = await readFile(filename, 'utf8');
  assert.deepEqual(JSON.parse(promoted), {
    ...initial,
    versions: ['0.16.0', '0.15.4', '0.15.3']
  });
  assert.equal(await updateReleaseVersion('web', release, tag, root), false);
  assert.equal(await readFile(filename, 'utf8'), promoted);
  const newer = { ...release, tag_name: '@contentauth/c2pa-web@0.16.1' };
  assert.equal(
    await updateReleaseVersion('web', newer, newer.tag_name, root),
    true
  );
  assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')).versions, [
    '0.16.1',
    '0.16.0',
    '0.15.4',
    '0.15.3'
  ]);
  assert.equal(
    await readFile(path.join(root, 'api-docs/node-versions.json'), 'utf8'),
    nodeBefore
  );
});

test('prereleases, drafts and other package tags cannot change web versions', async (t) => {
  const root = await fixture(t);
  const filename = path.join(root, 'api-docs/web-versions.json');
  const before = await readFile(filename, 'utf8');
  for (const excluded of [
    { ...release, prerelease: true },
    { ...release, draft: true },
    { ...release, tag_name: '@contentauth/c2pa-web@0.17.0-beta.1' },
    { ...release, tag_name: '@contentauth/c2pa-node@0.17.0' }
  ]) {
    assert.equal(
      await updateReleaseVersion('web', excluded, excluded.tag_name, root),
      false
    );
  }
  await assert.rejects(
    updateReleaseVersion('web', release, 'different', root),
    /different release/
  );
  await assert.rejects(
    updateReleaseVersion('web', { tag_name: tag }, tag, root),
    /flags/
  );
  assert.equal(await readFile(filename, 'utf8'), before);
  await writeFile(filename, '{"versions":["latest"],"keep":true}');
  await assert.rejects(
    updateReleaseVersion('web', release, tag, root),
    /exact npm/
  );
});

test('workflow persists to main without empty commits and fails on push or publication errors', async (t) => {
  const root = await fixture(t);
  await mkdir(path.join(root, 'scripts'));
  for (const filename of [
    'generate-api-docs.mjs',
    'update-api-docs-version.mjs'
  ]) {
    await cp(
      path.join(ROOT, 'scripts', filename),
      path.join(root, 'scripts', filename)
    );
  }
  await symlink(
    path.join(ROOT, 'node_modules'),
    path.join(root, 'node_modules')
  );
  const git = (...args) =>
    execFileSync('git', args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  git('init', '-b', 'main');
  git('config', 'user.name', 'Test');
  git('config', 'user.email', 'test@example.invalid');
  git('add', 'api-docs');
  git('commit', '-m', 'fixture');
  git('init', '--bare', path.join(root, 'remote.git'));
  git('remote', 'add', 'origin', path.join(root, 'remote.git'));
  git('push', 'origin', 'main');
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  for (const [name, script] of Object.entries({
    gh: `#!/bin/sh\ncat <<'JSON'\n${JSON.stringify(release)}\nJSON\n`,
    npm: '#!/bin/sh\nprintf \'"0.16.0"\\n\'\n',
    sleep: '#!/bin/sh\nexit 0\n'
  })) {
    await writeFile(path.join(bin, name), script);
    await chmod(path.join(bin, name), 0o755);
  }
  const workflow = await readFile(
    path.join(ROOT, '.github/workflows/release.yml'),
    'utf8'
  );
  const block = workflow
    .split(
      '      - name: Verify release and persist web documentation version\n'
    )[1]
    .split('\n      - run:')[0];
  const shell = block
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.replace(/^ {10}/, ''))
    .join('\n');
  const run = () =>
    spawnSync(
      'bash',
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', shell],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          RUNNER_TEMP: root,
          GITHUB_REPOSITORY: 'contentauth/c2pa-js',
          DOCS_RELEASE_TAG: tag
        }
      }
    );
  const first = run();
  assert.equal(first.status, 0, first.stderr);
  assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'));
  const head = git('rev-parse', 'HEAD');
  assert.deepEqual(
    git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split('\n'),
    ['api-docs/web-versions.json']
  );
  const rerun = run();
  assert.equal(rerun.status, 0, rerun.stderr);
  assert.equal(git('rev-parse', 'HEAD'), head);

  await writeFile(
    path.join(root, 'remote.git/hooks/pre-receive'),
    '#!/bin/sh\nexit 1\n'
  );
  await chmod(path.join(root, 'remote.git/hooks/pre-receive'), 0o755);
  await writeFile(
    path.join(root, 'api-docs/web-versions.json'),
    JSON.stringify(initial)
  );
  git('add', 'api-docs/web-versions.json');
  git('commit', '-m', 'restore fixture list');
  const failedPush = run();
  assert.notEqual(failedPush.status, 0);
  assert.match(failedPush.stderr, /rejected/);

  await writeFile(path.join(bin, 'npm'), '#!/bin/sh\nexit 1\n');
  const failedPublication = run();
  assert.notEqual(failedPublication.status, 0);
  assert.match(failedPublication.stdout, /unavailable after retrying/);
});

test('release events dispatch docs on main without entering the Pages environment', async (t) => {
  const root = await fixture(t);
  const workflow = await readFile(
    path.join(ROOT, '.github/workflows/release.yml'),
    'utf8'
  );
  const dispatch = workflow
    .split('  dispatch-release-docs:\n')[1]
    .split('\n  release:\n')[0];
  assert.doesNotMatch(dispatch, /environment:/);
  assert.match(dispatch, /actions: write/);
  const condition = dispatch.split('    if: |\n')[1].split('    runs-on:')[0];
  const shouldDispatch = (eventName, eventRelease) =>
    vm.runInNewContext(condition, {
      startsWith: (value, prefix) => value.startsWith(prefix),
      github: { event_name: eventName, event: { release: eventRelease } }
    });
  assert.equal(shouldDispatch('release', release), true);
  assert.equal(shouldDispatch('push'), false);
  assert.equal(shouldDispatch('workflow_dispatch'), false);
  assert.equal(
    shouldDispatch('release', { ...release, prerelease: true }),
    false
  );
  assert.equal(shouldDispatch('release', { ...release, draft: true }), false);
  for (const name of ['c2pa-node', 'c2pa-wasm']) {
    assert.equal(
      shouldDispatch('release', {
        ...release,
        tag_name: `@contentauth/${name}@0.16.0`
      }),
      false
    );
  }
  const bin = path.join(root, 'bin');
  await mkdir(bin);
  const argsFile = path.join(root, 'dispatch-args');
  await writeFile(
    path.join(bin, 'gh'),
    '#!/bin/sh\nprintf "%s\\n" "$@" > "$ARGS_FILE"\nexit "${DISPATCH_STATUS:-0}"\n'
  );
  await chmod(path.join(bin, 'gh'), 0o755);
  const shell = dispatch
    .split('        run: |\n')[1]
    .split('\n')
    .map((line) => line.replace(/^ {10}/, ''))
    .join('\n');
  const run = (releaseTag, status = '0') =>
    spawnSync(
      'bash',
      ['--noprofile', '--norc', '-eo', 'pipefail', '-c', shell],
      {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: `${bin}:${process.env.PATH}`,
          DOCS_RELEASE_TAG: releaseTag,
          GITHUB_REPOSITORY: 'contentauth/c2pa-js',
          ARGS_FILE: argsFile,
          DISPATCH_STATUS: status
        }
      }
    );
  const dispatched = run(tag);
  assert.equal(dispatched.status, 0, dispatched.stderr);
  assert.deepEqual((await readFile(argsFile, 'utf8')).trim().split('\n'), [
    'workflow',
    'run',
    'release.yml',
    '--repo',
    'contentauth/c2pa-js',
    '--ref',
    'main',
    '-f',
    `docs-release-tag=${tag}`
  ]);
  assert.notEqual(run(tag, '1').status, 0);
  for (const invalidTag of [
    '@contentauth/c2pa-node@0.16.0',
    '@contentauth/c2pa-web@0.16.0-rc.1',
    '@contentauth/c2pa-web@00.16.0',
    `${tag}\nunexpected`
  ]) {
    await rm(argsFile, { force: true });
    const skipped = run(invalidTag);
    assert.equal(skipped.status, 0, skipped.stderr);
    assert.match(skipped.stdout, /skipping documentation dispatch/);
    await assert.rejects(readFile(argsFile), { code: 'ENOENT' });
  }
});

test('release routing only deploys from main and preserves explicit Changesets/manual rebuilds', async () => {
  const workflow = await readFile(
    path.join(ROOT, '.github/workflows/release.yml'),
    'utf8'
  );
  assert.match(workflow, /release:\n {4}types: \[published\]/);
  assert.match(workflow, /if: github\.event_name == 'push'/);
  const docs = workflow.split('  publish-docs:\n')[1];
  const condition = docs.split('    if: |\n')[1].split('    concurrency:')[0];
  const shouldDeploy = (
    eventName,
    event = {},
    published = '',
    ref = 'refs/heads/main'
  ) =>
    vm.runInNewContext(condition, {
      always: () => true,
      cancelled: () => false,
      startsWith: (value, prefix) => value.startsWith(prefix),
      github: { event_name: eventName, event, ref },
      inputs: { version: event.version || '' },
      needs: { release: { outputs: { published } } }
    });
  assert.equal(
    shouldDeploy('release', { release }, '', `refs/tags/${tag}`),
    false
  );
  assert.equal(shouldDeploy('release', { release }), false);
  assert.equal(
    shouldDeploy('release', { release: { ...release, prerelease: true } }),
    false
  );
  assert.equal(
    shouldDeploy('release', { release: { ...release, draft: true } }),
    false
  );
  assert.equal(
    shouldDeploy('release', {
      release: { ...release, tag_name: '@contentauth/c2pa-node@0.10.0' }
    }),
    false
  );
  assert.equal(
    shouldDeploy('release', {
      release: { ...release, tag_name: '@contentauth/c2pa-wasm@0.14.0' }
    }),
    false
  );
  assert.equal(shouldDeploy('push', {}, 'true'), true);
  assert.equal(shouldDeploy('push', {}, 'false'), false);
  assert.equal(shouldDeploy('workflow_dispatch'), true);
  assert.equal(
    shouldDeploy('workflow_dispatch', { inputs: { 'docs-release-tag': tag } }),
    true
  );
  assert.equal(
    shouldDeploy('workflow_dispatch', {}, '', 'refs/heads/feature'),
    false
  );
  assert.equal(shouldDeploy('push', {}, 'true', 'refs/heads/feature'), false);
  assert.equal(shouldDeploy('workflow_dispatch', { version: '0.10.0' }), false);
  assert.match(docs, /needs\.release\.outputs\.published == 'true'/);
  assert.match(
    docs,
    /github\.event_name == 'workflow_dispatch' && inputs\.version == ''/
  );
  assert.match(docs, /github\.ref == 'refs\/heads\/main'/);
  assert.match(docs, /ref: main/);
  assert.match(docs, /contents: write/);
  assert.ok(
    docs.indexOf('git push origin HEAD:main') <
      docs.indexOf('run: pnpm ci:docs')
  );
  assert.ok(
    docs.indexOf('run: pnpm ci:docs') <
      docs.indexOf('uses: actions/deploy-pages@v4')
  );
});
