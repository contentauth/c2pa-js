# AI workflow for c2pa-js

Practical guidance for AI assistants using or developing this SDK. Start with
[AGENTS.md](./AGENTS.md) for the repository map, setup, and repository-wide rules.
Use this guide for the applicable workflow, not as a requirement to build every
package for every task.

The package READMEs and current implementations define the APIs. Examples from
another language's C2PA SDK are not binding specifications for JavaScript.

## Using the SDKs

### Choose the runtime before writing code

| Runtime or task                       | Package and reference                                 | Boundary to preserve                                                   |
| ------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| Browser application                   | [c2pa-web](./packages/c2pa-web/README.md)             | Browser initialization, workers, WASM, and browser-compatible inputs   |
| Node application                      | [c2pa-node](./packages/c2pa-node/README.md)           | Node inputs, native addon, and the Node API's own lifecycle            |
| Shared configuration or HTTP behavior | [c2pa-utilities](./packages/c2pa-utilities/README.md) | No Node filesystem or native-addon dependencies                        |
| Type definitions                      | [c2pa-types](./packages/c2pa-types/README.md)         | Generated contracts, not a runtime SDK                                 |
| WASM adapter development              | [c2pa-wasm](./packages/c2pa-wasm/README.md)           | Rust/wasm-bindgen boundary; generated `pkg/` is not application source |

- Import from the target package's public exports. Do not copy imports from
  another package's private source or generated build directory.
- Check the exact constructor, input shape, return type, and asynchronous behavior
  in that package. Similar class names do not guarantee interchangeable APIs.
- Follow that runtime's ownership and cleanup rules. Do not add Python-style
  `close()` calls, assumed consumption after signing, or locking rules without a
  corresponding JavaScript/native contract.
- Keep examples small and runnable in their stated environment. Use existing test
  assets and test signing material in tests, never production keys or credentials.

### Read an asset in a browser

This example uses a Vite-style WASM URL import. With another bundler, follow the
[web setup guide](./packages/c2pa-web/README.md) to supply `wasmSrc`.
Pass the asset's MIME type explicitly.

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

`createC2pa`, `manifestStore`, and `free` are asynchronous. Await the read before
freeing the Reader, and free Readers before disposing their worker runtime.
For repeated reads, share the initialized `c2pa` instance and dispose it at its
owner's teardown rather than starting a worker for every asset.
See the [Reader implementation](./packages/c2pa-web/src/lib/reader.ts).

Use the static `Reader`/`Builder` APIs and Contexts to configure Readers and Builders.
The instance-level `c2pa.reader`, `c2pa.builder`, and top-level `settings` option are
removed; do not reintroduce them.

### Read an asset in Node

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

There is no browser-runtime initialization step. `fromAsset` is asynchronous, but
`json()` synchronously returns the parsed manifest store.
The current [Node Reader](./packages/c2pa-node/js-src/Reader.ts) has no `free()`,
`close()`, or `dispose()` method; its native lifetime is managed through Neon.
Do not promise deterministic reclamation or copy the browser's cleanup calls.

Node accepts file/buffer asset objects, not arbitrary Node streams. Prefer
`{ path, mimeType }` when an asset is already on disk: the
[size preflight](./packages/c2pa-node/js-src/assetSize.ts) can inspect the file
before reading it, whereas a supplied buffer is already allocated.
In both read examples, missing C2PA metadata returns `null`; other errors propagate.

### Configure a Context explicitly

Both public SDKs re-export shared utilities. When working directly on shared
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
object or JSON string. Treat it as
construction-time configuration, not a live channel for updating existing
instances. See [Context and settings](./packages/c2pa-utilities/README.md).

### Configuration, signing, and errors

- Check [shared utilities](./packages/c2pa-utilities/src/index.ts) before adding
  Settings, Context, signer-validation, or HTTP logic. Keep configuration explicit
  and preserve package-specific defaults.
- Preserve the distinction between absent provenance, malformed input, validation
  failures, and operational errors. Inspect the target Reader's contract before
  deciding whether a missing manifest is a return value or an exception.
- Do not turn arbitrary read/sign failures into an empty manifest, `null`, or a
  successful result. Handle only the expected case and propagate other failures
  using the existing package error conventions.
- Reading an asset is not an application trust decision. Inspect the validation
  and trust information exposed by the target API; do not describe an arbitrary
  signed asset as trusted merely because it can be read. An absent
  `validation_status` is not proof of verification either: settings can disable
  verification after reading.
- Keep HTTPS certificate trust stores separate from C2PA signing trust anchors;
  see the [security notes in the README](./README.md).
- When changing signing examples, check the package's signer input and output
  contracts, and keep source assets separate from generated outputs.

## Developing the SDKs

### Start with a bounded change

1. Read the [development guide](./docs/project-contributions.md),
   [contribution rules](./CONTRIBUTING.md), and the affected package README.
2. Locate the public entry point and the implementation that actually handles the
   operation. Check existing tests and shared helpers before adding new logic.
3. Identify consumers of changed exports, shared types, or utilities. List the
   packages that need corresponding changes and tests.
4. State the observable contract: accepted inputs, returned values, errors, side
   effects, and cleanup. For a bug fix, add a regression case for the failing
   behavior; preserve neighboring cases.
5. Keep unrelated refactors, dependency upgrades, generated output, and existing
   worktree changes out of the patch.

Discuss major API additions in an issue before implementation, as described in
[CONTRIBUTING.md](./CONTRIBUTING.md). Do not invent a parallel abstraction when an
existing helper or package already owns the behavior.

### Add or change a public API end to end

Use the applicable path below. Not every feature belongs in both runtimes, but an
intentional difference should be documented and tested rather than accidental.

| Surface         | Follow the operation through                                                                                                                                                                                                                                                                             |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web             | [Main entry](./packages/c2pa-web/src/index.ts) and [inline entry](./packages/c2pa-web/src/inline.ts), browser implementation, [typed RPC](./packages/c2pa-web/src/lib/worker/rpc.ts), [worker dispatch](./packages/c2pa-web/src/lib/worker.ts), then the [WASM adapter](./packages/c2pa-wasm/src/lib.rs) |
| Node            | [Public TypeScript exports](./packages/c2pa-node/js-src/index.ts), TypeScript wrapper, [native registrations](./packages/c2pa-node/src/lib.rs), then the Rust implementation                                                                                                                             |
| Shared behavior | [Utility exports](./packages/c2pa-utilities/src/index.ts), implementation and tests, then each affected Node/web consumer                                                                                                                                                                                |
| Generated types | [Rust schema sources](./packages/c2pa-types/src/), [generator](./packages/c2pa-types/build.ts), [export facade](./packages/c2pa-types/index.ts), then affected consumers                                                                                                                                 |

1. Confirm that the required operation exists in the `c2pa` version selected by the
   root [Cargo.toml](./Cargo.toml) and [Cargo.lock](./Cargo.lock). Do not write a
   wrapper around an assumed upstream method.
2. Define or update public TypeScript signatures and runtime validation together.
   Preserve existing optional/default behavior unless the change explicitly
   intends to alter it.
3. Wire the implementation through the applicable boundary. For web changes,
   account for both worker-backed and inline access; adding only a TypeScript
   method does not prove that the WASM operation is reachable.
4. Update exports and generated type sources when needed. Use workspace package
   imports, including `workspace:*` dependencies, rather than private cross-package
   paths.
5. Add tests at the public API and changed binding boundaries. Exercise actual
   native/WASM behavior, not only a mock that repeats the expected result.
6. Update API documentation, relevant README examples, and release metadata when
   applicable. Preserve `@internal` boundaries.
7. Run the affected consumers' checks. Use `pnpm ci:check` when API or behavior
   changes span packages, or consumer impact remains unclear.

### Binding-layer rules

**Node / Neon**

- Follow the existing TypeScript-to-native argument conversion and native
  registration patterns. Keep the TypeScript signature consistent with the Rust
  argument order and returned value.
- Preserve [Node error conversion](./packages/c2pa-node/src/error.rs). Do not
  replace it with WASM-specific errors or discard the original failure. Native
  errors become JavaScript `Error` objects; do not invent a universal Python-style
  `C2paError` subclass contract.
- Preserve ownership, asynchronous completion, and cleanup on success and failure.
  Add runtime regression tests for changed native behavior.
- Build the local addon before testing changed Rust. A downloaded binary can load
  successfully while exercising none of the Rust changes.

For a concrete reference, [Reader.fromAsset](./packages/c2pa-node/js-src/Reader.ts)
calls the addon's `readerFromAsset`, which is
[registered](./packages/c2pa-node/src/lib.rs) to
[NeonReader::from_stream](./packages/c2pa-node/src/neon_reader.rs).
Keep declarations, argument conversion, registration, and promise results aligned.

**Web / wasm-bindgen**

- Follow the existing main/inline, worker-message, and WASM conversion patterns.
  Check both request arguments and returned values across the bridge.
- Keep browser/shared code free of Node-only dependencies. Test values across the
  actual worker boundary when serialization or transfer behavior changes.
- Preserve [WASM Reader errors](./packages/c2pa-wasm/src/wasm_reader.rs), including
  the `JsString` representation required by Firefox workers.
- Rebuild through the [WASM executor](./tools/nx-wasm-bindgen/src/executors/build/executor.ts).
  It generates `WASM_SRI`; never replace a binary or its integrity value alone.

**Shared utilities and generated types**

- Put shared Settings/Context, validation, and HTTP behavior in the existing
  utility layer when appropriate. Keep Node-only behavior in Node.
- Test shared changes in utilities and each affected consumer. Similar helper
  names are not evidence that Node and web have identical behavior.
- Change Rust schema sources or the generator, not generated declarations by hand.
  Regenerate with `pnpm exec nx build c2pa-types`, check whether the hand-maintained
  export facade needs an update, and rebuild affected consumers.

## Testing and validation

### Select checks by the changed behavior

Use [AGENTS.md](./AGENTS.md#setup-and-commands) for prerequisites and common commands.
Confirm inferred targets with `pnpm exec nx show project <project>` rather than
guessing from a directory name.

| Change                                       | Validation to select                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Browser TypeScript behavior                  | Relevant `c2pa-web` tests, lint, typecheck, and build as needed                                          |
| WASM adapter or web/native boundary          | Relevant `c2pa-wasm` and web runtime tests; rebuild the changed adapter                                  |
| Node TypeScript or Neon behavior             | Relevant `c2pa-node` tests; build the local addon for Rust changes                                       |
| Shared utility or type                       | Tests/typechecks/builds for the changed package and its affected consumers                               |
| Cross-package API/behavior or unclear impact | `pnpm ci:check`                                                                                          |
| Rust source                                  | Applicable package checks and `cargo +nightly fmt --all -- --check`                                      |
| Documentation generator or selector behavior | `pnpm test:docs`; see [documentation builds](./docs/project-contributions.md#building-api-documentation) |
| Prose-only documentation                     | Check examples, links, and formatting; no native/WASM build required                                     |

Run the narrowest regression case first and confirm that it actually ran. Then
run the package/consumer checks required by the change; a passing single test is
not proof that exports, types, or another binding still work.

For Node, the test script builds the local debug addon and TypeScript before
running Vitest. Use the Nx target for its configured dependencies. Bypass cached
test results when validating a separately supplied native binary or environment
change that is not represented in the task's inputs:

```sh
pnpm exec nx test c2pa-node --skip-nx-cache
```

The [binary loader](./packages/c2pa-node/js-src/binary.ts) honors
`C2PA_LIBRARY_PATH` before its default `index.node`. Check that override when a
test appears to load the wrong addon; use an absolute path for a custom binary.

### Regression-test expectations

- Put tests beside the existing tests for the changed behavior. Node and utilities
  use colocated `*.spec.ts`; do not introduce a second test framework.
- Reuse [web fixtures](./packages/c2pa-web/test/methods.ts) for initialization,
  disposal, and MSW lifecycle instead of duplicating setup.
- Cover the intended success case, invalid inputs, native/remote failures, and
  cleanup affected by the change. Use existing assets and mocks where possible.
- For shared behavior, test each changed caller path. Do not assume a utilities
  unit test covers the Node native addon or browser worker.
- Keep expected errors visible in assertions. Do not weaken existing tests, skip
  browsers, or replace a runtime test with a mock to obtain a passing result.

### Diagnose prerequisites before changing code

| Symptom or constraint                            | First action                                                                                                                          |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Browser tests cannot launch                      | Install Playwright browsers from `packages/c2pa-web` with `pnpm exec playwright install`; web tests use Chromium, Firefox, and WebKit |
| WASM build/tool mismatch                         | Check `wasm-pack`, the Rust target, and that `wasm-bindgen-cli` matches the resolved `wasm-bindgen` version in `Cargo.lock`           |
| Changed Node Rust code is not reflected in tests | Build the local native addon; do not substitute a release download                                                                    |
| Trustmark tests cannot obtain models             | Check network access and a writable/populated model cache; CI uses `packages/c2pa-node/tmp/trustmark_models/`                         |
| Versioned API docs omit an unreleased API        | Use the applicable local documentation workflow; release docs consume published npm declarations and may require network access       |

Do not delete `api-docs/` as a cleanup step: tracked version lists and selector
assets live beside generated output. Remove only known, task-specific build
artifacts when cleanup is actually needed.

If a prerequisite blocks a check, report the exact command, error, and missing
tool/resource. Run the remaining relevant checks that are available. Never call a
blocked, skipped, or cached unrelated check a successful validation of the change.

## Completion checklist

### Any change

- [ ] The requested behavior or documentation is complete, without unrelated edits.
- [ ] Relevant examples, error handling, and cleanup match the target package.
- [ ] Required checks ran against the changed paths; exact results and blockers
      are included in the handoff.
- [ ] No generated output, caches, credentials, or unrelated worktree changes are
      included.

### Public API, shared behavior, or binding change

- [ ] Public signatures, exports, runtime validation, and native/WASM wiring agree.
- [ ] Main/inline/worker access and affected Node/web consumers were considered.
- [ ] Regression tests cover the changed success and failure paths.
- [ ] Generated types were regenerated from their sources when needed.
- [ ] Public API docs/examples describe compatibility effects.
- [ ] A changeset was created with `pnpm changeset` if the change requires a package
      release; release/versioning workflows were not run in a feature PR.

### Review handoff

Follow the [PR template](./.github/PULL_REQUEST_TEMPLATE): Overview, Changes,
Testing, and the applicable cross-package drift check. Explain intentional
Node/web differences, compatibility changes, and checks that could not run.
Use a Conventional Commit subject, such as `fix(c2pa-web): preserve reader errors`.
Report suspected vulnerabilities through [SECURITY.md](./SECURITY.md), not public
issues.
