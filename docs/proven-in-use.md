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

Its compatibility-review workflow also uses the Obsidian `confirmAction` adapter with `actionLayout: "vertical"` for several long, safety-sensitive choices. Focused consumer tests check the requested host-neutral layout, while the real-Obsidian dialogue suite checks the resulting vertical controls, independently scrolling Markdown, persistent action area, safe-area bounds, and mobile touch targets. Its hidden-file integrity workflow uses `KeyedNoticeGroupManager` to keep ordered status rows in one dismissible Notice. These consumers separate application policy from Fancy Kit's rendering and Notice-lifecycle contracts without duplicating the Kit-owned suites.

LiveSync's WebApp and WebPeer create `@vrtmrz/browser-ui-kit` interaction and notification adapters at their browser composition roots. Consumer tests own Root selection, persistence, P2P settings, and runtime composition, while the browser kit owns typed choice mapping, native DOM lifecycle, safe plain-text defaults, and keyed notification expiry. A Compose-backed Playwright scenario then verifies the LiveSync-specific WebApp-to-WebPeer-to-CLI transfer without treating the browser adapter as a Harness or Obsidian substitute.

## SecretStore: package-owned evidence

The `@vrtmrz/secret-store` core, Obsidian adapter, and Node age adapter have no maintained consumer integration yet. Its [shared contract cases](../packages/secret-store/test/contract-cases.ts) and [memory-store tests](../packages/secret-store/test/secret-store.test.ts) cover asynchronous string and object operations, absent versus empty values, stored JSON null, exact string preservation, validation, replacement, instance isolation, paired serializers, and sanitised failures before backend writes. [Packed-consumer verification](../scripts/verify-packed-consumer.mjs) exercises the installed tarball, compiles its public API without Node or DOM types, and checks that its browser bundle loads only the neutral package.

The [Obsidian adapter tests](../packages/obsidian-plugin-kit/src/secrets.test.ts) cover injected host calls, receiver binding, input rejection before I/O, malformed results, and error sanitisation. The [isolated real-host scenario](../test/e2e-obsidian/scripts/secrets.ts) exercises synthetic empty, whitespace, NUL, BOM, and Unicode values, absent entries, replacement, and restart. Linux arm64 runs against reviewed Obsidian 1.13.6 established those value behaviours and a native name limit of 64 characters; 65- and 128-character names were rejected. The same results were observed in an explicit 1.11.4 regression probe, which is outside the reviewed catalogue and does not establish supported-version status.

The separate [age codec feasibility study](design/secret-store-age-feasibility.md) pins typage and proves binary interoperability with age 1.3.2 and rage 0.12.1 on Linux arm64. Its tests exercise strict value decoding, authenticated failure handling, limits, and identity-provider calls. The private test facade now exercises the production internal codec in `@vrtmrz/secret-store-node` rather than a second implementation.

The [Node age tests](../packages/secret-store-node/test/age.test.ts) exercise real files on Linux arm64 ext4: ownership, permissions, symbolic and hard links, absent entries versus lost roots, bounded reads, atomic replacement, competing writers, injected failures, and process termination before and after rename. The [native interoperability suite](../test/secret-store-age/interop.test.mjs) also exchanges actual file-store entries with pinned age and rage. Packed-consumer checks compile the focused public entry without DOM types and reconstruct a reader from the installed package.

This is package-owned evidence, not consumer adoption, a mobile qualification, or an OS keychain guarantee. The file checks do not establish Windows ACL, macOS, network-filesystem, hardware power-loss, deployment, or application settings migration guarantees. Add consumer and further real-runtime evidence when those integrations exist.

## Local storage: package-owned evidence

The `@vrtmrz/local-storage` core and its Web Storage, Node, and Obsidian adapters have no maintained consumer integration yet. Their [shared contract cases](../packages/local-storage/test/contract-cases.ts) cover asynchronous string and object operations, empty-string deletion, JSON null and other falsy data, exact keys, detached snapshots, paired serializers, and invalid inputs. Missing object reads return undefined, separately from stored JSON null. [Obsidian adapter tests](../packages/obsidian-plugin-kit/src/local-storage.test.ts) additionally verify single host calls, explicit source selection, the lazy legacy provider, malformed results, and sanitised errors.

The [real-browser scenario](../test/local-storage-browser/web-storage.mjs) exercises Chromium local storage with raw strings, literal prefixes, JSON object operations, unusual UTF-16 strings, deletion, and persistence across browser restart. It also stores OW HKDF ciphertext through the [injected serializer example](../examples/value-stores/README.md) and decrypts after restart with a fresh module instance. The example tests cover wrong passphrases, copied keys, damaged ciphertext, transform failures, and fixed errors; they do not constitute a cryptographic audit. [Node filesystem tests](../packages/local-storage/test/node.test.ts) cover strict document parsing, size limits, links, lost files and directories, partial writes, cleanup failures, and uncertain rename outcomes. The package tests pass on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64 with ext4. [Packed-consumer verification](../test/packed-consumer/local-storage-runtime.mjs) also reads and writes the installed Node adapter from a separate process, and the package verifier compiles the neutral API without Node or DOM types and checks browser bundle boundaries.

The [isolated Obsidian scenario](../test/e2e-obsidian/scripts/local-storage.ts) passes on reviewed Obsidian 1.13.6, including official storage, direct legacy Web Storage, the lazy legacy selector with the official capability explicitly omitted, prefix separation, selected-key copying, and restart. The complete reviewed suite passes all twelve scenarios. A passing 1.7.7 regression probe remains unverified; both observed hosts expose the official methods. These results therefore do not identify or qualify an actual host version lacking that API.

This evidence does not establish consumer adoption or application migration compatibility. `getValue` reads raw strings; `getObject` expects JSON text after deserialisation. Consumers choose the representation for each key and own any selected-key conversion. Local storage is unencrypted unless a consumer explicitly supplies an encryption serializer. Obsidian may hide underlying failures which its public API does not return. Windows, macOS, network filesystems, and hardware power-loss durability remain outside the demonstrated filesystem evidence.

## Reusing the patterns

The examples demonstrate a recurring composition rule:

- create the platform adapter once at the application composition root;
- pass a narrow structural capability to each workflow;
- test application policy with the package harness or an injected fake;
- retain real-runtime tests only for the platform behaviour which the shared contract does not claim; and
- import the smallest documented entry point so that unrelated platform code stays out of the consumer bundle.

Start with the package-specific usage guide, then use the linked consumer source as a complete application example. When a consumer changes or stops using a boundary, this page should be corrected rather than preserving the project name as an unqualified endorsement.
