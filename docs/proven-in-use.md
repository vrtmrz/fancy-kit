# Proven in maintained consumers

Fancy Kit is built from recurring needs in maintained Obsidian plug-ins and applications. The useful claim is not merely that its public types compile: the selected contracts are used in application workflows, exercised without Obsidian where injection permits it, and checked again at the platform boundary where that matters.

This is evidence for the named contract, not a package-wide promise that every API has passed every platform combination. Each package remains independently versioned in `0.x`; consult its own guide for the exact runtime and lifecycle boundary.

## How to read the evidence

The projects use four complementary levels of verification:

1. Focused package tests establish package-owned semantics, such as cancellation, result identity, path containment, lease disposal, and failure propagation.
2. Packed-consumer checks install the generated tarballs and verify that the documented exports, declarations, and tree-shaking boundary work outside this workspace.
3. Consumer tests exercise application policy through narrow injected capabilities rather than reproducing Obsidian or browser behaviour.
4. Real-Obsidian E2E and guided device review cover the rendering, process, Electron, Vault, and mobile boundaries which mocks deliberately do not own.

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

Self-hosted LiveSync also uses `@vrtmrz/obsidian-test-session` as the generic process and Obsidian-session layer beneath its [consumer-owned E2E suite](https://github.com/vrtmrz/obsidian-livesync/blob/main/test/e2e-obsidian/README.md). That suite uses exact pre-enable local-storage seeding for device-local compatibility markers, then adds the LiveSync-specific settings, databases, two-Vault scenarios, CLI-to-Obsidian compatibility, dialogue checks, and synchronisation assertions. Those domain operations deliberately remain outside the shared package.

Its compatibility-review workflow also uses the Obsidian `confirmAction` adapter with `actionLayout: "vertical"` for several long, safety-sensitive choices. Focused consumer tests check the requested host-neutral layout, while the real-Obsidian dialogue suite checks the resulting vertical controls, independently scrolling Markdown, persistent action area, safe-area bounds, and mobile touch targets. Its hidden-file integrity workflow uses `KeyedNoticeGroupManager` to keep ordered status rows in one dismissible Notice. These consumers separate application policy from Fancy Kit's rendering and Notice-lifecycle contracts without duplicating the Kit-owned suites.

## Reusing the patterns

The examples demonstrate a recurring composition rule:

- create the platform adapter once at the application composition root;
- pass a narrow structural capability to each workflow;
- test application policy with the package harness or an injected fake;
- retain real-runtime tests only for the platform behaviour which the shared contract does not claim; and
- import the smallest documented entry point so that unrelated platform code stays out of the consumer bundle.

Start with the package-specific usage guide, then use the linked consumer source as a complete application example. When a consumer changes or stops using a boundary, this page should be corrected rather than preserving the project name as an unqualified endorsement.
