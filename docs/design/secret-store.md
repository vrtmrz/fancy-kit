# Cross-platform SecretStore design

Status: Phases 1 through 3d are implemented and locally verified. Later implementation remains proposed. No consumer migration or registry release is included.

Date: 2026-10-19

Decision records: [ADR 0001](../adr/0001-secret-store-boundaries.md) and [ADR 0002](../adr/0002-value-store-serialisation.md).

## Purpose and scope

Provide named secret access that applications can use across Node.js, Obsidian, desktop, and headless environments. Settings hold references; explicitly selected adapters own storage. Applications use `SecretReader` for normal execution and request writing only where needed.

This design preserves the separation between secret access, reference resolution, encryption, and identity provisioning. It adds no automatic synchronisation, environment injection, application settings schema, password manager, or migration of existing encrypted data. Self-hosted LiveSync is a prospective consumer, not a dependency or evidence of an implemented integration.

## Fit with the current repository

The [package architecture](../architecture.md) already places neutral capabilities in `ui-interactions`, concrete integration in platform packages, and composition policy in consumers. [Vault contracts](../../packages/obsidian-plugin-kit/src/vault-contracts.ts) and their [App-free tests](../../packages/obsidian-plugin-kit/src/vault-testing.test.ts) demonstrate narrow injected capabilities and explicit error semantics. SecretStore should reuse that pattern without a transcript that records secrets.

Octagonal Wheels retains its existing encryption APIs, subtree history, and release lifecycle. SecretStore neither wraps all encryption through age nor replaces existing synchronisation encryption. The repository has no neutral filesystem package; secret file operations do not justify extracting one as a prerequisite.

The root workspace glob discovers package directories, but the build, check, test, packed-consumer, and release machinery contains explicit package lists. Implementation therefore requires more than adding a manifest. [CONTRIBUTING.md](../../CONTRIBUTING.md), [packed-consumer verification](../../scripts/verify-packed-consumer.mjs), and [the release runbook](../releasing.md) remain authoritative for those paths.

## Package and dependency proposal

```text
Application workflow -> SecretReader
                           ^
                  @vrtmrz/secret-store
                    ^       ^       ^
   obsidian-plugin-kit   secret-store-node   secret-store-keychain
       ./secrets          ./age  ./systemd        (later)
           |                |                     |
     Obsidian API     age-encryption / Node   native credential API

secret-store-cli -> selected Node adapter and neutral capability
```

This diagram shows the dependency roadmap; `@vrtmrz/secret-store`, `@vrtmrz/obsidian-plugin-kit/secrets`, and `@vrtmrz/secret-store-node/age` are implemented. Arrows towards the neutral package denote dependencies. All backend construction stays at the application's composition root.

| Entry | Runtime and dependencies | Timing |
| --- | --- | --- |
| `@vrtmrz/secret-store` | Types, error class, validation, and memory storage; no runtime dependency, Node built-in, DOM, or Obsidian import. | Phase 1 implemented; unpublished. |
| `@vrtmrz/obsidian-plugin-kit/secrets` | Neutral package and an injected structural subset of Obsidian SecretStorage; retain Obsidian as the platform peer. | Phase 2 implemented; unreleased. |
| `@vrtmrz/secret-store-node/age` | Neutral package, `age-encryption`, and Node filesystem APIs. | Phase 3b implemented; unpublished. |
| `@vrtmrz/secret-store-cli` | Node age adapter initially; a separately reviewed backend selector if other management adapters are added. | Phase 4. |
| `@vrtmrz/secret-store-node/systemd` | Neutral package and Node file reads; this entry must not evaluate the age codec. | Phase 5, when needed. |
| `@vrtmrz/secret-store-keychain` | Neutral package and a native binding selected after platform tests. | Phase 5, when needed. |

Use ESM, declarations, explicit export maps, `sideEffects: false` where accurate, package-name imports between workspaces, and the repository's existing build conventions. Keep testing imports free of platform modules. Do not add an umbrella import that loads every adapter or dynamically chooses one.

The Node package groups file-based adapters, rather than publishing separate age and systemd packages. Its age byte codec is internally portable and separate from Node I/O, but a public browser persistence adapter is outside the first scope. A later browser adapter should use an explicitly supplied storage capability, with its own authority and atomicity contract; it must not import the Node entry. The systemd subpath avoids evaluating age code, although installing the shared Node package still installs its declared age dependency.

## Core public contract

Phase 1 exports `SecretReader`, `SecretStore`, `SecretStoreError`, `SecretStoreErrorCode`, `validateSecretName`, and `MemorySecretStore`. Phase 3d adds `ObjectValue`, `ValueSerializer`, and `SecretStoreOptions` to the public contract. The interface signatures are defined in the [ADRs](../adr/0001-secret-store-boundaries.md#keep-the-common-contract-small) and their update [for value serialisation](../adr/0002-value-store-serialisation.md). Exported declarations and option fields require TSDoc covering these behaviours:

| Operation | Contract |
| --- | --- |
| `getValue(name, defaultValue?)` | Resolve to the exact logical string, including empty strings; use a supplied default only for a confirmed absent entry, otherwise return `null`; reject for validation, access, provider, serializer, and storage failures. |
| `getObject(name, defaultValue?)` | Parse a stored logical string as finite JSON data. Use a supplied default only for absence, otherwise return `undefined`; preserve a stored JSON `null` as `null`; malformed data rejects with `invalid-data`. |
| `setValue(name, value)` | Create or replace that entry with the exact logical string. Validate before serialisation and backend operations. Resolve only after the backend acknowledges its documented write operation. |
| `setObject(name, value)` | Validate and snapshot finite JSON data, encode it as JSON, then use the same string-serialisation boundary as `setValue`. Top-level `null`, empty strings, zero, and `false` remain data. |
| `validateSecretName(name)` | Return normally for a portable name; throw a sanitised `invalid-name` error otherwise. Async store methods convert validation failures to rejected promises. |
| `new MemorySecretStore()` | Create an empty, independent store. No shared map, persistence, logger, or initial-value aliasing. |

Getter defaults are validated before I/O and are never transformed or persisted. Object defaults are detached snapshots taken before awaiting. A supplied default removes absence from the return type without asserting the shape of stored JSON; it never replaces storage, decryption, or parse failures.

`ValueSerializer` is an optional instance-scoped pair of `serialize(name, value)` and `deserialize(name, value)` methods; each may return a string or a promise. It is captured with its receiver at construction, with no construction-time I/O. String operations call it once per present read or write; object operations pass JSON text through the same pair. A missing read bypasses deserialisation. Validate logical names and values before transforming them, validate serializer results before backend writes, and map failures to fixed errors without causes or fallback. Without a serializer, strings pass through unchanged. The structural type is owned by the neutral contract; no runtime dependency is added between local and secret storage.

Empty values, line endings, leading or trailing whitespace, NUL characters, and well-formed Unicode are data. Do not trim, normalise, interpolate, or treat a falsy string as missing. Reject unpaired UTF-16 surrogates as `invalid-value`, since portable UTF-8 storage cannot round-trip them unchanged. Do not promise a universal maximum value size: each backend documents its limit and rejects oversized values before writing. A backend which cannot preserve a supported value must explicitly reject it; compatibility tests must expose any such restriction.

After an awaited memory write, a read observes that value unless another write intervenes. Memory operations need no I/O queue. The common interface promises no transactions, compare-and-swap, cross-process ordering, secure erasure, or persistence through a power failure. A rejected platform mutation may already have taken effect; callers must not infer rollback or retry it automatically.

### Names and namespaces

Names contain 1–64 ASCII characters matching `[a-z0-9]+(?:-[a-z0-9]+)*`. Validate the whole input. Reject uppercase letters, slashes, backslashes, dots, percent escapes, colons, whitespace, leading or trailing dashes, and repeated dashes. Neither URI parsing nor URL decoding belongs here.

This is a deliberately conservative profile within Obsidian's documented lowercase alphanumeric and dash convention. Real-host qualification on 1.11.4 and 1.13.6 established a 64-character maximum: 63 and 64 succeeded, while 65 and 128 failed. The common limit was narrowed from the initial 128-character proposal before publication. Shared regression cases retain the 128-character input as an explicit rejection and require the adapter to reject it before I/O. Application-owned prefixes such as `example-api-token` are ordinary names, not an authorisation mechanism. Store roots, native service identifiers, and host permissions establish isolation. Do not prepend an undisclosed global namespace or silently rename existing platform entries.

The file adapter uses `secret-<name>.age`; the fixed prefix avoids Windows device-name collisions such as `con.age` while retaining a readable mapping. Lowercase-only names avoid case-insensitive filesystem collisions. This naming decision is part of the file layout, not a path interpretation in `SecretReader`.

### Optional capabilities

When management needs them, add separate structural capabilities:

```ts
/** Deletes entries without requiring read or write access in the type. */
export interface SecretDeleter {
    /** Returns true if removed, false if absent, and rejects on failure. */
    delete(name: string): Promise<boolean>;
}

/** Enumerates names visible within the adapter's documented scope. */
export interface SecretLister {
    /** Returns a sorted, unique list of names, without fetching their values. */
    list(): Promise<readonly string[]>;
}
```

These declarations are future API proposals, not Phase 1 exports. A list is not a transactional snapshot. The age lister owns only final `secret-<portable-name>.age` entries: ignore the recipient policy and temporary files, reject malformed entries using the managed prefix, and never open files outside that mapping. An adapter must document its namespace and treatment of foreign entries before exposing enumeration. Do not emulate deletion by setting an empty string, or list by reading every secret. Read-only adapters simply implement `SecretReader`; they do not have write methods which always throw.

Passing a reader type limits application coupling. Actual read-only operation requires process permissions or a backend that has no write facility.

### Failure categories and redaction

`SecretStoreError` has a readonly `code` and a fixed message selected from that code. Its public constructor takes the code, not a user-supplied message or raw cause.

| Code | Evidence needed |
| --- | --- |
| `invalid-name` | The name fails the documented portable profile. |
| `invalid-value` | A supplied value cannot be represented or exceeds a documented backend limit. |
| `unavailable` | The required API, configured root, service, or identity source is unavailable or unconfigured. |
| `access-denied` | A reliable platform status establishes denied access. |
| `decryption-failed` | Encrypted input cannot be authenticated or decrypted with the supplied identities. |
| `invalid-data` | A format, encoding, or storage-layout violation is positively identified. |
| `operation-failed` | The operation failed without enough reliable information for a more specific category, including an uncertain write outcome. |

Do not parse arbitrary human-readable errors to manufacture precision. An unknown host exception is `operation-failed`; an absent entry is the success value `null`. A configured directory that has disappeared is unavailable storage, not an empty store. `EACCES` and `EPERM` are failures even during a missing-entry probe.

Sanitise errors at every external boundary, including injected identity providers. Do not retain arbitrary upstream errors in `cause`, enumerable properties, debug output, or CLI output. Names, paths, public recipients, ciphertext, and error payloads can also contain sensitive operational information; fixed library messages omit them. Applications may add carefully selected context themselves. No library logging or value-bearing testing transcript is required.

Authentication failure cannot always distinguish a wrong identity from corruption. With the inspected age library, decryption exceptions are not a stable typed taxonomy, so they map conservatively to `decryption-failed`. Independently detected invalid UTF-8 or file-layout violations can use `invalid-data`. A finer upstream error API can improve classification later without turning failure into absence.

## Backend designs and evidence

### Memory

Use a private, instance-owned `Map<string, string>`. Validate inputs consistently with persistent adapters. Implement the asynchronous string and object methods through the neutral facade, including the optional serializer. Return empty strings unchanged and expose no persistence or enumeration implicitly. Memory storage is for tests or explicitly chosen ephemeral use; it is not a fallback when a persistent backend fails.

### Obsidian

The lockfile currently resolves `obsidian` 1.14.4. Its official type declarations mark `App.secretStorage` and the get, set, and list operations as available since 1.11.4. Calls are synchronous; the adapter presents rejected or resolved promises. The public API has no delete method. The inspected declarations and official guide are linked under [Sources](#sources).

The implemented `createObsidianSecretStore(storage, options?)` factory accepts the structural `ObsidianSecretStorage` get/set subset and optional serializer settings. The host methods stay synchronous; the returned neutral `SecretReader` and `SecretStore` expose asynchronous `getValue`, `getObject`, `setValue`, and `setObject`. The factory constructs no `App` and imports no Obsidian runtime module or internal storage implementation. The composition root obtains `app.secretStorage`; construction checks that the required methods exist. Missing support produces `unavailable`. An injected fake supplies the same shape for unit tests. Do not read Obsidian's local storage directly, infer disk layout, or emulate its lifecycle.

The plugin kit currently accepts Obsidian `>=1.8.7`, as does the Harness manifest. Preserve compatibility for existing features: document the 1.11.4 requirement on the new focused entry and feature-detect its use. Do not raise the package-wide minimum or make root imports access `app.secretStorage`. Consumers requiring secrets on every startup can independently raise their plugin minimum.

Obsidian controls persistence, sharing, and access. Do not describe this adapter as an OS keychain, promise cross-device synchronisation, or claim plugin-level or cross-Vault isolation. An API return does not prove disk durability. Do not expose listing initially, because the host's shared namespace needs a separate policy; never fake deletion. Linux arm64 qualification on reviewed Obsidian 1.13.6 established empty-string, whitespace, NUL, BOM, and Unicode round trips, replacement, and persistence after normal renderer close and restart. An explicit 1.11.4 regression probe observed the same behaviours and name limit; this version remains outside the reviewed catalogue, so the probe is not supported-version qualification. Other desktop platforms and mobile have not been qualified for this adapter.

Real-host tests use unique, disposable names in an isolated test Vault and profile. Because no supported delete API exists, cleanup discards the owned test profile; it must not edit a user's internal storage. No secret input UI or SecretComponent wrapper is included in this adapter phase.

### age files

#### Dependency and key boundary

`age-encryption` 0.3.1 is pinned as a runtime dependency of the Node adapter and as a development dependency for the completed [Phase 3a feasibility study](secret-store-age-feasibility.md). It is an ESM implementation of age, with a BSD-3-Clause licence and pure JavaScript cryptographic dependencies. The locked transitive dependencies require Node.js 20.19.0 or later. Codec and native interoperability checks passed on Linux arm64 with Node.js 20.19.0, 22.23.3, and 24.18.0; the dependency-floor probe does not extend repository support. The report records the exact dependency graph, upstream text-decoding mismatch, sanitised error mapping, and unqualified platforms. The Node adapter now uses that codec internally; there is no public codec export.

Use native X25519 recipients and identity strings for the first backend. Multiple recipients are supported; each can decrypt the same secret. Passphrase, SSH, plugin, hardware, and post-quantum identity modes are deferred. Do not invoke `age` or `rage` from application code; those executables are interoperability test or provisioning tools.

Keep byte encryption/decryption separate from Node file operations as an internal seam. Inject identities with the backend-specific function:

```ts
/** Supplies provisioned age identities for one read operation. */
export type AgeIdentityProvider = () => Promise<readonly string[]>;
```

This type belongs to the age adapter, not the neutral package. The reader factory binds an explicit root and provider. The store factory additionally requires a non-empty, validated recipient list, copied at construction. Factories are asynchronous to validate their configured roots; neither creates directories. The public factories are `createAgeFileSecretReader` and `createAgeFileSecretStore`.

Read the encrypted file before acquiring identities, so an absent entry does not unlock a key store or prompt the user. Request identities once per read; do not cache them globally or retain them between calls. An empty identity result is an unavailable key source; supplied identities that cannot decrypt the file cause `decryption-failed`. Writes use only recipients and must not acquire a decryption identity. Provider implementations may be interactive, but headless composition must explicitly supply a non-interactive one. Provider dependency cycles remain a composition error.

#### File layout

```text
<caller-selected-root>/
    recipients.txt                 # optional future CLI configuration
    secret-connstr-foo-bar.age
    secret-github-api-token.age
```

Each `.age` file contains one standard age ciphertext whose plaintext is the string delivered to the backend, encoded as UTF-8. For object methods that string is JSON text; when configured, the consumer serializer transforms it before encryption and restores it after decryption. Use binary age output, not a new cryptographic format or a file-level application envelope. Decrypt to bytes, authenticate the complete file, and decode UTF-8 strictly while preserving a leading BOM. Never return partially authenticated plaintext. Reject unpaired surrogates before encoding writes.

`recipients.txt` is optional management configuration, not runtime reader state. The reader never needs it. An application writer receives recipients explicitly; the CLI can load the file into that option. The file contains public X25519 recipients, with documented blank-line and comment handling. Invalid or empty policy fails before mutation. Do not store identities beside ciphertext or generate them during initialisation.

The layout leaks names, entry count, approximate value sizes, and change timing. Hashing a filename would not reliably hide guessable names. Separate files permit independent replacement and decryption, but many small files cost more filesystem work. There is no claim that binary ciphertext produces meaningful textual Git diffs. If name confidentiality or very large entry counts become requirements, revisit the aggregate-file alternative before declaring this layout stable.

Enforce a 64 KiB plaintext limit and 1 MiB ciphertext limit per entry, with bounded reads and validation before writes. These are resource limits for this backend, not limits of the core interface or native stores. Pin them in tests and document any later change.

#### File authority and atomic replacement

The caller selects a dedicated root. Resolve it during factory creation and validate it again when necessary to distinguish a missing entry from a lost root. Do not discover a root from working-directory traversal or settings references. Initialisation is a separate, explicit CLI operation.

Require a root and ancestors that untrusted principals cannot replace. Reject entry symlinks, junctions, non-regular files, and unexpected hard links. Use no-follow opening where available and verify the opened file descriptor. Lexical containment and `realpath` checks alone do not defeat an attacker racing replacement of a parent directory. Portable Node APIs do not justify claiming protection against a hostile owner of the root; deployments requiring that boundary need a stronger OS capability or native implementation.

Future POSIX management commands must create directories with mode `0700` and files with mode `0600`, set at creation, and validate rather than silently repair permissive existing paths. This first writer model assumes the runtime reads as the owning user. Separate service-user provisioning, shared-group access, and Windows ACLs require explicit integration evidence; POSIX mode bits are not a Windows ACL guarantee. Do not claim unsupported ACL protection or broaden access automatically.

For each write:

1. Validate inputs, recipient policy, limits, and root authority before mutating persistent state.
2. Encrypt in memory. Never create a plaintext temporary file.
3. Exclusively create a randomly named temporary ciphertext file in the same directory, with restricted permissions.
4. Complete the write, flush and close the file, then atomically replace the final entry using the tested platform operation.
5. Sync the directory where supported by the stated durability contract. A failure after replacement is an uncertain outcome, not proof that the old value remains.
6. Remove only the current operation's owned temporary file in `finally`, when it still exists.

Before replacement, a failure leaves the previous final entry intact. Concurrent readers see a complete old or new entry on filesystems for which atomic replacement has been verified. Concurrent writers use last-writer-wins at replacement, with no compare-and-swap guarantee. Applications needing conflict rejection must coordinate writers externally; a future conditional-write API is a separate design decision.

There is no on-disk lock, transaction journal, automatic retry, backup-copy fallback, or stale-file recovery service in the initial implementation. A crash may leave a ciphertext temporary file. Readers ignore it; explicit operator cleanup must avoid removing a live writer's file. Permission errors, sharing violations, unsupported replacement semantics, and network filesystems need real integration tests. Start with qualified local filesystems; do not silently degrade to non-atomic overwrite.

The implemented POSIX authority check requires the root to belong to the effective user, with no group/other permissions or special bits: reads require owner read/search (`0500`), and writes additionally require owner write (`0700`). Ancestors must belong to root or the effective user; group/other writable ancestors require the sticky bit, with every child still checked for trusted ownership. All components reject symlinks. Device and inode identities are retained in memory and rechecked for the entire ancestry. Secret entries must be private, owner-readable regular files with one link; an already opened old inode may become unlinked during atomic replacement.

The public implementation returns `unavailable` on Windows rather than substituting mode checks for ACL authority. Linux arm64 ext4 fixtures establish the tested replacement, concurrency, and process-interruption behaviour. They do not prove hardware power-loss durability or qualify macOS and network mounts. The factory cannot identify every unsuitable filesystem automatically; deployments must select a qualified local filesystem. See the [Node adapter README](../../packages/secret-store-node/README.md) for usage and operational limits.

#### Identity and recipient changes

Recipients configure future encryption. Changing a recipient file or reconstructing a writer does not alter existing ciphertext. New recipients cannot read old entries until those entries are re-encrypted. Removing a recipient does not revoke access to retained historical ciphertext.

To support device replacement and deployment, the proposed CLI includes re-encryption into a separate output store. It leaves the source unchanged and encrypts every selected entry to an explicit replacement recipient set. This is a proposed operational extension, not an implemented migration facility. In-place `recipients add/remove`, resumable rewriting, and automatic activation remain deferred: they would require a separate consistency and recovery design. The [migration and deployment paths](#device-migration-and-server-deployment) below define the initial workflow. Credential rotation at the issuing service is distinct from re-encryption and may be required after exposure.

age provides ciphertext confidentiality and authentication, not writer identity, binding to a filename, freshness, or rollback prevention. Someone able to replace files can replay or swap valid ciphertext, and someone with a public recipient can create new ciphertext. Trusted provisioning and directory write controls remain necessary. Application-level provenance would require another reviewed design.

### Native keychain

Evaluate the pinned candidates before choosing an implementation:

| Candidate inspected | Relevant properties | Proposed disposition |
| --- | --- | --- |
| `@napi-rs/keyring` 2.1.1, MIT | Native Rust bindings and platform-specific npm binaries; async entry API. Linux defaults can fall back from Secret Service to kernel keyutils. | Preferred candidate for a separate optional package, with `{ linux: { store: 'secret-service' } }` on every entry. No kernel fallback. |
| `just-secrets` 0.0.2, MIT | No npm runtime dependency or native addon, but invokes OS tools: `security`, `secret-tool`, or PowerShell. Node.js 22+ and documented value/identifier limits. | Useful alternative if subprocess trade-offs are accepted; does not satisfy the preferred in-process execution model. |

Require an explicit application service identifier and map the portable name to the credential account. Prefer `AsyncEntry` and get/set operations. Do not use `withTarget`: in the inspected source, Windows target construction can write a placeholder credential, which is unsuitable for a read operation. Confirm constructor side effects and platform namespace mapping in native integration tests.

The inspected binding maps only the native missing-entry result to `null`; other failures propagate. Sanitise those errors and map reliably coded statuses only. The inspected conversion does not establish a portable fine-grained error taxonomy. Test locked stores, denied access, unavailable sessions, missing binaries, Unicode and empty values, service isolation, read side effects, and native limits. A session bus and Secret Service provider are still required on Linux even without subprocesses.

Keep the binding out of neutral, browser, Obsidian, and ordinary file-reader dependency paths. Verify supported OS/CPU/libc binaries and install behaviour before claiming cross-platform support. Package presence or successful mocked tests do not prove native store access, reboot persistence, or platform consent behaviour.

### systemd credentials

Provide a read-only adapter in the Node package when a consumer needs it. The composition root supplies a credentials directory, normally obtained explicitly from `CREDENTIALS_DIRECTORY`; the module does not inspect environment state during import. An unset or inaccessible root is `unavailable` or `access-denied`, not a reason to search another directory.

systemd resolves `LoadCredential=` and decrypts `LoadCredentialEncrypted=` before presenting the service with files. Read the exact credential filename for a validated portable name, with no `.age` suffix, and decode UTF-8 strictly without trimming a trailing newline. Enforce bounded reads, regular-file and link checks, and confirmed absence semantics. Reject invalid text as `invalid-data`; the core API is not a binary credential interface.

Do not run `systemd-creds`, implement systemd decryption, chmod its supplied directory, copy credentials into settings, or expose a write operation. Unit configuration and permissions remain deployment responsibilities. A real transient-unit test owns service provisioning evidence; an ordinary temporary-directory test only proves the adapter's file handling.

## Management CLI proposal

The executable name `fancy-sec` remains provisional. The first CLI manages an explicitly selected age root; it does not become a runtime dependency of application reads.

| Command shape | Intended behaviour |
| --- | --- |
| `init --store <path> --recipient <public-recipient>` | Explicitly create a restricted root and initial public policy. Reject an existing conflicting layout; create no identity. Permit repeated recipient options. |
| `set <name> --store <path>` | Use concealed TTY input; cancellation performs no write. Never accept a secret value as a positional argument. |
| `set <name> --store <path> --stdin` | Explicit bounded stdin input, preserved exactly, including terminal newlines; reject accidental mixed input modes. |
| `get <name> --store <path> --reveal` | Write the exact plaintext to stdout only with this explicit flag, with no added newline. Without it, fail usage validation before reading. |
| `list --store <path>` | Print names only, without acquiring identities or decrypting values. |
| `delete <name> --store <path>` | Use a TTY confirmation or an explicit non-interactive confirmation flag; require the delete capability. |
| `recipients list --store <path>` | Inspect public policy. In-place recipient mutation remains deferred. |
| `identity generate --output <path>` | Explicitly generate an X25519 identity into a new, restricted file outside the store. Refuse overwrite and print only its public recipient. |
| `identity recipient <identity-source>` | Derive public recipients from an explicitly selected identity source without printing identities. |
| `reencrypt --from <source> --to <new-store> --recipients-file <policy> <identity-source>` | Build a separate encrypted store for an explicit recipient set. Keep the source unchanged; never export plaintext or silently inherit recipients. |
| `verify --store <path> <identity-source> [--require-name <name>]` | Authenticate and decode every managed entry, additionally require each explicitly named entry to exist, and report success or failure without values. Permit repeated required-name options. |

Identity acquisition remains behind `AgeIdentityProvider`. The proposed Node helpers and CLI support these explicitly selected sources; the core package never reads `process.env`:

| Identity-source option | Meaning |
| --- | --- |
| `--identity-file <path>` | Read a separately provisioned, permission-restricted identity file outside the store root. |
| `--identity-file-env <variable-name>` | Read the file whose path is supplied by that environment variable. The variable contains a path, not key material. |
| `--identity-env <variable-name>` | Read identity text injected into the selected environment variable by the caller or deployment platform. |

Require exactly one source for a CLI operation that needs identities; reject conflicting sources before reading any of them. Missing, empty, invalid, or inaccessible selected sources fail without trying another file, variable, or provider. Accept documented X25519 identity lines and comments, with bounded input and sanitised failures. Apply link and permission checks to file sources. File-path selection through an environment variable has the same checks as an explicit path.

Pass the variable's name to `--identity-env`, never expand the private value into a command argument. The example variable names in this document are illustrative and have no automatic discovery behaviour. Reading an environment variable does not securely erase it, stop inheritance by child processes, or turn the environment into an encrypted store. Environment injection is an explicit deployment option; a mounted identity file or service credential is preferable where the platform offers it. In particular, systemd advises credential delivery rather than unit environment variables for secrets; see its [environment and credentials guidance](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Environment=).

Automatic key discovery, generation during `init`, copying into a store, and module-global caching remain excluded. `identity generate` is a separate, explicit provisioning operation. It requires a caller-selected output path, restrictive creation permissions, and exclusive creation; it neither prints the private key nor provisions a remote machine. Native-store identity helpers can follow with that adapter. A systemd-delivered age identity file can already be consumed by the file provider, independently of the later `SystemdCredentialReader` for application secrets.

Send fixed operational diagnostics to stderr, never values or raw exceptions. Concealed input must restore terminal state on cancellation, signals, and errors. Non-TTY execution requires an explicit input mode and must not wait for an invisible prompt. Document reveal output as deliberate disclosure to the chosen terminal or pipe.

Define and test stable exit categories before implementation: success, absent entry, usage/invalid input, and operational failure. Do not report failure as absence or success, and document that an operational failure after a mutation can have an uncertain outcome. Backend capabilities must be checked before requesting a secret. No shell subprocess should be necessary for ordinary library or CLI age operations.

## Device migration and server deployment

The following operational workflows extend the CLI proposal. They keep the neutral API unchanged and add explicit provisioning, environment input, re-encryption, and verification to the management phase. The commands are illustrative and are not available yet.

### Device replacement

Two paths are supported by the proposed design:

| Path | Procedure | Trade-off |
| --- | --- | --- |
| Keep the existing identity | Transfer the encrypted store and application references, provision the existing identity through a separate trusted channel, and verify on the destination. | No re-encryption, but both devices share the same decryption authority. |
| Give the destination its own identity | Generate the identity on the destination, transfer only its public recipient to an authorised source machine, re-encrypt into a new store, transfer that ciphertext, and verify with the destination identity. | The private identity stays on the destination; the transfer requires an existing identity capable of decrypting every source entry. |

Prefer a distinct identity when devices need independent provisioning. Include an independently held recovery recipient when creating the store if recovery from device loss is required. All named recipients can decrypt; a recovery identity must therefore be protected as another full decryption authority. Without any working recipient identity, existing ciphertext cannot be migrated by this CLI.

For the distinct-identity path:

1. On the new device, explicitly generate an identity outside the encrypted store and share its public recipient.
2. On the source, obtain a stable snapshot or pause writers. Prepare the complete intended recipient set, including any retained devices and recovery recipient; do not infer it from an old policy file.
3. Run `reencrypt` with the source identity and a fresh destination. This produces standard age ciphertext for the same names and values under the new recipient policy.
4. Transfer the completed output using the existing file-transfer or deployment mechanism, including its integrity checks. Transfer application settings containing references separately as needed.
5. On the destination, run `verify` with the new identity and the application's required names, then point the application at the new root. Verify application connectivity separately; decryption success does not prove that a credential remains valid at its issuing service.
6. Retire the old deployment after the destination works. Omitting the old device from the new recipient set does not revoke its access to retained old ciphertext or already learned credentials; rotate actual service credentials when that is required.

The CLI does not provide SSH transport, synchronisation, host enrolment, or remote execution. Directly migrating values in `ObsidianSecretStore` requires an Obsidian-side workflow using its official API; a Node CLI must not rewrite Obsidian's internal storage. An application can keep an age identity in Obsidian SecretStorage through an injected provider, but its import and device provisioning need an explicit host workflow.

### Re-encryption completion and failure

Re-encryption is a preparation operation into a new store, not a transaction over the running source. Require a stable source snapshot or externally paused writers; per-file atomicity alone cannot provide a consistent multi-file snapshot. Capture the selected name set before conversion and require every selected entry to decrypt and write successfully. A missing or failed entry aborts the command rather than producing a successful subset.

Write only ciphertext and public recipient policy into an owned staging directory. Use a destination parent whose namespace is exclusively controlled for the operation, reject an existing destination, and expose the completed output at the requested destination only after validating the complete selected file set. Qualify the same-filesystem directory publication operation on each supported platform; reject unsupported behaviour rather than copying partial output into the final path. Errors after publication have an uncertain outcome and must not trigger deployment automatically.

On ordinary failure, clean only the command's owned staging files. A killed process may leave staging ciphertext; it is not a completed deployment and must never be auto-selected by a reader or deployment script. Restart by creating a fresh output from the unchanged snapshot. No recovery journal, resumable mutation, plaintext bundle, identity export, or live-root switch is added. Tests must establish publication, collision, interruption, and cleanup behaviour before the command is released.

`verify` detects missing explicitly required names, authentication failures, invalid text, and invalid layouts without revealing values. Checking only the files found cannot prove that transfer preserved the source's complete inventory. Deployment tooling must also validate the completed artefact's file set and integrity, and the application or its deployment configuration supplies required names. Do not inspect arbitrary settings or automatically resolve `fancy-sec://` references in the CLI.

### Server deployment

Treat application releases, encrypted secret artefacts, and identity provisioning as three independent inputs:

1. Provision the server's identity once through the selected deployment secret facility or generate it on the server. Keep it out of the application image, repository, and encrypted store. Share its public recipient with the authorised secret-management process.
2. Prepare an encrypted store for that server or environment, normally with an independently held recovery recipient. Use a separate store and actual credentials where development and production must remain isolated.
3. Deploy the application, reference-only configuration, and completed ciphertext artefact. Ordinary builds and transfers need no decryption identity. Re-encrypting existing entries does require an authorised source identity, so it belongs in secret provisioning rather than every application build.
4. Supply the runtime identity by an explicit file source, environment source, or service credential. Configure the store path and provider at the application's composition root; application reads call the library directly.
5. Before activation, verify with the same service identity and permissions as the runtime, require the application's expected names, and perform application-owned connection checks. Use the existing deployment mechanism to activate or roll back the complete release and encrypted store together.

For systemd, `LoadCredential=` or `LoadCredentialEncrypted=` can provide an age identity as `age-identity`. The application reads that file below `CREDENTIALS_DIRECTORY` through the file provider; systemd performs any outer credential decryption. There is no need to wait for the separate systemd application-secret adapter. Qualify the provider against the service's actual permissions and credential mount. The library does not create or change a unit file.

For a deployment platform that supplies secret environment variables, select its injected identity variable explicitly. If it supports secret files instead, the environment can carry only the file path. The management CLI and runtime helpers use the same parsing and failure rules. Neither silently switches sources, saves an environment identity to disk, nor requires a management command at each application read.

Provision files with ownership and permissions suitable for the runtime user before verification. The file adapter does not solve deployment-user versus service-user ownership, modify systemd's credential permissions, or guarantee every container secret mount. Include a service-user integration scenario in qualification rather than relying on successful checks as the deploying administrator.

A recovery identity protects against lost device keys only while a compatible encrypted store remains available. Back up the encrypted store and recovery identity separately. Release rollback and recipient removal do not undo a credential rotation performed at the issuing service.

## Later utility: encrypted packs for bulk provisioning

Propose a later management utility for preparing several named secrets locally and installing them into a selected writable store on another machine. This is useful for initial server provisioning and cross-backend transfer. It does not require operators to enter every secret again on the destination. The extra work is the transfer schema, target-specific behaviour, and partial-failure contract; an encrypted pack is not inherently excluded as unsafe.

Keep the utility above `SecretReader` and `SecretStore`, outside the core contract. Export takes an explicit name selection and a reader; it needs no mandatory list capability. Import takes a caller-selected store and validated entries. Reuse these operations from the Node CLI or an Obsidian-hosted integration when the relevant adapters are available. Do not create another package solely for the command names before the runtime boundaries require it.

Illustrative commands, not implemented interfaces:

```text
fancy-sec pack --from <source> --names-file <selection> --recipients-file <policy> --output <bundle.age>
fancy-sec import --input <bundle.age> --to <target> <identity-source>
```

Source adapter options remain explicit. The pack's recipient policy selects who can open the transport file, independently of the source store's own encryption policy and the destination backend. A destination using OS keychain storage can decrypt the pack with a separately provisioned, possibly temporary age identity and then store values through the keychain API. It need not use age for normal application reads afterwards. Establish the transport identity separately; putting its private key into the pack would not solve initial key provisioning.

### Transfer data and trust

Propose one versioned UTF-8 JSON document containing an array of name/value entries, encrypted as one standard age file. The application schema describes data inside age; it introduces no new cryptographic format and does not change the per-entry age storage layout. Start without ZIP, archive paths, compression, executable hooks, configuration templates, or an embedded destination selector.

Encrypt both names and values. Include only the explicitly selected application entries; never automatically include source-backend identities, transport identities, authentication caches, or host configuration. A selected application secret may itself contain key material, so the utility cannot infer a safe export selection from its string contents. Selection and authorisation belong to the caller.

Authenticate the complete ciphertext before parsing or writing entries. Validate the schema version, input types, portable names, unique names, value representation, entry count, and total and per-value size limits before any target write. Use bounded memory and ciphertext-only temporary files. Set concrete finite limits before implementation; an oversized, malformed, or unsupported pack must fail without partial import. Never emit plaintext JSON or secret values to logs, reports, or standard output.

The caller chooses the destination and its namespace outside the pack. Show a value-free name plan for an interactive import; automated deployments supply an independently trusted expected-name selection. The encrypted pack provides confidentiality and ciphertext integrity, but does not identify its sender or authorise its contents. Use the deployment's trusted transfer mechanism; do not infer source authenticity merely because age decryption succeeded.

### Import behaviour and limitations

Before writing, read the selected destination names and reject existing entries by default. Perform all available schema, name, capability, conflict, and backend-limit checks first. This is not an atomic create-if-absent guarantee: the core API has no conditional write. For the first importer, require an exclusively controlled destination or externally paused writers; platforms that cannot meet that precondition need a different qualified import mode. Explicit replacement, conflict merging, and unattended retry are separate later decisions.

Apply entries sequentially and stop on the first write failure. Report completed, failed or uncertain, and unattempted names with sanitised status codes and no values. A failed write may already have taken effect. Do not claim that a multi-entry import is atomic, promise automatic rollback, or introduce a durable recovery journal. A process interruption may leave partial installation with no final report; recovery must inspect the destination or provision a new isolated target before retrying.

Where a backend supports a fresh isolated store, prefer preparing it, verifying all expected entries, and activating it through the existing deployment mechanism. This permits application-level switching without pretending that every `SecretStore` offers a batch transaction. Verification establishes readable values and expected names; application connection checks remain separate.

| Destination | Import boundary |
| --- | --- |
| age file store | Import into a new explicit root and recipient policy, then verify before activation. Direct copying or `reencrypt` remains simpler when the existing directory layout is already suitable. |
| OS keychain | Run the importer under the destination user and explicit service namespace, through the writable adapter. Qualify partial installation and existing-entry handling. |
| Obsidian SecretStorage | Reuse the import utility inside Obsidian through the official API; a standalone Node CLI cannot write its internal storage. |
| systemd credentials | The runtime reader is read-only and is not an import target. A separate deployment provisioning operation would prepare service credentials; this is outside the first writable-store importer. |

### Sequencing and tests

Place this utility after the basic age backend and management CLI. Initially qualify transfer between age stores; add a writable target only when its adapter and runtime integration are available. Keep the two-method core, file format, and initial CLI usable without the pack feature.

Test selected-name export, source failure producing no completed pack, multi-recipient transport, wrong identities, authenticated malformed input, duplicate names, unsupported schema versions, limits, conflicting destination names, and zero writes after preflight rejection. Inject failures before and after individual commits to verify truthful partial-result reporting. Include a fresh-target end-to-end provisioning scenario, output redaction, and the separation of transport keys from backend keys. A fake store establishes orchestration only; each real destination owns its platform-specific import evidence.

## Migration and compatibility

The feature is additive. Keep existing encryption formats, settings, versions, and APIs intact. Applications decide whether to support literal values, references, or both; the store never treats an arbitrary string as a reference automatically.

A consumer migration should write the secret, verify its readable value without logging it, and only then persist the reference. Keep the old setting recoverable until that application's configuration update succeeds. Name collisions, legacy naming, rollback, backups containing old secrets, and removing the old plaintext belong to the consumer's migration policy. Keep application settings migration separate from the focused named-entry pack utility; do not introduce a universal settings migration engine here.

Use injected readers to test reference parsing, absent references, provider failure, and configuration persistence in consumers. Kit owns storage contracts and platform integration. The [proven-in-use evidence](../proven-in-use.md#secretstore-package-owned-evidence) records the core and adapters' package-owned checks and distinguishes reviewed real-host evidence from a minimum-version probe. Add maintained consumer evidence only after a consumer actually adopts the relevant boundary.

## Verification strategy

| Boundary | Required evidence |
| --- | --- |
| Neutral contracts | Compile-time fixture accepts a reader-only object and rejects it where a store is required. Shared behavioural cases cover missing versus empty, exact string preservation, JSON `null` versus absence, object snapshots, serializer pair semantics, invalid names/values, replacement, instance isolation, and sanitised failures. |
| Dependency isolation | Install packed tarballs outside workspace resolution; compile documented imports. Bundle the neutral entry for a browser and inspect for Node, Obsidian, crypto, and native modules. Test focused adapter imports separately. |
| Obsidian adapter | Injected sync get/set, missing API, host throws containing sentinel secrets, and zero platform calls on invalid input. Real isolated-profile checks for minimum/current qualified API versions, values, persistence across restart, and device-specific behaviour where support is claimed. |
| age codec | Multi-recipient decryption, wrong identity, tampering, truncation, invalid text, and size limits. Bidirectional fixtures against pinned `age` and `rage` versions, recorded in the [feasibility report](secret-store-age-feasibility.md). Round-tripping only through typage is insufficient interoperability evidence. |
| age files | Real local filesystem fixtures for permissions, links, traversal, reserved names, missing root versus missing entry, atomic replacement, competing writers, interrupted writes, cleanup, and failures before and after rename. Inject failures at I/O boundaries; assert the final entry, not only the error. |
| Key acquisition | Missing entry performs no identity request; existing entry calls the provider once; writes and listing do not request identities. Provider failures are sanitised. No module-global retention or implicit fallback. |
| CLI | PTY tests for concealed input and terminal restoration; pipe tests for exact bytes, reveal gating, exit categories, cancellation, and stdout/stderr separation. Assert that secret sentinels are absent from errors, traces, and process arguments. Test identity-source conflicts, missing environment variables, exclusive key generation, and no implicit fallback. |
| Migration and deployment | New-device recipient round trip; no modification of the source; complete name inventory; target verification with required names; failure and interruption during staging/publication; existing-output rejection; recovery identity; and deployment checks as the service user. Distinguish ciphertext transfer integrity, decryption, and application authentication. |
| Native store | Per-platform tests with disposable service namespaces and cleanup, real unavailable/locked/denied behaviour where reproducible, native installation, persistence, and evidence of no fallback. |
| systemd | File-boundary tests plus a real transient unit using both plain and encrypted provisioning. Record the systemd version and distinguish skipped integration from a passing test. |

No benchmark is needed for the initial core. Deterministic operation counts should detect accidental whole-store scans, value reads during listing, or repeated key acquisition. Benchmark file count or startup costs only if a concrete usage pattern identifies a remaining performance question.

For implementation, run focused package checks while iterating, then the complete `verify:workspace` gate for package and dependency changes, including packed-consumer verification. Real Obsidian UI checks apply if later work introduces visible UI; this API adapter alone does not justify repeating every consumer UI suite. Before claiming mobile or another native platform, record real evidence for that specific boundary.

The core and Obsidian adapter have shared behavioural cases, compile-time fixtures, and isolated packed-consumer checks. The dedicated Obsidian scenario establishes the platform behaviour described above. The [age feasibility checks](secret-store-age-feasibility.md) now reuse the production codec, while the Node package owns real filesystem and injected failure tests. Native tools also exchange entries through the public file-store API. These checks do not establish native credential-store, deployment, hardware power-loss, or cryptographic audit guarantees. Keep Markdown links, the diff, and the ADR consistent with the implemented scope.

## Implementation plan

| Phase | Deliverables | Completion evidence and remaining decision |
| --- | --- | --- |
| 1: Neutral core | Add `secret-store`, two interfaces, name/value validation, fixed-code errors, and a memory store. Add TSDoc, package README, compile-time and behavioural tests. Wire workspace and packed-consumer checks. | Accepted and implemented with the portable name profile and exact Unicode value policy. Package tests, public type fixtures, and packed-consumer checks cover the core. No runtime dependency, backend selection, URI helper, optional management capability, or platform implementation enters this phase. |
| 2: Obsidian | Add a focused adapter and export, neutral dependency, injected tests, and feature-specific compatibility documentation. | Implemented with injected host tests, packed-consumer checks, and isolated-profile value and restart verification on reviewed 1.13.6. The 1.11.4 minimum was exercised as an unverified regression probe. Common names are limited to 64 characters; existing package minimums are preserved. Mobile and other desktop platforms remain unqualified for this adapter. |
| 3a: age feasibility | Pin and review typage and transitive requirements; keep the codec and file operations separate; prove bidirectional interoperability. | Completed initially in a private test seam, now reusing the production internal codec: exact values, error classification, size limits, per-call identities, and bidirectional age 1.3.2/rage 0.12.1 checks. The [report](secret-store-age-feasibility.md) records the runtime matrix and metadata/layout implications. Filesystem authority and persistence are covered separately by Phase 3b. |
| 3b: age reader and writer | Implement explicit-root factories, bounded safe reads, injected identities, recipient-only writes, permissions, and atomic replacement. | Implemented with real Linux arm64 ext4 fixtures, injected failure and concurrency tests, process termination before/after rename, installed-tarball checks, and public file-store/native-tool interoperability. Windows returns unavailable; macOS, network mounts, and hardware power loss remain unqualified. No recovery journal or automatic key provisioning. |
| 3c: Local value backends | Add instance-owned memory storage, injected Web Storage, Node JSON-file storage, direct official Obsidian storage, and explicit legacy selection. | The initial synchronous JSON-value API passed shared cases, real Chromium restart, Node 20/22/24 filesystem tests, installed-tarball checks, and reviewed Obsidian 1.13.6 E2E. Phase 3d revises its public API and stored value boundary; its verification is recorded in the next row. No consumer migration is included. |
| 3d: Value and object API with injected serialisation | Use asynchronous `getValue`/`setValue` and `getObject`/`setObject`, raw string backends, paired serializer DI, and a tested consumer-owned OW HKDF example across memory, Web Storage, Obsidian, and Node adapters. | Accepted in [ADR 0002](../adr/0002-value-store-serialisation.md); workspace contracts, failure tests, public declarations, packed-consumer checks, browser persistence, Node 20/22/24 tests, and all twelve reviewed Obsidian 1.13.6 scenarios have passed. Memory covers application-owned temporary state; no separate session service, CLI, key provisioning, or new OS adapter is included. |
| 4a: Management and provisioning | Add the separate CLI, explicit init/input/reveal paths, optional delete/list capabilities, recipient-policy inspection, explicit identity generation, file/environment identity sources, re-encryption into a new store, and non-revealing verification. | Review the proposed operational extension before implementation. PTY, pipe, failure, permission, headless, device-migration, and service-user deployment tests must qualify completion and publication. In-place recipient mutation and automatic activation remain deferred. |
| 4b: Encrypted provisioning packs | Add explicit selected-entry pack creation, whole-pack validation, writable-store import, and value-free verification/reporting after the basic CLI. | Review the transfer schema, finite limits, existing-entry policy, and partial-failure semantics. Initially qualify age targets; add native or Obsidian targets when their adapters are ready. No universal batch transaction or automatic rollback. |
| 5: Additional adapters | Add systemd or native keychain only for demonstrated consumer needs; qualify each independently. | Native dependency choice, persistence, platform matrix, and error limits must be evidenced. Other secret managers remain future adapters, not speculative interfaces. |

When a package is introduced, update root script ordering, lockfile, package exports, packed-consumer fixtures, the publishable-package map in `scripts/validate-release-selection.mjs`, `scripts/prepare-release.mjs` dependency handling, relevant release-tool tests, workflow choices, architecture, and release documentation. Do not treat current UI-only dependency rules as sufficient for a new shared contract. Review `scripts/assert-bootstrap-publish.mjs` and the publishing workflow for their explicit selections as well. No release version or publication is selected by this design.

Phases 1 through 3d have verified implementations. Phase 3a established codec feasibility, Phase 3b added the explicit-root age reader and writer, and Phase 3c added ordinary local-value storage. Phase 3d aligns the public value/object API and serialisation boundary across the existing backends before the CLI. Phase 4a and 4b split the original management phase into basic management/provisioning and later encrypted transfer packs. Phase 5 retains independently qualified additional backends. The later phases remain a roadmap with explicit design and evidence gates; acceptance of the common contracts does not settle every backend or management command.

## Sources

The following primary sources were inspected on 2026-10-18. Registry versions and repository revisions identify the evaluated dependency candidates; implementation must recheck them when selecting a lockfile. These are source and documentation findings, not Fancy Kit runtime validation.

- [Obsidian API](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts), compared with the workspace's locked `obsidian@1.14.4` declarations, and the official [Store secrets guide](https://docs.obsidian.md/plugins/guides/secret-storage): API availability, signatures, naming, and host ownership.
- [typage 0.3.1 source](https://github.com/FiloSottile/typage/tree/38b8b10cb22409de0eaa8a617a01f16dc2e3f9f4) and [published metadata](https://registry.npmjs.org/age-encryption/0.3.1): format implementation, recipient/identity APIs, module requirements, dependencies, and untyped decryption failures.
- [`@napi-rs/keyring` 2.1.1 source](https://github.com/Brooooooklyn/keyring-node/tree/97aa4e0412a0ba8a0d47541cebe0474eea5efe02) and [published metadata](https://registry.npmjs.org/@napi-rs%2fkeyring/2.1.1): explicit Linux store selection, native packages, missing-entry conversion, and Windows target-construction side effects.
- [`just-secrets` 0.0.2 source](https://github.com/vercel-labs/just-secrets/tree/31719436bccf5ecfee621391e94c771b7484c0cf) and [published metadata](https://registry.npmjs.org/just-secrets/0.0.2): subprocess bridges, runtime requirements, and representation limits.
- [age manual](https://github.com/FiloSottile/age/blob/main/doc/age.1.ronn): recipient and identity roles, multi-recipient access, and standard identity-file input.
- [systemd.exec credentials](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Credentials): provisioning, plaintext presentation to services, directory ownership, and `CREDENTIALS_DIRECTORY`.
- [Node filesystem API](https://nodejs.org/api/fs.html): open flags, file descriptor operations, permissions, and platform-specific constraints. Tests, rather than this API reference alone, must establish the promised replacement and durability semantics.
