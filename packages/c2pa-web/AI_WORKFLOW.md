# AI Workflow: @contentauth/c2pa-web

## Read First

Start with the repository-wide [AGENTS.md](../../AGENTS.md) for the package map,
setup, and contribution rules, then the [web README](./README.md).

- Writing applications, examples, or tests that use the SDK: read Part 1.
- Changing APIs, behavior, or bindings: read Part 1 and Part 2.
- Changing only tests, tooling, or documentation: read Part 2 and the relevant
  usage sections.
- Changing shared behavior: also read the
  [Node guide](../c2pa-node/AI_WORKFLOW.md). Node and browser bindings are not
  interchangeable.

Current package exports and implementations define the APIs. Examples from
another language's C2PA SDK are not binding specifications for JavaScript.
Read only the applicable workflow; not every task requires building every package.

## Part 1: Using the Package

### Object Lifetimes

- Initialize the browser runtime with `await createC2pa(...)`. Reuse it for
  repeated reads instead of starting a worker for every asset.
- Await Reader operations before calling `await reader.free()`. Free Readers
  before calling `c2pa.dispose()` to terminate their worker runtime.
- Use `try`/`finally` so cleanup runs on success and failure. Dispose a shared
  runtime at its owner's teardown, not while another operation still needs it.
- Follow each object's actual contract. Do not assume Python-style `close()`,
  consumption after signing, or locking rules apply to this SDK.

### Initialize and Read

Use the public `@contentauth/c2pa-web` exports, not private source or generated
build directories. This example uses a Vite-style WASM URL import; with another
bundler, follow the [web setup guide](./README.md#importing-the-library) to supply
`wasmSrc`. Pass the asset's MIME type explicitly.

```ts
import { Context, createC2pa, Reader } from '@contentauth/c2pa-web';
import wasmSrc from '@contentauth/c2pa-web/resources/c2pa.wasm?url';

async function readBlob(blob: Blob, mimeType: string, context = new Context()) {
  const c2pa = await createC2pa({ wasmSrc });

  try {
    const reader = await Reader.fromBlob(c2pa, mimeType, blob, context);
    if (reader === null) return null;

    try {
      return await reader.manifestStore();
    } finally {
      await reader.free();
    }
  } finally {
    c2pa.dispose();
  }
}
```

Missing C2PA metadata returns `null`; other errors propagate.
`createC2pa`, `manifestStore`, and `free` are asynchronous; in particular, await
the manifest read before entering cleanup.
See the [Reader implementation](./src/lib/reader.ts).

Use the static `Reader`/`Builder` APIs and Contexts to configure Readers and Builders.
The instance-level `c2pa.reader`, `c2pa.builder`, and top-level `settings` option are
removed, including from `/inline`; do not reintroduce them. For inline WASM setup,
use the [README instructions](./README.md#using-an-inline-wasm-binary).

### Context and Settings

The web SDK re-exports shared utilities. When working directly on shared
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
- Check the web package's signer input and output contracts rather than copying
  Node examples. Keep source assets separate from generated outputs.
- Use existing assets and test signing material in tests, never production keys
  or credentials.

### Usage Checklist

- [ ] Imports, inputs, return types, and asynchronous behavior match the web API.
- [ ] Readers are freed and their runtime disposed at the correct owner boundary.
- [ ] A Context configures each Reader/Builder; settings sources are merged first.
- [ ] Missing metadata, validation results, trust, and operational errors remain
      distinguishable.

## Part 2: Changing the Package

### Where Code Lives

| Surface                   | Reference                                                                                                                                                                           |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public API                | [Main entry](./src/index.ts), [inline entry](./src/inline.ts), and [package exports](./package.json)                                                                                |
| TypeScript wrappers       | [Reader](./src/lib/reader.ts), [Builder](./src/lib/builder.ts), and [runtime initialization](./src/lib/c2pa.ts)                                                                     |
| Worker boundary           | [Typed RPC](./src/lib/worker/rpc.ts), [worker manager](./src/lib/worker/workerManager.ts), and [worker dispatch](./src/lib/worker.ts)                                               |
| Rust/WASM adapter         | [WASM exports](../c2pa-wasm/src/lib.rs) and [WASM Reader](../c2pa-wasm/src/wasm_reader.rs)                                                                                          |
| Shared behavior and types | [Utility exports](../c2pa-utilities/src/index.ts), [Rust schema sources](../c2pa-types/src/), [generator](../c2pa-types/build.ts), and [type export facade](../c2pa-types/index.ts) |
| Test lifecycle            | [Web fixtures](./test/methods.ts) and colocated `*.spec.ts` files                                                                                                                   |

### JavaScript and TypeScript Development

1. Read the [development guide](../../docs/project-contributions.md),
   [contribution rules](../../CONTRIBUTING.md), and web README.
2. Locate the public entry point, implementation, existing helpers, tests, and
   consumers of changed exports or shared types before editing.
3. State the observable contract: inputs, results, errors, side effects, and
   cleanup. Add a regression case for a bug while preserving neighboring cases.
4. Keep public signatures, runtime validation, defaults, and exports aligned.
   Account for both main and inline entry points and worker-backed calls.
5. Follow [repository coding conventions](../../AGENTS.md#coding-and-compatibility).
   Use workspace package imports and `workspace:*` dependencies, never private
   cross-package source paths.
6. Document public behavior and compatibility effects in API docs and relevant
   README examples; preserve `@internal` boundaries.

Discuss major API additions in an issue before implementation. Do not invent a
parallel abstraction when an existing helper owns the behavior. Keep unrelated
refactors, upgrades, generated output, and existing worktree changes out of the patch.

### Bindings Development: Rust with WebAssembly

- Confirm that the operation exists in the `c2pa` version selected by the root
  [Cargo.toml](../../Cargo.toml) and [Cargo.lock](../../Cargo.lock), rather than
  wrapping an assumed upstream method.
- Follow the TypeScript wrapper, typed RPC, worker dispatch, and WASM export.
  Adding a TypeScript method alone does not make the WASM operation reachable.
  Check argument conversion and returned values across every changed layer.
- Keep browser/shared code free of Node-only dependencies. Exercise the actual
  worker boundary when serialization or transfer behavior changes.
- Preserve [WASM Reader errors](../c2pa-wasm/src/wasm_reader.rs), including the
  `JsString` representation required by Firefox workers; do not substitute Node's
  native error conversion.
- Preserve ownership and cleanup on success and failure. Add runtime regression
  tests at the public API and changed binding boundaries, not only mocks.
- Rebuild through the [WASM executor](../../tools/nx-wasm-bindgen/src/executors/build/executor.ts).
  It generates `WASM_SRI`; never replace a binary or its integrity value alone.

### Shared Utilities and Generated Types

- Put shared Settings/Context, validation, and HTTP behavior in the existing
  utility layer when appropriate. Keep Node-only behavior in Node.
- Test utilities and each affected consumer; similar helper names do not prove
  identical web and Node behavior. Document intentional runtime differences.
- Change Rust schema sources or the generator, not generated declarations.
  Regenerate with `pnpm exec nx build c2pa-types`, check the hand-maintained type
  export facade, and rebuild affected consumers.

### Build and Test

Run commands from the repository root unless noted. Use
[repository setup](../../AGENTS.md#setup-and-commands) and the
[WASM prerequisites](../c2pa-wasm/README.md#prerequisites).
Confirm inferred targets with `pnpm exec nx show project c2pa-web`.

```sh
pnpm exec nx build c2pa-web
pnpm exec nx lint c2pa-web
pnpm exec nx typecheck c2pa-web
pnpm exec nx test c2pa-web
pnpm exec nx test c2pa-wasm
```

Select the commands required by the change; the WASM test target is relevant to
adapter changes, not every TypeScript or documentation edit.

### Testing and Validation

Run the narrowest regression case first and confirm that it actually ran. Then
run the affected package and consumer checks; a passing single test does not
prove that exports, types, or the other binding still work.

| Change                                       | Validation to select                                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Browser TypeScript behavior                  | Relevant web tests, lint, typecheck, and build as needed                                                     |
| WASM adapter or worker boundary              | Rebuild the adapter; relevant WASM and web runtime tests                                                     |
| Shared utility or type                       | Changed package checks and each affected consumer's tests/typechecks/builds                                  |
| Cross-package API/behavior or unclear impact | `pnpm ci:check`                                                                                              |
| Rust source                                  | Applicable package checks and `cargo +nightly fmt --all -- --check`                                          |
| Documentation generator or selector behavior | `pnpm test:docs`; see [documentation builds](../../docs/project-contributions.md#building-api-documentation) |
| Prose-only documentation                     | Check examples, links, and formatting; no native/WASM build required                                         |

#### Regression-Test Expectations

- Reuse [web fixtures](./test/methods.ts) for initialization, disposal, and MSW
  lifecycle instead of duplicating setup. Keep tests beside existing cases.
- Cover intended success, invalid inputs, native/remote failures, and cleanup
  affected by the change, using existing assets and mocks where possible.
- Test each changed caller path. A utilities unit test does not cover the browser
  worker or Node's native addon; utilities tests run in Node.
- Keep expected errors visible in assertions. Do not weaken tests, skip browsers,
  or replace runtime tests with mocks to obtain a passing result.

#### Diagnose Prerequisites Before Changing Code

| Symptom or constraint                     | First action                                                                                                           |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Browser tests cannot launch               | Run `pnpm exec playwright install` from `packages/c2pa-web`; tests use Chromium, Firefox, and WebKit                   |
| WASM build/tool mismatch                  | Check `wasm-pack`, the Rust target, and that `wasm-bindgen-cli` matches resolved `wasm-bindgen` in `Cargo.lock`        |
| Versioned API docs omit an unreleased API | Use the applicable local docs workflow; release docs consume published npm declarations and may require network access |

Do not delete `api-docs/`: tracked version lists and selector assets live beside
generated output. Remove only known, task-specific artifacts when needed.
Report a blocked check's exact command, error, and missing tool/resource; run the
remaining available checks. Never call a blocked, skipped, or cached unrelated
check a successful validation of the change.

### Done Checklist

- [ ] The requested behavior/documentation is complete without unrelated edits.
- [ ] Public signatures, exports, runtime validation, main/inline entry points,
      worker messages, and WASM bindings agree.
- [ ] Regression tests cover affected success, failure, and cleanup paths at
      runtime; shared changes were checked in each affected consumer.
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
subject, such as `fix(c2pa-web): preserve reader errors`. Report suspected
vulnerabilities through [SECURITY.md](../../SECURITY.md), not public issues.
