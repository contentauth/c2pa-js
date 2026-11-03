/**
 * Copyright 2026 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it.
 */

import { execFile } from 'node:child_process';
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  writeFile
} from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { Application, JSX, TSConfigReader } from 'typedoc';

export const ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PACKAGES = {
  node: {
    name: '@contentauth/c2pa-node',
    label: 'Node.js',
    entryPoints: ['dist/types/index.d.ts'],
    compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext' },
    excludeInternal: false
  },
  web: {
    name: '@contentauth/c2pa-web',
    label: 'Web',
    entryPoints: ['dist/index.d.ts', 'dist/inline.d.ts'],
    compilerOptions: {
      module: 'ESNext',
      moduleResolution: 'Bundler',
      lib: ['ES2023', 'DOM', 'DOM.Iterable']
    },
    excludeInternal: true
  }
};
const run = promisify(execFile);
const VERSION =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;

export async function loadVersions(filename) {
  const config = JSON.parse(await readFile(filename, 'utf8'));
  const versions = config?.versions;
  if (
    !Array.isArray(versions) ||
    versions.length === 0 ||
    versions.some(
      (version) =>
        typeof version !== 'string' ||
        version.trim() !== version ||
        !VERSION.test(version)
    ) ||
    new Set(versions).size !== versions.length
  ) {
    throw new Error(
      'Documentation versions must be a non-empty list of unique exact npm versions.'
    );
  }
  return versions;
}

export async function installRelease(
  packageInfo,
  version,
  stage,
  execute = run
) {
  await writeFile(
    path.join(stage, 'package.json'),
    JSON.stringify({
      name: 'c2pa-api-docs-build',
      private: true,
      dependencies: { [packageInfo.name]: version }
    })
  );
  // Package lifecycle hooks are not needed to parse declarations.
  await execute(
    'npm',
    [
      'install',
      '--ignore-scripts',
      '--no-audit',
      '--no-fund',
      '--package-lock=false',
      '--workspaces=false',
      '--registry=https://registry.npmjs.org'
    ],
    { cwd: stage, maxBuffer: 10 * 1024 * 1024 }
  );
  const packageRoot = path.join(stage, 'node_modules', packageInfo.name);
  const manifest = JSON.parse(
    await readFile(path.join(packageRoot, 'package.json'), 'utf8')
  );
  if (manifest.name !== packageInfo.name || manifest.version !== version) {
    throw new Error(
      `Expected ${packageInfo.name}@${version}, but npm installed a different package.`
    );
  }
  return packageRoot;
}

export async function generateDocs(
  root,
  packageInfo,
  packageRoot,
  output,
  version,
  versions,
  prefix
) {
  const entries = packageInfo.entryPoints.map((entry) =>
    path.join(packageRoot, entry)
  );
  const tsconfig = path.join(
    path.dirname(packageRoot),
    '..',
    '..',
    'tsconfig.json'
  );
  await writeFile(
    tsconfig,
    JSON.stringify({
      compilerOptions: {
        target: 'ES2023',
        ...packageInfo.compilerOptions,
        strict: true,
        skipLibCheck: true,
        noEmit: true
      },
      files: entries
    })
  );
  const readme = path.join(packageRoot, 'README.docs.md');
  const content = await readFile(path.join(packageRoot, 'README.md'), 'utf8');
  await writeFile(
    readme,
    content.replaceAll(
      '](../../',
      '](https://github.com/contentauth/c2pa-js/blob/main/'
    )
  );
  const app = await Application.bootstrap(
    {
      entryPoints: entries,
      entryPointStrategy: 'resolve',
      // Installed declaration entry points are the public API, not external dependencies.
      externalPattern: [],
      tsconfig,
      name: `${packageInfo.name} ${version}`,
      includeVersion: false,
      readme,
      customJs: path.join(root, 'api-docs/version-selector.js'),
      customCss: path.join(root, 'api-docs/version-selector.css'),
      excludeInternal: packageInfo.excludeInternal,
      disableSources: true
    },
    [new TSConfigReader()]
  );
  app.renderer.hooks.on('head.end', () =>
    JSX.createElement('meta', {
      name: 'c2pa-docs',
      content: JSON.stringify({
        label: packageInfo.label,
        version,
        versions,
        prefix
      })
    })
  );
  const project = await app.convert();
  if (!project || app.logger.hasErrors()) {
    throw new Error(
      `TypeDoc could not convert ${packageInfo.name}@${version}.`
    );
  }
  await app.generateDocs(project, output);
  if (app.logger.hasErrors()) {
    throw new Error(`TypeDoc could not render ${packageInfo.name}@${version}.`);
  }
  await readFile(path.join(output, 'index.html'));
}

export async function buildSite(
  packageKey,
  root = ROOT,
  install = installRelease,
  generate = generateDocs
) {
  if (!Object.hasOwn(PACKAGES, packageKey)) {
    throw new Error('Choose a documentation package: node or web.');
  }
  const packageInfo = PACKAGES[packageKey];
  const versions = await loadVersions(
    path.join(root, `api-docs/${packageKey}-versions.json`)
  );
  const temporaryRoot = path.join(root, 'tmp');
  await mkdir(temporaryRoot, { recursive: true });
  const workspace = await mkdtemp(
    path.join(temporaryRoot, `${packageKey}-api-docs-`)
  );
  const site = path.join(workspace, 'site');
  try {
    for (const version of versions) {
      const stage = path.join(workspace, version);
      await mkdir(stage);
      const packageRoot = await install(packageInfo, version, stage);
      await generate(
        root,
        packageInfo,
        packageRoot,
        path.join(site, 'versions', version),
        version,
        versions,
        `versions/${version}`
      );
      if (version === versions[0]) {
        await generate(
          root,
          packageInfo,
          packageRoot,
          path.join(workspace, 'default'),
          version,
          versions,
          ''
        );
        await cp(path.join(workspace, 'default'), site, { recursive: true });
      }
    }
    const docs = path.join(root, 'docs');
    await mkdir(docs, { recursive: true });
    const output = path.join(docs, packageKey);
    await rm(output, { recursive: true, force: true });
    await rename(site, output);
    await writeFile(path.join(docs, '.nojekyll'), '');
    return output;
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  console.log(
    `Versioned API docs generated at: ${await buildSite(process.argv[2])}`
  );
}
