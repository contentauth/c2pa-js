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
  rm,
  symlink,
  writeFile
} from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import ts from 'typescript';
import * as utilities from '../packages/c2pa-utilities/dist/index.js';
import * as web from '../packages/c2pa-web/dist/index.js';
import * as inline from '../packages/c2pa-web/dist/inline.js';
import * as node from '../packages/c2pa-node/dist/index.js';

const root = fileURLToPath(new URL('../', import.meta.url));

test('published entry points share the utilities Context constructor', async () => {
  for (const sdk of [node, web, inline]) {
    assert.equal(sdk.Context, utilities.Context);
    class CustomContext extends sdk.Context {}
    const context = new CustomContext({ verify: { verifyTrust: false } });
    assert.ok(context instanceof utilities.Context);
    assert.equal(JSON.parse(await context.toJson()).verify.verify_trust, false);
  }
});

test('Node factories reject raw settings and null instead of using defaults', async () => {
  const asset = { buffer: Buffer.alloc(1), mimeType: 'image/jpeg' };
  const manifest = { claim_generator_info: [], title: 'test' };
  for (const raw of [{ verify: { verify_trust: false } }, '{}', null]) {
    for (const create of [
      () => node.Builder.newAsync(raw),
      () => node.Builder.withJsonAsync(manifest, raw),
      () => node.Builder.fromArchive(asset, raw),
      () => node.Reader.fromAsset(asset, raw),
      () => node.Reader.fromManifestDataAndAsset(Buffer.alloc(1), asset, raw)
    ]) {
      await assert.rejects(create, TypeError);
    }
  }
  assert.equal('new' in node.Builder, false);
  assert.equal('withJson' in node.Builder, false);
});

test('Node factories consume a Context subclass from the published inline entry point', async () => {
  class CustomContext extends inline.Context {
    resolutions = 0;
    async toJson() {
      this.resolutions++;
      return super.toJson();
    }
  }
  const context = new CustomContext({ verify: { verifyTrust: false } });
  const empty = await node.Builder.newAsync(context);
  assert.ok(empty instanceof node.Builder);
  const builder = await node.Builder.withJsonAsync(
    {
      claim_generator_info: [{ name: 'context-interop', version: '1.0.0' }],
      title: 'Context interoperability',
      format: 'image/jpeg'
    },
    context
  );
  const archive = { buffer: null };
  await builder.toArchive(archive);
  const restored = await node.Builder.fromArchive(
    { buffer: archive.buffer, mimeType: 'application/c2pa' },
    context
  );
  assert.equal(
    restored.getManifestDefinition().title,
    'Context interoperability'
  );

  const asset = {
    path: join(root, 'packages/c2pa-node/tests/fixtures/CA.jpg')
  };
  const manifestData = await readFile(
    join(root, 'packages/c2pa-node/tests/fixtures/CA/manifest_data.c2pa')
  );
  const reader = await node.Reader.fromAsset(asset, context);
  const detached = await node.Reader.fromManifestDataAndAsset(
    manifestData,
    asset,
    context
  );
  assert.ok(reader);
  for (const result of [reader, detached]) {
    assert.ok(result.json().active_manifest);
    assert.equal(
      result
        .json()
        .validation_status?.some(
          (entry) => entry.code === 'signingCredential.untrusted'
        ) ?? false,
      false
    );
  }
  assert.equal(context.resolutions, 5);
  await assert.rejects(
    () =>
      node.Reader.fromAsset(
        asset,
        new inline.Context(undefined, { maxSizeInBytes: 1 })
      ),
    utilities.AssetTooLargeError
  );
});

test('web entry points explicitly reject top-level settings', async () => {
  for (const sdk of [web, inline]) {
    await assert.rejects(
      () => sdk.createC2pa({ settings: {} }),
      /Config.settings is no longer supported/
    );
  }
});

test('published Context declarations are compatible across entry points', async () => {
  const directory = await mkdtemp(join(root, '.sdk-exports-'));
  const file = join(directory, 'consumer.mts');
  try {
    const scope = join(directory, 'node_modules/@contentauth');
    await mkdir(scope, { recursive: true });
    for (const name of ['c2pa-utilities', 'c2pa-web', 'c2pa-node']) {
      await symlink(join(root, 'packages', name), join(scope, name), 'junction');
    }
    await writeFile(
      file,
      `
import { Context as SharedContext } from '@contentauth/c2pa-utilities';
import { Context as WebContext, Reader, Builder } from '@contentauth/c2pa-web';
import { Context as InlineContext } from '@contentauth/c2pa-web/inline';
import { Context as NodeContext, Reader as NodeReader, Builder as NodeBuilder } from '@contentauth/c2pa-node';
import type { Config } from '@contentauth/c2pa-web';
import type { InlineConfig } from '@contentauth/c2pa-web/inline';

class CustomContext extends SharedContext {}
const shared: SharedContext = new WebContext();
const web: WebContext = new InlineContext();
const inline: InlineContext = new CustomContext();
const node: NodeContext = shared;
const readerContext: Parameters<typeof Reader.fromBlob>[3] = inline;
const builderContext: Parameters<typeof Builder.new>[1] = shared;
const nodeReaderContext: Parameters<typeof NodeReader.fromAsset>[1] = web;
const nodeManifestReaderContext: Parameters<typeof NodeReader.fromManifestDataAndAsset>[2] = inline;
const nodeBuilderContext: Parameters<typeof NodeBuilder.newAsync>[0] = node;
const nodeJsonBuilderContext: Parameters<typeof NodeBuilder.withJsonAsync>[1] = inline;
const nodeArchiveContext: Parameters<typeof NodeBuilder.fromArchive>[1] = new CustomContext();
void [shared, web, inline, node, readerContext, builderContext, nodeReaderContext,
  nodeManifestReaderContext, nodeBuilderContext, nodeJsonBuilderContext, nodeArchiveContext];

// @ts-expect-error Raw settings are not a Context.
const rawReader: Parameters<typeof NodeReader.fromAsset>[1] = { verify: { verify_trust: false } };
// @ts-expect-error Raw JSON is not a Context.
const rawManifestReader: Parameters<typeof NodeReader.fromManifestDataAndAsset>[2] = '{}';
// @ts-expect-error Raw settings are not a Context.
const rawBuilder: Parameters<typeof NodeBuilder.newAsync>[0] = {};
// @ts-expect-error Null no longer represents a default Context.
const nullBuilder: Parameters<typeof NodeBuilder.withJsonAsync>[1] = null;
// @ts-expect-error Raw settings are not a Context.
const rawArchive: Parameters<typeof NodeBuilder.fromArchive>[1] = {};
// @ts-expect-error Web factories only accept Context.
const rawWebReader: Parameters<typeof Reader.fromBlob>[3] = {};
// @ts-expect-error Top-level settings have been removed.
const config: Config = { wasmSrc: '', settings: {} };
// @ts-expect-error Inline top-level settings have been removed.
const inlineConfig: InlineConfig = { settings: {} };
// @ts-expect-error Synchronous raw-settings factory has been removed.
NodeBuilder.new();
// @ts-expect-error Synchronous raw-settings factory has been removed.
NodeBuilder.withJson({});
// @ts-expect-error Deprecated raw settings type has been removed.
import type { C2paSettings } from '@contentauth/c2pa-node';
// @ts-expect-error Deprecated alias has been removed.
import type { SettingsContext } from '@contentauth/c2pa-node';
// @ts-expect-error Deprecated alias has been removed.
import type { TrustConfig } from '@contentauth/c2pa-node';
// @ts-expect-error Deprecated alias has been removed.
import type { VerifyConfig } from '@contentauth/c2pa-node';
// @ts-expect-error Deprecated factory type has been removed.
import type { ReaderFactory } from '@contentauth/c2pa-web';
// @ts-expect-error Deprecated factory type has been removed.
import type { BuilderFactory } from '@contentauth/c2pa-web/inline';
`
    );
    const program = ts.createProgram([file], {
      noEmit: true,
      strict: true,
      skipLibCheck: true,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2023
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(
      diagnostics.length,
      0,
      ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => root,
        getNewLine: () => '\n'
      })
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
