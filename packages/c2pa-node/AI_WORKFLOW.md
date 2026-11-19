# AI Workflow: @contentauth/c2pa-node

## Read First

Start with the repository-wide [AGENTS.md](../../AGENTS.md) for the package map,
setup, and contribution rules, then the [Node README](./README.md).

- Writing applications, examples, or tests that use the SDK: read Part 1.
- Changing APIs, behavior, or bindings: read Part 1 and Part 2.
- Changing only tests, tooling, or documentation: read Part 2 and the relevant
  usage sections.
- Changing shared behavior: also read the
  [web guide](../c2pa-web/AI_WORKFLOW.md). Node and browser bindings are not
  interchangeable.

Current package exports and implementations define the APIs. Examples from
another language's C2PA SDK are not binding specifications for JavaScript.
Read only the applicable workflow; not every task requires building every package.

## Part 1: Using the Package

### Object Lifetimes

- Node does not have the browser's `createC2pa` initialization step.
- The current [Reader](./js-src/Reader.ts) has no `free()`, `close()`, or `dispose()`
  method; its native lifetime is managed through Neon. Do not promise deterministic
  reclamation or copy the browser's cleanup calls.
- Follow each object's actual contract. Do not assume Python-style consumption
  after signing or locking rules apply to this SDK.

### Read

Use the public `@contentauth/c2pa-node` exports, not private source or generated
build directories. Check the exact input shape, return type, and asynchronous
behavior rather than translating a browser example:

```ts
import { Context, Reader } from '@contentauth/c2pa-node';

async function readAsset(
  path: string,
  mimeType: string,
  context = new Context()
) {
  const reader = await Reader.fromAsset({ path, mimeType }, context);
  return reader?.json() ?? null;
}
```

`fromAsset` is asynchronous, but `json()` synchronously returns the parsed
manifest store. Missing C2PA metadata returns `null`; other errors propagate.

Node accepts file/buffer asset objects, not arbitrary Node streams. Prefer
`{ path, mimeType }` when an asset is already on disk: the
[size preflight](./js-src/assetSize.ts) can inspect the file before reading it,
whereas a supplied buffer is already allocated. Supply `mimeType` when known.

### Context and Settings

The Node SDK re-exports shared utilities. When working directly on shared
configuration, use its public package:

```ts
import {
  Context,
  mergeSettings,
  type Settings
} from '@contentauth/c2pa-utilities';

function contextWithAnchors(trustAnchors: string) {
  const base: Settings = { verify: { verifyTrust: true } };
  const settings = mergeSettings(base, { trust: { trustAnchors } });

  return new Context(settings);
}
```

A Context takes one Settings object; merge configuration sources explicitly.
Pass the resulting Context to Reader/Builder construction, not a raw settings
object or JSON string. Treat it as construction-time configuration, not a live
channel for updating existing instances.
See [Context and settings](../c2pa-utilities/README.md#context-and-settings).

### Signing, Validation, and Errors

- Check [shared utilities](../c2pa-utilities/src/index.ts) before adding Settings,
  Context, signer-validation, or HTTP logic. Preserve package-specific defaults.
- Preserve the distinction between absent provenance, malformed input, validation
  failures, and operational errors. Do not turn arbitrary read/sign failures into
  an empty manifest, `null`, or a successful result.
- Reading an asset is not an application trust decision. Inspect the validation
  and trust information exposed by the API; do not describe an arbitrary signed
  asset as trusted merely because it can be read. An absent `validation_status`
  is not proof of verification: settings can disable verification after reading.
- Keep HTTPS certificate trust stores separate from C2PA signing trust anchors;
  see the [security notes in the repository README](../../README.md).
- Check the Node package's signer input and output contracts rather than copying
  web examples. Keep source assets separate from generated outputs.
- Use existing assets and test signing material in tests, never production keys
  or credentials.

### Usage Checklist

- [ ] Imports, inputs, return types, and asynchronous behavior match the Node API.
- [ ] Examples do not invent browser-style initialization or cleanup calls.
- [ ] A Context configures each Reader/Builder; settings sources are merged first.
- [ ] Missing metadata, validation results, trust, and operational errors remain
      distinguishable.

## Part 2: Changing the Package

### Where Code Lives

| Surface                   | Reference                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API                | [TypeScript exports](./js-src/index.ts), [declarations](./js-src/types.d.ts), and [package exports](./package.json)                                                                 |
| TypeScript wrappers       | [Reader](./js-src/Reader.ts), [Builder](./js-src/Builder.ts), and [binary loader](./js-src/binary.ts)                                                                               |
| Native boundary           | [Native declarations](./js-src/index.node.d.ts), [registrations](./src/lib.rs), [Neon Reader](./src/neon_reader.rs), and [error conversion](./src/error.rs)                         |
| Shared behavior and types | [Utility exports](../c2pa-utilities/src/index.ts), [Rust schema sources](../c2pa-types/src/), [generator](../c2pa-types/build.ts), and [type export facade](../c2pa-types/index.ts) |
| Tests                     | Colocated `js-src/*.spec.ts` files and [test fixtures](./tests/fixtures/)                                                                                                           |

### JavaScript and TypeScript Development

1. Read the [development guide](../../docs/project-contributions.md),
   [contribution rules](../../CONTRIBUTING.md), and Node README.
2. Locate the public entry point, implementation, existing helpers, tests, and
   consumers of changed exports or shared types before editing.
3. State the observable contract: inputs, results, errors, side effects, and
   cleanup. Add a regression case for a bug while preserving neighboring cases.
4. Keep public signatures, runtime validation, defaults, and exports aligned.
5. Follow [repository coding conventions](../../AGENTS.md#coding-and-compatibility)
   and Node's separate [TypeScript](./tsconfig.json) and
   [ESLint](./eslint.config.cjs) configuration. Use workspace package imports and
   `workspace:*` dependencies, never private cross-package source paths.
6. Document public behavior and compatibility effects in API docs and relevant
   README examples; preserve `@internal` boundaries.

Discuss major API additions in an issue before implementation. Do not invent a
parallel abstraction when an existing helper owns the behavior. Keep unrelated
refactors, upgrades, generated output, and existing worktree changes out of the patch.

### Bindings Development: Rust with Neon

- Confirm that the operation exists in the `c2pa` version selected by the root
  [Cargo.toml](../../Cargo.toml) and [Cargo.lock](../../Cargo.lock), rather than
  wrapping an assumed upstream method.
- Follow existing TypeScript-to-native argument conversion and registration
  patterns. Keep public signatures, native declarations, argument order, and
  returned values consistent.
- Preserve [Node error conversion](./src/error.rs). Native errors become
  JavaScript `Error` objects; do not substitute WASM-specific errors, discard the
  original failure, or invent a universal Python-style `C2paError` subclass.
- Preserve ownership, asynchronous completion, and cleanup on success and failure.
  Add runtime regression tests at the public API and changed binding boundaries,
  not only mocks.
- Build the local addon before testing changed Rust. A downloaded binary can load
  successfully while exercising none of the Rust changes.

For a concrete reference, [Reader.fromAsset](./js-src/Reader.ts) calls the addon's
`readerFromAsset`, which is [registered](./src/lib.rs) to
[NeonReader::from_stream](./src/neon_reader.rs). Keep declarations, argument
conversion, registration, and promise results aligned.

### Shared Utilities and Generated Types

- Put shared Settings/Context, validation, and HTTP behavior in the existing
  utility layer when appropriate. Keep filesystem/native-addon dependencies out
  of browser/shared code.
- Test utilities and each affected consumer; similar helper names do not prove
  identical Node and web behavior. Document intentional runtime differences.
- Change Rust schema sources or the generator, not generated declarations.
  Regenerate with `pnpm exec nx build c2pa-types`, check the hand-maintained type
  export facade, and rebuild affected consumers.

### Build and Test

Run commands from the repository root unless noted. Use
[repository setup](../../AGENTS.md#setup-and-commands) and confirm inferred targets
with `pnpm exec nx show project c2pa-node`. Rust is required for source builds and
tests, not normal installation of the precompiled package.

```sh
pnpm exec nx test c2pa-node
```

The test script builds the local debug addon and TypeScript before running
Vitest. Use the Nx target for its configured dependencies. Bypass cached test
results when validating a separately supplied native binary or environment
change that is not represented in the task's inputs:

```sh
pnpm exec nx test c2pa-node --skip-nx-cache
```

The [binary loader](./js-src/binary.ts) honors `C2PA_LIBRARY_PATH` before its default
`index.node`. Check that override when a test appears to load the wrong addon;
use an absolute path for a custom binary.

### Testing and Validation

Run the narrowest regression case first and confirm that it actually ran. Then
run the affected package and consumer checks; a passing single test does not
prove that exports, types, or the other binding still work.

| Change                                       | Validation to select                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Node TypeScript or Neon behavior             | Relevant Node tests and package checks; build the local addon for Rust changes                               |
| Shared utility or type                       | Changed package checks and each affected consumer's tests/typechecks/builds                                  |
| Cross-package API/behavior or unclear impact | `pnpm ci:check`                                                                                              |
| Rust source                                  | Applicable package checks and `cargo +nightly fmt --all -- --check`                                          |
| Documentation generator or selector behavior | `pnpm test:docs`; see [documentation builds](../../docs/project-contributions.md#building-api-documentation) |
| Prose-only documentation                     | Check examples, links, and formatting; no native/WASM build required                                         |

#### Regression-Test Expectations

- Node and utilities use colocated `*.spec.ts` files in Node Vitest; do not
  introduce a second test framework. Reuse existing assets and mocks.
- Cover intended success, invalid inputs, native/remote failures, and cleanup
  affected by the change.
- Test each changed caller path. A utilities unit test does not cover the native
  addon or browser worker.
- Keep expected errors visible in assertions. Do not weaken tests, skip affected
  consumers, or replace runtime tests with mocks to obtain a passing result.

#### Diagnose Prerequisites Before Changing Code

| Symptom or constraint                       | First action                                                                                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Changed Rust code is not reflected in tests | Build the local addon, check `C2PA_LIBRARY_PATH`, and bypass unrelated cached results; do not substitute a release download |
| Trustmark tests cannot obtain models        | Check network access and a writable/populated model cache; CI uses `packages/c2pa-node/tmp/trustmark_models/`               |
| Versioned API docs omit an unreleased API   | Use the applicable local docs workflow; release docs consume published npm declarations and may require network access      |

Do not delete `api-docs/`: tracked version lists and selector assets live beside
generated output. Remove only known, task-specific artifacts when needed.
Report a blocked check's exact command, error, and missing tool/resource; run the
remaining available checks. Never call a blocked, skipped, or cached unrelated
check a successful validation of the change.

### Done Checklist

- [ ] The requested behavior/documentation is complete without unrelated edits.
- [ ] Public signatures, exports, runtime validation, native declarations,
      registrations, and Rust bindings agree.
- [ ] Regression tests cover affected success, failure, and cleanup paths using
      the changed local addon; shared changes were checked in each consumer.
- [ ] Generated types were regenerated from source when needed; no generated
      output, caches, credentials, or unrelated worktree changes are included.
- [ ] API docs/examples explain compatibility effects and intentional Node/web
      differences.
- [ ] Exact check results and blockers are reported. Create a changeset with
      `pnpm changeset` only when explicitly requested by the user, not
      automatically for release-requiring changes. Do not run release or
      versioning workflows in a feature PR.

Follow the [PR template](../../.github/PULL_REQUEST_TEMPLATE) for Overview,
Changes, Testing, and the cross-package drift check. Use a Conventional Commit
subject, such as `fix(c2pa-node): preserve reader errors`. Report suspected
vulnerabilities through [SECURITY.md](../../SECURITY.md), not public issues.
