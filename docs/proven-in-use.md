# Proven in maintained consumers

Fancy Kit is built from recurring needs in maintained Obsidian plug-ins and applications. The useful claim is not merely that its public types compile: the selected contracts are used in application workflows, exercised without Obsidian where injection permits it, and checked again at the platform boundary where that matters.

This is evidence for the named contract, not a package-wide promise that every API has passed every platform combination. Each package remains independently versioned in `0.x`; consult its own guide for the exact runtime and lifecycle boundary.

## How to read the evidence

The projects use four complementary levels of verification:

1. Focused package tests establish package-owned semantics, such as cancellation, result identity, path containment, lease disposal, and failure propagation.
2. Packed-consumer checks install the generated tarballs and verify that the documented exports, declarations, and tree-shaking boundary work outside this workspace.
3. Consumer tests exercise application policy through narrow injected capabilities rather than reproducing Obsidian or browser behaviour.
4. Real-Obsidian E2E and guided device review cover the rendering, process, Electron, Vault, and mobile boundaries which mocks deliberately do not own.

Repository-owned real-Obsidian runs record the API version observed from the active Vault renderer. Release-qualification runs accept only versions and AppImage digests in the reviewed catalogue. An explicitly enabled run against another exact public release remains an unverified regression probe, even when every scenario passes.

## TagFolder

[TagFolder](https://github.com/vrtmrz/obsidian-tagfolder) uses the Obsidian UI and Vault adapters at its plug-in composition root. Its [new-note workflow](https://github.com/vrtmrz/obsidian-tagfolder/blob/main/new-note-workflow.ts) narrows those adapters to the selection, text, and frontmatter methods required by that operation. The corresponding [App-free tests](https://github.com/vrtmrz/obsidian-tagfolder/blob/main/tests/new-note-workflow.test.ts) script template selection, inspect Vault transcripts, inject write failures, and verify rollback without constructing an Obsidian `App`.

The consumer's [real-Obsidian suite](https://github.com/vrtmrz/obsidian-tagfolder/tree/main/test/e2e-obsidian) then covers note lookup and template application in the actual plug-in. This is the representative example for combining `@vrtmrz/obsidian-plugin-kit/ui`, `@vrtmrz/obsidian-plugin-kit/vault`, the App-free testing entry, and `@vrtmrz/obsidian-test-session` in one consumer.

## DiffZip

[DiffZip](https://github.com/vrtmrz/diffzip) keeps its destructive restore decision behind an injected UI capability in [`restoreConfirmation.ts`](https://github.com/vrtmrz/diffzip/blob/main/src/restoreConfirmation.ts). Its tests can therefore distinguish restore, cancellation, dismissal, and destructive labels through the shared UI harness without mounting a Modal.

Long-running backup and restore operations use the reference-counted screen wake-lock manager through a small application-owned wrapper in [`wakeLock.ts`](https://github.com/vrtmrz/diffzip/blob/main/src/wakeLock.ts). Focused tests own the orchestration and failure cases, while the [real-Obsidian suite](https://github.com/vrtmrz/diffzip/tree/main/test/e2e-obsidian) covers restore confirmation, wake-lock integration, legacy-folder restore, and mirror deletion semantics. DiffZip also uses focused Octagonal Wheels entries for binary conversion, promises, and encryption.

## Screwdriver

[Screwdriver](https://github.com/vrtmrz/obsidian-screwdriver) uses injected `UiInteractions` for target selection and the decision to include plug-in data. The application workflow and its safe dismissal policy are visible in [`ui-workflow.ts`](https://github.com/vrtmrz/obsidian-screwdriver/blob/main/ui-workflow.ts) and exercised through the App-free harness in [`ui-workflow.test.ts`](https://github.com/vrtmrz/obsidian-screwdriver/blob/main/tests/ui-workflow.test.ts).

Restore paths stored in a Screwdriver document are untrusted input. [`restore-path.ts`](https://github.com/vrtmrz/obsidian-screwdriver/blob/main/restore-path.ts) composes the Octagonal Wheels path contract before touching the Vault adapter, and the consumer's [real-Obsidian suite](https://github.com/vrtmrz/obsidian-screwdriver/tree/main/test/e2e-obsidian) checks installation, target selection, and representative restore paths.

## Self-hosted LiveSync

[Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync) is a long-running, broad Octagonal Wheels consumer. It uses focused modules for concurrency, scheduling, reactive state, binary data, persistence, encryption, and browser lifecycle behaviour. This is useful evidence that those modules are exercised in a large application, but support still belongs to each imported entry point rather than to the package root as a universal runtime.

Self-hosted LiveSync also uses `@vrtmrz/obsidian-test-session` as the generic process and Obsidian-session layer beneath its [consumer-owned E2E suite](https://github.com/vrtmrz/obsidian-livesync/blob/main/test/e2e-obsidian/README.md). That suite seeds device-local compatibility markers in local storage before the controlled plug-in's first load, then adds the LiveSync-specific settings, databases, two-Vault scenarios, CLI-to-Obsidian compatibility, dialogue checks, and synchronisation assertions. Fancy Kit's real-Obsidian lifecycle scenario owns the generic guarantee that the prepared state is visible during the controlled plug-in's first and only load. LiveSync retains the application-specific upgrade and Security Seed round trips. Those domain operations deliberately remain outside the shared package.

Its compatibility-review workflow also uses the Obsidian `confirmAction` adapter with `actionLayout: "vertical"` for several long, safety-sensitive choices. Focused consumer tests check the requested host-neutral layout, while the real-Obsidian dialogue suite checks the resulting vertical controls, independently scrolling Markdown, persistent action area, safe-area bounds, and mobile touch targets. The package-owned mobile scenario compares confirmation and text-prompt padding in the same host and checks dialogue bounds while keyboard insets or the viewport change. Its hidden-file integrity workflow uses `KeyedNoticeGroupManager` to keep ordered status rows in one dismissible Notice. These consumers separate application policy from Fancy Kit's rendering and Notice-lifecycle contracts without duplicating the Kit-owned suites.

LiveSync's WebApp and WebPeer create `@vrtmrz/browser-ui-kit` interaction and notification adapters at their browser composition roots. Consumer tests own Root selection, persistence, P2P settings, and runtime composition, while the browser kit owns typed choice mapping, native DOM lifecycle, safe plain-text defaults, and keyed notification expiry. A Compose-backed Playwright scenario then verifies the LiveSync-specific WebApp-to-WebPeer-to-CLI transfer without treating the browser adapter as a Harness or Obsidian substitute.

## Blob utilities: construction, normalisation, and comparison

The unreleased `octagonal-wheels/binary/blob` entry extracts text and binary
Blob construction from Commonlib 0.2.0. Self-hosted LiveSync 1.0.40 uses the
original Commonlib helpers to prepare hidden-file content. Its existing
`createBlob` helper returns Blob inputs unchanged; the new normalisation API
is named `toBlob` to make that identity contract explicit. `isBlobContentEqual`
compares two Blobs in sequential parts of at most 10,000 bytes and accepts an
optional synchronous or asynchronous ArrayBuffer equality predicate.

The [browser contract tests](../packages/octagonal-wheels/src/binary/blob.test.ts)
cover text parts, Unicode, line endings, MIME types, empty inputs, binary view
ranges, byte snapshots, and existing Blob identity. Comparison tests cover
size and MIME handling, bounded read order, early termination, injected
predicates, and unchanged failures. The
[Node boundary test](../packages/octagonal-wheels/test-node/blob.test.ts) checks
import and use without browser services. Packed-consumer fixtures check the
installed module's [public types](../test/packed-consumer/blob-usage.ts) and
[runtime behaviour](../test/packed-consumer/blob-runtime.mjs).

These fixtures define package-owned verification. An unreleased
[Commonlib](https://github.com/vrtmrz/livesync-commonlib) candidate now delegates
its existing creation imports to this entry and wraps `toBlob` under the
legacy `createBlob` name. Its `isDocContentSame` fallback delegates to
`isBlobContentEqual`, retaining Commonlib's Base64 and Buffer fallbacks; native
IndexedDB comparison stays in Commonlib. Existing result contracts pass
before and after delegation. Composition tests spy on the real shared
function, and packed type and runtime fixtures verify the selected Octagonal
Wheels tarball through the legacy imports.

A Self-hosted LiveSync candidate installs the same tested Commonlib and
Octagonal Wheels tarballs. Its hidden-file loading tests call the real
Commonlib helpers with injected storage, assert the storage calls, and verify
text, binary, empty, missing-file, and read-failure behaviour. Its revision
tests exercise real content comparison to distinguish matching content from
content which requires a new revision. The consumer's
unit suite, type and lint checks, and production build pass with those
artefacts; installed package contents and dependency resolution are also
checked against the selected tarballs.

This is candidate compatibility evidence. Released dependency declarations
remain to be updated. Subsequent candidate verification includes CLI builds,
browser workflows, and focused real-Obsidian hidden-file and Customisation Sync
scenarios. Those checks cover their named workflows; physical-mobile validation
remains separate. Document interpretation and content-equality policy remain with
Commonlib.

## Deferred action ownership: candidate integration

The unreleased `octagonal-wheels/concurrency/deferredAction` entry provides
`createDeferredAction` for one replaceable delayed callback per owner.
Cancellation permits another schedule; disposal ends the action's
lifetime. An injected `TimeoutScheduler` selects the host operation without
sharing keys or timer state between owners.

[Browser contracts](../packages/octagonal-wheels/src/concurrency/deferredAction.test.ts)
cover replacement order, cancellation, terminal disposal, independent
instances, stale callbacks, re-entrant scheduling, and unchanged failures.
The [Node boundary](../packages/octagonal-wheels/test-node/deferredAction.test.ts)
and [packed runtime fixture](../test/packed-consumer/timeout-runtime.mjs)
check import and construction without host globals, injected scheduling, and
native timers. Packed type checks cover focused and alias imports without
DOM or Node declarations, the category entry, and the isolated browser bundle.

A Self-hosted LiveSync candidate uses the real deferred action for status-counter
minimum visibility and inactive linger. Consumer tests retain timing, width,
timer receivers, zero-valued handles, independent displays, and source
unsubscription. Composition spies verify scheduling, cancellation, child
action disposal, and the injected host operation. The consumer's unit,
type, lint, Svelte, production-build, and iOS syntax checks pass with the
selected tarballs. The same Octagonal Wheels candidate also passes the
existing Commonlib packed-consumer gate.

This is candidate integration evidence. Released dependency declarations and
physical-mobile checks remain separate work. Subsequent consumer verification
includes CLI builds, browser workflows, and real-Obsidian status and log lifecycle
scenarios. These are workflow-specific checks. The existing Promise-delay
cancellation contracts are unchanged.

## SecretStore: package-owned evidence

The `@vrtmrz/secret-store` core, Obsidian adapter, and Node age adapter have no maintained consumer integration yet. Its [shared contract cases](../packages/secret-store/test/contract-cases.ts) and [memory-store tests](../packages/secret-store/test/secret-store.test.ts) cover asynchronous string and object operations, absent versus empty values, stored JSON null, exact string preservation, validation, replacement, instance isolation, paired serializers, getter defaults used only for absence, and sanitised failures before backend writes. [Packed-consumer verification](../scripts/verify-packed-consumer.mjs) exercises the installed tarball, compiles its public API without Node or DOM types, and checks that its browser bundle loads only the neutral secret and value packages.

The [Obsidian adapter tests](../packages/obsidian-plugin-kit/src/secrets.test.ts) cover injected host calls, receiver binding, input rejection before I/O, malformed results, and error sanitisation. The [isolated real-host scenario](../test/e2e-obsidian/scripts/secrets.ts) exercises synthetic empty, whitespace, NUL, BOM, and Unicode values, absent entries, replacement, and restart. Linux arm64 runs against reviewed Obsidian 1.13.6 established those value behaviours and a native name limit of 64 characters; 65- and 128-character names were rejected. The same results were observed in an explicit 1.11.4 regression probe, which is outside the reviewed catalogue and does not establish supported-version status.

The separate [age codec feasibility study](design/secret-store-age-feasibility.md) pins typage and proves binary interoperability with age 1.3.2 and rage 0.12.1 on Linux arm64. Its tests exercise strict value decoding, authenticated failure handling, limits, and identity-provider calls. The private test facade now exercises the production internal codec in `@vrtmrz/secret-store-node` rather than a second implementation.

The [Node age tests](../packages/secret-store-node/test/age.test.ts) exercise real files on Linux arm64 ext4: ownership, permissions, symbolic and hard links, absent entries versus lost roots, bounded reads, atomic replacement, competing writers, injected failures, and process termination before and after rename. The [native interoperability suite](../test/secret-store-age/interop.test.mjs) also exchanges actual file-store entries with pinned age and rage. Packed-consumer checks compile the focused public entry without DOM types and reconstruct a reader from the installed package.

This is package-owned evidence, not consumer adoption, a mobile qualification, or an OS keychain guarantee. The file checks do not establish Windows ACL, macOS, network-filesystem, hardware power-loss, deployment, or application settings migration guarantees. Add consumer and further real-runtime evidence when those integrations exist.

## ValueStore: package and consumer evidence

`@vrtmrz/value-store` has an unreleased integration in [Commonlib](https://github.com/vrtmrz/livesync-commonlib) and [Self-hosted LiveSync](https://github.com/vrtmrz/obsidian-livesync), tested with an immutable development tarball. This is candidate integration evidence, not adoption in a published consumer release. [ADR 0003](adr/0003-value-store-capabilities.md) separates value operations, the secret profile, and storage adapters. Deletion is explicit; empty string writes remain values, and the official Obsidian raw adapter rejects physical empty output which the host would delete.

Fresh validation on 2026-10-19 passed the complete workspace and packed-consumer gate. The [ValueStore package tests](../packages/value-store/test) cover defaults used only for absence, snapshots, stored falsy values, serializers, sanitised errors, capability boundaries, and adapter failure paths. ValueStore, SecretStore, and the Node age adapter passed 123, 114, and 58 tests respectively on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64; real-file fixtures ran on ext4.

The [browser scenario](../test/value-store-browser/web-storage.mjs) passed in Chromium, covering exact strings, empty-value preservation, explicit deletion, literal prefixes, injected OW encryption, and persistence after profile restart. [Packed-consumer verification](../scripts/verify-packed-consumer.mjs) installed the ValueStore tarball alone and confirmed that it added no package dependencies and contained no secret profile or cryptographic implementation. The [public type fixtures](../test/packed-consumer/value-store-usage.ts) distinguish read, write, and deletion capabilities; bundle checks keep Node code out of root and Web Storage imports. The [installed runtime scenario](../test/packed-consumer/value-store-runtime.mjs) also passed for the documented adapters.

The [Obsidian adapter tests](../packages/obsidian-plugin-kit/src/local-storage.test.ts) and [real-host scenario](../test/e2e-obsidian/scripts/local-storage.ts) passed the changed contract. The complete twelve-scenario suite passed on reviewed Obsidian 1.13.6 on Linux arm64, including rejection-before-mutation of raw empty output, JSON empty values, explicit deletion, selected legacy storage, and persistence after restart. The earlier 1.7.7 probe remains historical evidence outside the reviewed catalogue; it does not qualify the revised contract on that version.

The unreleased Commonlib integration requires an injected `ValueStore & ValueDeleter` and retains exact device keys and the existing Vault and database-suffix configuration scope. LiveSync composes the Web Storage adapter in its Obsidian and browser hosts. Its CLI supplies a backend for the existing flat JSON file format, rather than adopting the Kit Node adapter's different on-disk format. Consumer-owned tests cover awaited writes, absent-value defaults, failed persistence, asynchronous initialisation, and store isolation without changing the Kit API.

On 2026-10-19, this candidate passed Commonlib's type, unit, boundary, and packed-consumer checks; LiveSync's source checks, unit tests, CLI runtime tests, and browser production-bundle tests; and focused real-Obsidian settings, configuration-encryption, Review Harness, and dialogue scenarios on Obsidian 1.13.6 on Linux arm64. Those host checks include persistence through restart and saved P2P device-name loading. The mobile checks used Obsidian's mobile display mode, not physical iOS or Android devices.

The consumer evidence is limited to those settings and device-value workflows. It does not establish a complete synchronisation or upgrade matrix, encryption by default, secret management, hidden Obsidian storage failures, or filesystem durability beyond the qualified environment. The Kit Node adapter and official Obsidian raw adapter still have package-owned evidence only; this consumer uses its own CLI backend and the Web Storage adapter. The injected OW HKDF example demonstrates composition, not a cryptographic audit.

## Reusing the patterns

The examples demonstrate a recurring composition rule:

- create the platform adapter once at the application composition root;
- pass a narrow structural capability to each workflow;
- test application policy with the package harness or an injected fake;
- retain real-runtime tests only for the platform behaviour which the shared contract does not claim; and
- import the smallest documented entry point so that unrelated platform code stays out of the consumer bundle.

Start with the [shared runtime composition guide](runtime-composition.md) and the
package-specific usage guide, then use the linked consumer source as a complete application example. When a consumer changes or stops using a boundary, this page should be corrected rather than preserving the project name as an unqualified endorsement.

## Semaphore permits: candidate integration

The unreleased `withSemaphore` export from
`octagonal-wheels/concurrency/semaphore` runs a callback after acquiring a
permit and releases it once after the callback settles. It retains the
acquisition receiver, default quantity, and ordinary `finally` failure
semantics. Callers can inject an object with only an `acquire` operation.

[Browser contracts](../packages/octagonal-wheels/src/concurrency/semaphore.scope.test.ts)
cover delayed acquisition, synchronous values, asynchronous results, thenables,
processing and acquisition failures, and release failures. Real semaphore
tests verify bounded queued work and permit reuse after success and failure.
The [Node boundary](../packages/octagonal-wheels/test-node/semaphore.test.ts)
and [packed fixture](../test/packed-consumer/semaphore-runtime.mjs) exercise
the same scope without timer, DOM, or fetch globals. Packed type checks cover
the focused and `.js` imports without DOM or Node declarations, result
inference, rejected inputs, and the category entry. A bundle check retains
the helper without the semaphore implementation; the existing entry's Promise
factory selection remains.

ConfigSync initially adopted this helper with characterisation coverage of its
database and extra-file batches. The current unpublished candidate uses
`forEachInScope` for those batches; the semaphore helper retains its independent
contracts above. Its acquisition and release failure fixtures remain package
tests rather than assertions about ConfigSync's current implementation.

## Execution scopes: candidate integration

The unpublished scope APIs combine a borrowed value, registered cleanup, typed
pipelines, child scopes, cancellation observation, and bounded iteration.
The [scope contracts](../packages/octagonal-wheels/src/resource/scope.test.ts),
[cancellation contracts](../packages/octagonal-wheels/src/concurrency/cancellation.test.ts),
and [iteration contracts](../packages/octagonal-wheels/src/concurrency/scopedIteration.test.ts)
cover ownership, retained failures, partial results, and waiting for child cleanup.
The [packed runtime fixture](../test/packed-consumer/scope-runtime.mjs) and
[type fixture](../test/packed-consumer/scope-usage.ts) exercise focused imports;
the [neutral fixture](../test/packed-consumer/scope-neutral-usage.ts) checks the
base and iteration declarations without DOM or Node types.

LiveSync's ConfigSync candidate uses bounded iteration after database enumeration,
retaining the limit of ten, database-before-extra-file ordering, filtering,
per-item logging and continuation, and matched-file retry after a failed store.
Its consumer tests check that iteration failures stay outside item recovery.
Commonlib's integrity diagnostic candidate registers owned remote closure on a
scope covering all source use. Its characterisations cover awaiting closure,
close-error reports, cancellation during acquisition, and retained evidence.
Report assembly remains after cleanup. Borrowed local sources remain open.

These are candidate integrations with package and consumer contract coverage.
Released dependency selection and publication remain separate work.


## Shared runtime and value utilities

The unreleased extraction connects `withCounting` to LiveSync's replication
processor and count-based `CoalescingNotifier` instances to hidden-file batch
progress. The private `performBatchWithProgress` helper retains LiveSync's
per-item failure logging and completion policy. The same notifier also replaces
count-only callbacks in offline reconciliation and rebuilding, retaining attempted
counts and the absence of a final partial notification.

The unreleased `modification` entry now owns `createModificationHandler`. ConfigSync's text
and binary adapters retain read fallback, content equality, write ordering, and
the decision to update stored state. The [content contracts](../packages/octagonal-wheels/src/modification.test.ts)
exercise synchronous and asynchronous callbacks, unchanged content, completion
before returning `changed`, and failure propagation. Installed-tarball type and
runtime fixtures cover its focused and `.js` imports. Consumer tests continue to
exercise the actual text and binary application paths.

Commonlib retains its duration and delimiter-list compatibility functions
and its internal `asCopy` adapter around the focused formatting, string, and
JSON utilities.
LiveSync retains its 255-byte path-component warning default and uses the
shared byte measurement. History and conflict navigation retain their DOM and
reset policy around `stepCyclicIndex`.

Browser contract tests and the packed [runtime fixture](../test/packed-consumer/runtime-tools-runtime.mjs)
cover count and timer triggers, pending latest values, flush, disposal, and
native timer use. The [neutral type fixture](../test/packed-consumer/runtime-tools-neutral-usage.ts)
checks the new declarations without DOM or Node types. Consumer fixtures
exercise the actual wrappers and application methods with the candidate
packages. Existing real-Obsidian and mobile workflow validation remains a
separate boundary from these package and consumer checks.


## Resource ownership: candidate integration

The unreleased `resource` entry separates a disposal capability from ownership
of a value. LiveSync's `withOwnedRemoteResource` delegates its existing finite
operation scope to `withOwnedResource`. Its Replicator disposer uses
`createOwnedResource` while preserving deferred closing, the original receiver,
and one shared completion promise, including rejected cleanup.

Package tests and the packed runtime and neutral type fixtures cover values
without disposal methods, independent owners, synchronous and asynchronous
cleanup, failure retention, and ordinary `finally` precedence. Consumer tests
cover the existing remote-resource wrappers and Replicator factories before
and after their integration. These checks do not establish Logger migration
or real-Obsidian and mobile workflow validation.


## Multi-key locks and callback utilities: candidate integration

The unreleased `withLocks` export from `octagonal-wheels/concurrency/lock`
shares the existing single-key lock groups. Commonlib's offline Metadata repair
and file-event processing now import it directly. Those consumers still own
key namespaces, deduplication, sorting, and conflict hooks deferred until every
lock has been released. The existing cross-consumer tests cover overlapping
rename and Metadata-repair operations, independent keys, and release on failure.

LiveSync imports `onlyWhenChanged` from `octagonal-wheels/function` for settings-control
updates. The callback retains the existing strict-equality and initial
`undefined` behaviour. Its command features import `createCommandCheck` from
`@vrtmrz/obsidian-plugin-kit/command`, retaining fresh selection, falsey-value
rejection, synchronous checking, and consumer-owned asynchronous failures.

The package-owned [lock contracts](../packages/octagonal-wheels/src/concurrency/lock.scoped.test.ts),
[value callback contracts](../packages/octagonal-wheels/src/function.onlyWhenChanged.test.ts),
and [command contracts](../packages/obsidian-plugin-kit/src/command.test.ts)
exercise the promoted implementations. Packed [runtime](../test/packed-consumer/upstream-primitives-runtime.mjs)
and [type](../test/packed-consumer/upstream-primitives-usage.ts)
fixtures verify installed imports, shared lock groups, callback results, and
error behaviour. The existing lock entry requires `AbortController` declarations;
the [neutral type fixture](../test/packed-consumer/upstream-primitives-neutral-usage.ts)
checks command and value callbacks without DOM or Node declarations. The Obsidian type fixture also checks `Command.checkCallback`
compatibility through focused and root package imports.

Consumer tests own document-lock composition, settings updates, and command
actions. This is an unreleased integration; dependency-version selection and
publication remain separate work. These utility contracts do not establish
filesystem durability or additional physical-device coverage.
