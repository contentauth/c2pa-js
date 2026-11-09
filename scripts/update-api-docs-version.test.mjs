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
const nodeTag = '@contentauth/c2pa-node@0.10.0';
const nodeRelease = { ...release, tag_name: nodeTag };
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
    '@contentauth/c2pa-wasm@0.16.0',
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

test('node routing selects stable npm publications, not web or native rebuild inputs', () => {
  const mixed = [
    { name: '@contentauth/c2pa-web', version: '0.16.0' },
    { name: '@contentauth/c2pa-node', version: '0.10.0' }
  ];
  assert.equal(selectRelease('node', mixed, {}), nodeTag);
  assert.equal(selectRelease('node', [], { release: nodeRelease }), nodeTag);
  for (const excluded of [
    release,
    { ...nodeRelease, prerelease: true },
    { ...nodeRelease, draft: true },
    { ...nodeRelease, tag_name: `${nodeTag}-rc.1` }
  ]) {
    assert.equal(selectRelease('node', [], { release: excluded }), '');
  }
  assert.equal(
    selectRelease('node', [], { inputs: { version: '0.10.0' } }),
    ''
  );
  assert.equal(selectRelease('node', [mixed[0]], {}), '');
  assert.equal(
    selectRelease(
      'node',
      [mixed[0], { ...mixed[1], version: '0.10.0-rc.1' }],
      {}
    ),
    ''
  );
  assert.equal(
    selectRelease(
      'web',
      [mixed[0], { ...mixed[1], version: '0.10.0-rc.1' }],
      {}
    ),
    tag
  );
  assert.throws(
    () => selectRelease('node', [mixed[1], mixed[1]], {}),
    /multiple/
  );
  assert.throws(
    () => selectRelease('node', [{ ...mixed[1], version: 'latest' }], {}),
    /exact npm/
  );
});

test('dispatched tags validate both packages and select only their own index', () => {
  for (const [key, ownTag, otherTag] of [
    ['node', nodeTag, tag],
    ['web', tag, nodeTag]
  ]) {
    assert.equal(
      selectRelease(key, [], { inputs: { 'docs-release-tag': ownTag } }),
      ownTag
    );
    assert.equal(
      selectRelease(key, [], { inputs: { 'docs-release-tag': otherTag } }),
      ''
    );
    assert.equal(
      selectRelease(key, [], { inputs: { 'docs-release-tag': '' } }),
      ''
    );
    for (const invalidTag of [
      `${ownTag}-rc.1`,
      '@contentauth/c2pa-wasm@0.16.0',
      '@contentauth/c2pa-node@00.10.0',
      `${ownTag}\nunexpected`,
      '../main'
    ]) {
      assert.throws(
        () =>
          selectRelease(key, [], {
            inputs: { 'docs-release-tag': invalidTag }
          }),
        /exact stable release tag/
      );
    }
  }
});

test('node promotions preserve metadata, history and web index and reject invalid releases', async (t) => {
  const root = await fixture(t);
  const filename = path.join(root, 'api-docs/node-versions.json');
  const webBefore = await readFile(
    path.join(root, 'api-docs/web-versions.json'),
    'utf8'
  );
  const config = {
    ...initial,
    versions: ['0.9.10', '0.10.0', '0.9.9', '0.10.0']
  };
  await writeFile(filename, JSON.stringify(config));
  assert.equal(
    await updateReleaseVersion('node', nodeRelease, nodeTag, root),
    true
  );
  assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')), {
    ...config,
    versions: ['0.10.0', '0.9.10', '0.9.9']
  });
  assert.equal(
    await updateReleaseVersion('node', nodeRelease, nodeTag, root),
    false
  );
  const next = { ...nodeRelease, tag_name: '@contentauth/c2pa-node@0.10.1' };
  assert.equal(
    await updateReleaseVersion('node', next, next.tag_name, root),
    true
  );
  assert.deepEqual(JSON.parse(await readFile(filename, 'utf8')).versions, [
    '0.10.1',
    '0.10.0',
    '0.9.10',
    '0.9.9'
  ]);
  const before = await readFile(filename, 'utf8');
  for (const excluded of [
    release,
    { ...nodeRelease, prerelease: true },
    { ...nodeRelease, draft: true },
    { ...nodeRelease, tag_name: `${nodeTag}-rc.1` }
  ]) {
    assert.equal(
      await updateReleaseVersion('node', excluded, excluded.tag_name, root),
      false
    );
  }
  await assert.rejects(
    updateReleaseVersion('node', nodeRelease, tag, root),
    /different release/
  );
  await assert.rejects(
    updateReleaseVersion('node', { tag_name: nodeTag }, nodeTag, root),
    /flags/
  );
  assert.equal(await readFile(filename, 'utf8'), before);
  assert.equal(
    await readFile(path.join(root, 'api-docs/web-versions.json'), 'utf8'),
    webBefore
  );
  await writeFile(filename, '{"versions":["latest"]}');
  await assert.rejects(
    updateReleaseVersion('node', nodeRelease, nodeTag, root),
    /exact npm/
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

for (const packageKeys of [['web'], ['node'], ['web', 'node']]) {
  test(`workflow persists ${packageKeys.join(
    '+'
  )} to main without empty commits and fails on errors`, async (t) => {
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
      gh: '#!/bin/sh\nprintf \'{"tag_name":"%s","draft":false,"prerelease":false}\\n\' "$DOCS_RELEASE_TAG"\n',
      npm: '#!/bin/sh\nprintf \'"%s"\\n\' "${DOCS_RELEASE_TAG##*@}"\n',
      sleep: '#!/bin/sh\nexit 0\n'
    })) {
      await writeFile(path.join(bin, name), script);
      await chmod(path.join(bin, name), 0o755);
    }
    const workflow = await readFile(
      path.join(ROOT, '.github/workflows/release.yml'),
      'utf8'
    );
    const shellFor = (packageKey, action) => {
      const block = workflow
        .split(
          `      - name: ${
            action === 'select'
              ? 'Resolve stable'
              : 'Verify release and persist'
          } ${packageKey} documentation ${
            action === 'select' ? 'release' : 'version'
          }\n`
        )[1]
        .split('\n      - ')[0];
      return block
        .split('        run: |\n')[1]
        .split('\n')
        .map((line) => line.replace(/^ {10}/, ''))
        .join('\n');
    };
    const eventPath = path.join(root, 'event.json');
    const outputPath = path.join(root, 'output');
    const publications = packageKeys.map((key) => ({
      name: `@contentauth/c2pa-${key}`,
      version: key === 'web' ? '0.16.0' : '0.10.0'
    }));
    await writeFile(eventPath, '{}');
    const run = (packageKey, action = 'update') =>
      spawnSync(
        'bash',
        [
          '--noprofile',
          '--norc',
          '-eo',
          'pipefail',
          '-c',
          shellFor(packageKey, action)
        ],
        {
          cwd: root,
          encoding: 'utf8',
          env: {
            ...process.env,
            PATH: `${bin}:${process.env.PATH}`,
            RUNNER_TEMP: root,
            GITHUB_REPOSITORY: 'contentauth/c2pa-js',
            DOCS_RELEASE_TAG: `@contentauth/c2pa-${packageKey}@${
              packageKey === 'web' ? '0.16.0' : '0.10.0'
            }`,
            GITHUB_EVENT_PATH: eventPath,
            GITHUB_OUTPUT: outputPath,
            PUBLISHED_PACKAGES: JSON.stringify(publications)
          }
        }
      );
    const initialHead = git('rev-parse', 'HEAD');
    for (const packageKey of ['web', 'node']) {
      await writeFile(outputPath, '');
      const selected = run(packageKey, 'select');
      assert.equal(selected.status, 0, selected.stderr);
      assert.equal(
        await readFile(outputPath, 'utf8'),
        `tag=${
          packageKeys.includes(packageKey)
            ? `@contentauth/c2pa-${packageKey}@${
                packageKey === 'web' ? '0.16.0' : '0.10.0'
              }`
            : ''
        }\n`
      );
      if (!packageKeys.includes(packageKey)) continue;
      const first = run(packageKey);
      assert.equal(first.status, 0, first.stderr);
      assert.equal(git('rev-parse', 'HEAD'), git('rev-parse', 'origin/main'));
      assert.deepEqual(
        git('diff-tree', '--no-commit-id', '--name-only', '-r', 'HEAD').split(
          '\n'
        ),
        [`api-docs/${packageKey}-versions.json`]
      );
    }
    const head = git('rev-parse', 'HEAD');
    assert.deepEqual(
      git('diff', '--name-only', initialHead, head).split('\n').sort(),
      packageKeys.map((key) => `api-docs/${key}-versions.json`).sort()
    );
    for (const packageKey of packageKeys) {
      const rerun = run(packageKey);
      assert.equal(rerun.status, 0, rerun.stderr);
      assert.equal(git('rev-parse', 'HEAD'), head);
    }
    for (const dispatchedTag of [tag, nodeTag]) {
      await writeFile(
        eventPath,
        JSON.stringify({
          inputs: { 'docs-release-tag': dispatchedTag }
        })
      );
      for (const key of ['web', 'node']) {
        await writeFile(outputPath, '');
        const selected = run(key, 'select');
        assert.equal(selected.status, 0, selected.stderr);
        const expected = dispatchedTag.startsWith(`@contentauth/c2pa-${key}@`)
          ? dispatchedTag
          : '';
        assert.equal(await readFile(outputPath, 'utf8'), `tag=${expected}\n`);
      }
    }
    const packageKey = packageKeys.at(-1);
    const filename = `api-docs/${packageKey}-versions.json`;

    await writeFile(
      path.join(root, 'remote.git/hooks/pre-receive'),
      '#!/bin/sh\nexit 1\n'
    );
    await chmod(path.join(root, 'remote.git/hooks/pre-receive'), 0o755);
    await writeFile(
      path.join(root, filename),
      JSON.stringify(packageKey === 'web' ? initial : { versions: ['0.9.10'] })
    );
    git('add', filename);
    git('commit', '-m', 'restore fixture list');
    const failedPush = run(packageKey);
    assert.notEqual(failedPush.status, 0);
    assert.match(failedPush.stderr, /rejected/);

    const failedHead = git('rev-parse', 'HEAD');
    await writeFile(
      path.join(bin, 'gh'),
      '#!/bin/sh\nprintf \'{"tag_name":"wrong","draft":false,"prerelease":false}\\n\'\n'
    );
    const invalidMetadata = run(packageKey);
    assert.notEqual(invalidMetadata.status, 0);
    assert.match(invalidMetadata.stderr, /different release/);
    assert.equal(git('rev-parse', 'HEAD'), failedHead);

    await writeFile(
      path.join(bin, 'npm'),
      '#!/bin/sh\nprintf \'"0.0.0"\\n\'\n'
    );
    const failedPublication = run(packageKey);
    assert.notEqual(failedPublication.status, 0);
    assert.match(failedPublication.stdout, /unavailable after retrying/);
    await writeFile(path.join(bin, 'npm'), '#!/bin/sh\nexit 1\n');
    const missingPublication = run(packageKey);
    assert.notEqual(missingPublication.status, 0);
    assert.match(missingPublication.stdout, /unavailable after retrying/);
    assert.equal(git('rev-parse', 'HEAD'), failedHead);
  });
}

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
  assert.equal(shouldDispatch('release', nodeRelease), true);
  assert.equal(shouldDispatch('push'), false);
  assert.equal(shouldDispatch('workflow_dispatch'), false);
  assert.equal(
    shouldDispatch('release', { ...release, prerelease: true }),
    false
  );
  assert.equal(shouldDispatch('release', { ...release, draft: true }), false);
  for (const name of ['c2pa-wasm', 'c2pa-types']) {
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
  for (const releaseTag of [tag, nodeTag]) {
    const dispatched = run(releaseTag);
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
      `docs-release-tag=${releaseTag}`
    ]);
    assert.notEqual(run(releaseTag, '1').status, 0);
  }
  for (const invalidTag of [
    '@contentauth/c2pa-wasm@0.16.0',
    '@contentauth/c2pa-node@0.10.0-beta.1',
    '@contentauth/c2pa-node@00.10.0',
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
    shouldDeploy('workflow_dispatch', {
      inputs: { 'docs-release-tag': nodeTag }
    }),
    true
  );
  assert.equal(
    shouldDeploy(
      'release',
      { release: nodeRelease },
      '',
      `refs/tags/${nodeTag}`
    ),
    false
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
  assert.equal(docs.split('run: pnpm ci:docs').length - 1, 1);
  assert.equal(docs.split('uses: actions/deploy-pages@v4').length - 1, 1);
  assert.ok(
    docs.indexOf('update node "$metadata"') < docs.indexOf('run: pnpm ci:docs')
  );
  assert.ok(
    docs.indexOf('git push origin HEAD:main') <
      docs.indexOf('run: pnpm ci:docs')
  );
  assert.ok(
    docs.indexOf('run: pnpm ci:docs') <
      docs.indexOf('uses: actions/deploy-pages@v4')
  );
});
