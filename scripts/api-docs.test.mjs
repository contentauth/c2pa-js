/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import assert from 'node:assert/strict';
import {
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { JSDOM } from 'jsdom';
import {
  ROOT,
  PACKAGES,
  buildSite,
  generateDocs,
  installRelease,
  loadVersions
} from './generate-api-docs.mjs';

const VERSIONS = {
  node: ['0.9.10', '0.9.9'],
  web: ['0.15.4', '0.15.3']
};

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'api-docs-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'api-docs'));
  for (const [key, versions] of Object.entries(VERSIONS)) {
    await writeFile(
      path.join(root, `api-docs/${key}-versions.json`),
      JSON.stringify({ versions })
    );
  }
  return root;
}

test('versions preserve each configured default and order', async (t) => {
  const root = await fixture(t);
  for (const [key, versions] of Object.entries(VERSIONS)) {
    assert.deepEqual(
      await loadVersions(path.join(root, `api-docs/${key}-versions.json`)),
      versions
    );
  }
});

test('invalid lists, ranges, tags and unsafe versions are rejected', async (t) => {
  const root = await fixture(t);
  const filename = path.join(root, 'api-docs/web-versions.json');
  for (const value of [
    null,
    [],
    {},
    { versions: '0.15.4' },
    ...[
      [],
      ['0.15.4', '0.15.4'],
      ['latest'],
      ['^0.15.4'],
      ['../main'],
      ['--help'],
      ['v0.15.4'],
      ['0.15.4\n'],
      ['01.15.4'],
      [15],
      [null]
    ].map((versions) => ({ versions }))
  ]) {
    await writeFile(filename, JSON.stringify(value));
    await assert.rejects(loadVersions(filename), /unique exact npm versions/);
  }
});

test('unknown package keys are rejected before accessing files', async (t) => {
  const root = await fixture(t);
  for (const key of ['../web', 'constructor', '__proto__', '', undefined]) {
    await assert.rejects(
      buildSite(key, root),
      /Choose a documentation package/
    );
  }
  assert.deepEqual(await readdir(root), ['api-docs']);
});

for (const [key, packageInfo] of Object.entries(PACKAGES)) {
  const versions = VERSIONS[key];
  const version = versions[0];

  test(`${key}: npm installs the exact release without lifecycle scripts`, async (t) => {
    const root = await fixture(t);
    const packageRoot = path.join(root, 'node_modules', packageInfo.name);
    const execute = async (command, args, options) => {
      assert.equal(command, 'npm');
      assert.equal(options.cwd, root);
      for (const flag of [
        '--ignore-scripts',
        '--workspaces=false',
        '--package-lock=false',
        '--registry=https://registry.npmjs.org'
      ]) {
        assert.ok(args.includes(flag), flag);
      }
      const manifest = JSON.parse(
        await readFile(path.join(root, 'package.json'))
      );
      assert.deepEqual(manifest.dependencies, { [packageInfo.name]: version });
      await mkdir(packageRoot, { recursive: true });
      await writeFile(
        path.join(packageRoot, 'package.json'),
        JSON.stringify({ name: packageInfo.name, version })
      );
    };
    assert.equal(
      await installRelease(packageInfo, version, root, execute),
      packageRoot
    );
  });

  test(`${key}: mismatched installed packages fail explicitly`, async (t) => {
    const root = await fixture(t);
    const packageRoot = path.join(root, 'node_modules', packageInfo.name);
    await mkdir(packageRoot, { recursive: true });
    for (const manifest of [
      { name: packageInfo.name, version: versions[1] },
      { name: 'other-package', version }
    ]) {
      await writeFile(
        path.join(packageRoot, 'package.json'),
        JSON.stringify(manifest)
      );
      await assert.rejects(
        installRelease(packageInfo, version, root, async () => undefined),
        /npm installed a different package/
      );
    }
  });

  test(`${key}: builds preserve other sites and publish the first version at the package root`, async (t) => {
    const root = await fixture(t);
    const other = key === 'web' ? 'node' : 'web';
    await mkdir(path.join(root, 'docs', other), { recursive: true });
    await writeFile(path.join(root, 'docs/index.html'), 'Multi-package site');
    await writeFile(
      path.join(root, 'docs', other, 'index.html'),
      'Other release site'
    );
    const installed = [];
    const generated = [];
    const install = async (info, version, stage) => {
      assert.equal(info, packageInfo);
      installed.push(version);
      return stage;
    };
    const generate = async (
      root,
      info,
      packageRoot,
      output,
      version,
      versions,
      prefix
    ) => {
      assert.equal(info, packageInfo);
      generated.push({ version, prefix });
      await mkdir(output, { recursive: true });
      await writeFile(path.join(output, 'index.html'), `${version}:${prefix}`);
    };
    const site = await buildSite(key, root, install, generate);
    assert.equal(site, path.join(root, 'docs', key));
    assert.deepEqual(installed, versions);
    assert.equal(generated.length, 3);
    assert.equal(
      await readFile(path.join(site, 'index.html'), 'utf8'),
      `${version}:`
    );
    for (const version of versions) {
      assert.equal(
        await readFile(
          path.join(site, 'versions', version, 'index.html'),
          'utf8'
        ),
        `${version}:versions/${version}`
      );
    }
    assert.equal(
      await readFile(path.join(root, 'docs/index.html'), 'utf8'),
      'Multi-package site'
    );
    assert.equal(
      await readFile(path.join(root, 'docs', other, 'index.html'), 'utf8'),
      'Other release site'
    );
    assert.equal(await readFile(path.join(root, 'docs/.nojekyll'), 'utf8'), '');
    assert.deepEqual(await readdir(path.join(root, 'tmp')), []);
  });

  test(`${key}: failed builds preserve output and clean temporary installs`, async (t) => {
    const root = await fixture(t);
    const output = path.join(root, 'docs', key);
    await mkdir(output, { recursive: true });
    await writeFile(path.join(output, 'index.html'), 'Previous build');
    await assert.rejects(
      buildSite(key, root, async () => {
        throw new Error('npm is unavailable');
      }),
      /npm is unavailable/
    );
    await assert.rejects(
      buildSite(
        key,
        root,
        async (info, version, stage) => stage,
        async () => {
          throw new Error('TypeDoc rendering failed');
        }
      ),
      /TypeDoc rendering failed/
    );
    assert.equal(
      await readFile(path.join(output, 'index.html'), 'utf8'),
      'Previous build'
    );
    assert.deepEqual(await readdir(path.join(root, 'tmp')), []);
  });

  test(`${key}: TypeDoc renders visible public declarations without running package code`, async (t) => {
    const root = await fixture(t);
    const packageRoot = path.join(root, 'node_modules', packageInfo.name);
    for (const entry of packageInfo.entryPoints) {
      const filename = path.join(packageRoot, entry);
      await mkdir(path.dirname(filename), { recursive: true });
      await writeFile(
        filename,
        entry.endsWith('/inline.d.ts')
          ? '/** Creates the inline SDK. */\nexport declare function createC2pa(): Promise<string>;\n'
          : '/** Reads C2PA data. */\nexport declare class Reader { json(): string; }\n' +
              'export interface C2pa {\n/** @internal */\nworker: string;\ndispose(): void;\n}\n'
      );
    }
    const sourceReadme =
      '# Published API\n\n[Prerequisites](../../README.md#prerequisites)\n\n[Versions](../../api-docs/web-versions.json)\n';
    await writeFile(path.join(packageRoot, 'README.md'), sourceReadme);
    await writeFile(
      path.join(packageRoot, 'typedoc.mjs'),
      "throw new Error('Do not execute package code');"
    );
    const output = path.join(root, 'rendered');
    await generateDocs(
      ROOT,
      packageInfo,
      packageRoot,
      output,
      version,
      versions,
      `versions/${version}`
    );
    const readerPage =
      key === 'web' ? 'classes/index.Reader.html' : 'classes/Reader.html';
    const dom = new JSDOM(
      await readFile(path.join(output, readerPage), 'utf8')
    );
    assert.equal(dom.window.document.querySelector('.tsd-is-external'), null);
    assert.deepEqual(
      JSON.parse(
        dom.window.document.querySelector('meta[name="c2pa-docs"]').content
      ),
      {
        label: packageInfo.label,
        version,
        versions,
        prefix: `versions/${version}`
      }
    );
    assert.equal(
      dom.window.document
        .querySelector('script[src$="custom.js"]')
        .getAttribute('src'),
      '../assets/custom.js'
    );
    const index = new JSDOM(
      await readFile(path.join(output, 'index.html'), 'utf8')
    );
    assert.ok(
      index.window.document.querySelector(
        'a[href="https://github.com/contentauth/c2pa-js/blob/main/README.md#prerequisites"]'
      )
    );
    assert.ok(
      index.window.document.querySelector(
        'a[href="https://github.com/contentauth/c2pa-js/blob/main/api-docs/web-versions.json"]'
      )
    );
    assert.equal(
      await readFile(path.join(packageRoot, 'README.md'), 'utf8'),
      sourceReadme
    );
    if (key === 'web') {
      const inline = new JSDOM(
        await readFile(
          path.join(output, 'functions/inline.createC2pa.html'),
          'utf8'
        )
      );
      assert.equal(
        inline.window.document.querySelector('.tsd-is-external'),
        null
      );
      assert.match(
        inline.window.document.body.textContent,
        /Creates the inline SDK/
      );
      const sdk = new JSDOM(
        await readFile(path.join(output, 'interfaces/index.C2pa.html'), 'utf8')
      );
      assert.equal(sdk.window.document.getElementById('worker'), null);
      inline.window.close();
      sdk.window.close();
    }
    index.window.close();
    dom.window.close();
  });
}

const selectorSource = await readFile(
  path.join(ROOT, 'api-docs/version-selector.js'),
  'utf8'
);
for (const [key, packageInfo] of Object.entries(PACKAGES)) {
  const versions = VERSIONS[key];
  for (const base of [
    `https://contentauth.github.io/c2pa-js/${key}/`,
    `file:///tmp/docs/${key}/`
  ]) {
    for (const prefix of [
      '',
      ...versions.map((version) => `versions/${version}`)
    ]) {
      test(`selector links and navigation: ${base}${prefix}`, () => {
        const version = prefix ? prefix.split('/').pop() : versions[0];
        function element() {
          return {
            children: [],
            appendChild(child) {
              this.children.push(child);
            },
            setAttribute(name, value) {
              this[name] = value;
            },
            addEventListener(event, callback) {
              this[event] = callback;
            }
          };
        }
        const toolbar = element();
        let destination;
        vm.runInNewContext(selectorSource, {
          URL,
          document: {
            currentScript: {
              src: new URL(
                (prefix ? prefix + '/' : '') + 'assets/custom.js',
                base
              ).href
            },
            querySelector(selector) {
              if (selector === 'meta[name="c2pa-docs"]') {
                return {
                  content: JSON.stringify({
                    label: packageInfo.label,
                    version,
                    versions,
                    prefix
                  })
                };
              }
              assert.equal(selector, '.tsd-toolbar-contents');
              return toolbar;
            },
            createElement: element
          },
          window: {
            location: {
              assign(url) {
                destination = url;
              }
            }
          }
        });
        const select = toolbar.children[0].children[0];
        assert.equal(
          select['aria-label'],
          packageInfo.label + ' API documentation version'
        );
        assert.equal(select.children.length, versions.length);
        for (const [index, option] of select.children.entries()) {
          assert.equal(
            option.value,
            base + 'versions/' + versions[index] + '/index.html'
          );
          assert.equal(option.selected, versions[index] === version);
        }
        select.value = select.children[1].value;
        select.change();
        assert.equal(
          destination,
          base + 'versions/' + versions[1] + '/index.html'
        );
        assert.equal(
          toolbar.children[1].href,
          new URL('../index.html', base).href
        );
      });
    }
  }
}
