---
date: 2026-10-19
value-store-version: "0.0.0"
secret-store-version: "0.0.0"
secret-store-node-version: "0.0.0"
status: unreleased
---

# SecretStore and platform adapters

## Publication note

The front matter records the reviewed development-version baseline from 2026-10-19. ValueStore 0.1.0 is published. The selected release versions are SecretStore 0.1.0 and Obsidian plug-in Kit 0.1.5; the Node adapter remains unreleased at 0.0.0. Registry availability is verified separately through the [release process](../releasing.md), with current versions listed on [npm for SecretStore](https://www.npmjs.com/package/@vrtmrz/secret-store) and [npm for the Kit](https://www.npmjs.com/package/@vrtmrz/obsidian-plugin-kit). These package releases do not establish adoption in a published consumer.

## Purpose and baseline

`@vrtmrz/value-store` defines neutral asynchronous string and JSON value
operations. `@vrtmrz/secret-store` adds a portable named-secret profile over
those shared operations. Neither package selects persistence or encryption. An
application constructs the adapter it needs at its composition root and passes
the narrow reader or writer capability to each workflow.

This document records the implemented package boundaries and contracts reviewed
at development version `0.0.0`, then marks management tools and additional
adapters as proposals. Later release selections are recorded above. The current
Commonlib and Self-hosted LiveSync integration uses ValueStore for device-local
data; its use of SecretStore remains prospective. Fancy Kit has no maintained
SecretStore consumer integration.

The accepted boundaries are recorded in [ADR 0001](../adr/0001-secret-store-boundaries.md),
[ADR 0002](../adr/0002-value-store-serialisation.md), and the superseding shared
capability decision in [ADR 0003](../adr/0003-value-store-capabilities.md).
Package-owned checks and the current consumer boundary are summarised in
[Proven in use](../proven-in-use.md).

## Package boundaries

The neutral value package owns shared operation types, validation, serialisation,
and fixed errors. Its `./web-storage` and `./node-json-file` entries provide
explicit storage adapters; Node built-ins stay out of the neutral entry.
SecretStore depends on ValueStore for those shared operations and adds portable
secret names and instance-scoped memory storage.

```text
Application composition
  ├─ ValueReader / ValueStore ──> @vrtmrz/value-store
  └─ SecretReader / SecretStore ─> @vrtmrz/secret-store
                                      └─> @vrtmrz/value-store

@vrtmrz/obsidian-plugin-kit/local-storage ──> @vrtmrz/value-store
@vrtmrz/obsidian-plugin-kit/secrets ────────> @vrtmrz/secret-store
@vrtmrz/secret-store-node/age ──────────────> @vrtmrz/secret-store
                                              @vrtmrz/value-store, age-encryption,
                                              and Node filesystem APIs
```

Arrows show package dependencies. The Obsidian local-storage entry consumes
ValueStore. Its separate secrets entry adapts the official SecretStorage API.
The Node age entry uses SecretStore for named operations and ValueStore for its
shared error type. Applications own backend construction and identity-provider
composition. Root workspace discovery does not imply that build, test, packed
consumer, or release scripts discover every new package; a future package must
also be added to those explicit selections.

| Boundary | Current responsibility |
| --- | --- |
| `@vrtmrz/value-store` | Neutral string and JSON value contracts, shared errors, and explicit Web Storage and Node JSON-file adapters. |
| `@vrtmrz/secret-store` | `SecretReader`, `SecretStore`, portable-name validation, and instance-scoped memory storage. |
| `@vrtmrz/obsidian-plugin-kit/local-storage` | Obsidian composition for ValueStore. |
| `@vrtmrz/obsidian-plugin-kit/secrets` | Injected adapter for Obsidian SecretStorage, without an Obsidian runtime import in the adapter. |
| `@vrtmrz/secret-store-node/age` | Explicit-root age-file reader and writer, with Node filesystem authority checks. |

The secret and value packages use ESM, declarations, explicit export maps, and
the repository's package conventions. Do not add an umbrella import that loads
platform adapters or chooses a backend dynamically. The Node age codec remains
internal. A future browser persistence adapter would require an explicit storage
capability and its own authority and atomicity contract.

## SecretStore contract

`SecretReader` exposes the shared string and object read operations under the
portable secret-name profile. `SecretStore` adds the corresponding write
operations. The current secret profile exports no delete or list operation.
`SecretDeleter` and `SecretLister` remain future structural capabilities.
Deletion must be separate from setting an empty string. Listing must return
names only, document its namespace, and avoid reading every secret; a list is
not a transactional snapshot.

The separate secret profile exists to give secret adapters portable names and a
well-formed text boundary across host adapters. Ordinary ValueStore consumers
retain generic JavaScript string behaviour and do not take on secret naming or
secret-adapter dependencies. The shared ValueStore operations, defaults,
serialiser, adapters, and explicit deletion capability are defined in the
[ValueStore design](key-value-and-local-storage.md).

SecretStore preserves exact well-formed Unicode text, including empty strings,
line endings, whitespace, NUL, and a leading BOM. It does not trim, normalise,
interpolate, or treat a falsy string as absence. Reject unpaired UTF-16
surrogates as `invalid-value` at the secret-profile boundary so its text remains
portable across adapters. Backend-specific size limits are documented by each
adapter; the neutral profile does not set a universal maximum.

## Secret names and errors

A portable secret name contains 1–64 ASCII characters matching
`[a-z0-9]+(?:-[a-z0-9]+)*`. Validate the whole name. Reject uppercase letters,
slashes, backslashes, dots, percent escapes, colons, whitespace, and leading,
trailing, or repeated dashes. URI parsing and URL decoding are outside this
boundary.

The profile fits Obsidian's lowercase alphanumeric and dash convention. Reviewed
real-host checks on Obsidian 1.13.6 established a 64-character maximum; the
unreviewed 1.11.4 probe observed the same limit, but does not establish supported
version status. Application prefixes are ordinary names, not authorisation.
The selected store root, native service identifier, or host permissions define
isolation. Do not add an undisclosed global namespace or silently rename entries.

The age adapter maps a name to `secret-<name>.age`. The fixed prefix avoids
Windows device-name collisions, and lowercase names avoid case-insensitive
filesystem collisions. This is a file-layout rule, not path interpretation in
the neutral API.

`ValueStoreError` exposes a fixed code and fixed message. Errors do not retain
raw causes, upstream messages, values, identity strings, or caller paths.
Use the most specific category supported by reliable evidence:

| Code | Evidence |
| --- | --- |
| `invalid-name` | The name fails the portable profile. |
| `invalid-value` | A value is unrepresentable or exceeds a documented backend limit. |
| `unavailable` | A required API, configured root, service, or identity source is absent or unavailable. |
| `access-denied` | A reliable platform status establishes denied access. |
| `decryption-failed` | Encrypted input cannot be authenticated or decrypted with supplied identities. |
| `invalid-data` | A format, encoding, or storage-layout violation is positively identified. |
| `operation-failed` | A failure cannot be classified reliably, including an uncertain write outcome. |

Do not parse arbitrary human-readable errors to manufacture precision. A missing
entry is a successful absence result; a configured root that has disappeared
is not an empty store. Permission errors remain failures during absence checks.
The age implementation maps its upstream decryption failures conservatively
because the dependency does not provide a stable typed taxonomy.

Read-only consumers should receive `SecretReader`, while actual read-only
enforcement remains a process or backend permission.

## Implemented adapters and ownership

### Memory

`MemorySecretStore` owns a private map per instance and starts empty. It uses the
same names, values, errors, and serialiser rules as persistent adapters. It has
no persistence, shared map, logger, implicit initial-value alias, or enumeration.
Use it for tests or deliberately ephemeral state.

### Obsidian SecretStorage

The `@vrtmrz/obsidian-plugin-kit/secrets` entry accepts an injected structural
subset of Obsidian SecretStorage and exposes asynchronous neutral operations over
the host's synchronous get and set methods. Its factory constructs no `App` and
does not import an Obsidian runtime module or inspect internal storage.

The official API is available from Obsidian 1.11.4. The plugin kit's existing
minimum remains Obsidian `>=1.8.7`; consumers use this focused entry only after
feature detection or after setting their own higher minimum. Do not raise the
package-wide minimum or make root imports access `app.secretStorage`.
Obsidian controls persistence and access; the adapter does not claim OS keychain,
cross-device synchronisation, plugin isolation, or cross-Vault isolation.
The API has no delete operation, and the adapter does not expose listing.

Reviewed Linux arm64 tests on Obsidian 1.13.6 cover exact values, replacement,
and persistence through restart. The separate 1.11.4 probe is not reviewed
supported-version evidence. Other desktop platforms and mobile remain
unqualified. Since the API has no delete method, real-host tests use unique
synthetic names in an isolated profile and discard that profile during cleanup.
No secret-entry UI or application migration is part of this adapter.

### age files

#### Dependency and identity boundary

The Node adapter pins `age-encryption` 0.3.1. Its locked runtime dependency
requirements establish Node.js `>=20.19.0`; the codec is internal, uses standard
binary age, and accepts native X25519 recipient and identity strings. Multiple
recipients may decrypt the same ciphertext. Passphrase, SSH, plugin, hardware,
and post-quantum identity modes are deferred.

`createAgeFileSecretReader` and `createAgeFileSecretStore` bind an explicit,
existing root. Construction validates the configured root but does not create
directories, change permissions, or acquire identities. A writer receives a
non-empty recipient list copied at construction. It encrypts with recipients and
does not request a decryption identity.

The age adapter injects an `AgeIdentityProvider`. A read first validates and
reads an existing entry within the ciphertext limit, then requests identities
once for that operation. Absence does not acquire identities. The adapter does
not cache identities, generate them, load them implicitly, or retain them
between operations. An empty identity result is `unavailable`; provider errors
are sanitised. Headless consumers supply a non-interactive provider explicitly.

#### File format and resource limits

The layout is one file per secret:

```text
<caller-selected-root>/
    secret-<name>.age
```

Each file contains one standard binary age ciphertext. Its plaintext is the
UTF-8 encoding of the string delivered to the backend; object operations deliver
JSON text, and an injected serialiser may transform that string. There is no
application envelope or filename in the ciphertext. Decode authenticated bytes
with strict UTF-8 while preserving a leading BOM. Reject malformed UTF-8 and
unpaired surrogates. Do not return plaintext before the complete ciphertext has
authenticated.

The backend enforces a 64 KiB plaintext limit and a 1 MiB ciphertext limit per
entry. It bounds file reads before decryption. These are age-backend resource
limits, not limits on the neutral ValueStore or native adapters.

#### Filesystem authority and write outcomes

The root is caller-selected and must already exist. The adapter rejects symlink
components, non-regular entries, unexpected hard links, and roots or ancestors
which do not meet the implemented POSIX ownership and permission checks.
Authorities are rechecked during operations; lexical containment or `realpath`
alone would not protect against parent replacement. The implementation does not
claim to defeat a trusted owner racing path replacement.

The root must belong to the effective user and have no group/other access
or special bits. Readers require owner read/search permissions (`0500`); writers
also require owner write permission (`0700`). Ancestors must belong to root or
the effective user. Group/other-writable ancestors require the sticky bit, and
each child must retain trusted ownership. The implementation retains device and
inode identities in memory and rechecks the full ancestry during operations.
Every component rejects symlinks. Entries must be private, owner-readable regular
files with one link. More permissive paths are rejected, not repaired.

A write encrypts in memory, creates a random exclusive mode-0600 temporary
ciphertext file inside the root, writes and synchronises it, closes it, atomically
renames it over the entry, and synchronises the directory where supported. The
adapter removes only the temporary inode owned by that operation. Concurrent
writers use last-writer-wins replacement. Before rename, failure leaves the old
entry intact; after replacement begins, a rejection has an uncertain outcome.
There is no lock, compare-and-swap, retry, backup, journal, transaction, or
automatic stale-file recovery. A crash can leave a ciphertext temporary file.

The adapter returns `unavailable` on Windows rather than substituting POSIX mode
checks for ACL enforcement. Linux arm64 ext4 is the qualified local filesystem.
macOS, network filesystems, hostile-owner races, and hardware power-loss
durability remain unqualified. `sync()` requests synchronisation; it does not
prove hardware power-loss behaviour. Deployments must select a qualified local
filesystem and provision ownership and permissions for the runtime user.

#### Security properties and limits

Recipients configure future writes; changing a recipient list does not re-encrypt
existing files or revoke access to retained ciphertext. The age format provides
confidentiality and ciphertext authentication. It does not bind ciphertext to a
filename, identify its writer, establish freshness, or prevent replay or swapping
of valid files. A holder of a public recipient can also create ciphertext.
Directory authority and trusted provisioning remain necessary. These tests are
targeted integration evidence, not a cryptographic audit.

The optional `recipients.txt` file is management configuration for a future CLI,
not reader state. The adapter never discovers it. Identities remain application
supplied and stored elsewhere.

## Proposed adapters and management tools

The following work is not implemented. Each adapter or tool requires its own
runtime evidence and must preserve the neutral package boundary.

### Native keychain

A separate optional package may wrap a native credential store if a consumer
requires it. The inspected `@napi-rs/keyring` 2.1.1 candidate has native bindings;
on Linux, configuration must select Secret Service explicitly and disable
kernel-keyutils fallback. Prefer its `AsyncEntry` get/set operations. Do not use
`withTarget`: inspected Windows target construction can write a placeholder
credential, which is unsuitable for a read. Confirm constructor side effects and
platform namespace mapping in native tests.

`just-secrets` 0.0.2 is an inspected subprocess alternative, with different
runtime and value-limit trade-offs. Neither candidate is an accepted dependency
or a cross-platform guarantee. Any adapter needs an explicit application service
identifier and validated account mapping. Only a reliably identified missing
entry may become absence; sanitise other errors and never fall back to another
store. Qualify empty and Unicode values, read side effects, locked and denied
stores, persistence, namespace isolation, supported native binaries, and Linux
session-bus requirements. Keep native bindings out of neutral, browser, Obsidian,
and ordinary file-reader dependency paths. Mocked tests and package availability
do not establish native store access.

### systemd credentials

The Node package groups file-based adapters. A systemd reader, if added,
should be a subpath which does not evaluate the age codec; installing the shared
package still installs its declared age dependency.

A future Node adapter may read one systemd credential from an explicitly
supplied credentials directory, normally obtained from
`CREDENTIALS_DIRECTORY`. It would open the exact validated secret name, without
the age-file `.age` suffix, and perform bounded reads with regular-file and link
checks. Decode UTF-8 strictly, preserving a trailing newline; reject invalid text
as `invalid-data`.

The adapter would be read-only. It must not inspect environment state during
module import, search fallback directories, change permissions, or copy secrets
into settings. systemd decrypts `LoadCredentialEncrypted=` input before the
service reads its credential file. Unit configuration remains deployment-owned,
and a real transient-unit test is required for service provisioning evidence.
This adapter is not a writable import target.

### Management CLI

The provisional `fancy-sec` CLI is a separate proposed management tool. It would
manage an explicitly selected age root and would not be a runtime dependency of
application reads. The first command set is:

| Command | Proposed responsibility |
| --- | --- |
| `init` | Create a new restricted root and explicit public recipient policy; reject a conflicting existing layout and create no identity. |
| `set` | Read concealed TTY input; cancellation performs no write. Never accept a secret value as a positional argument. |
| `set --stdin` | Read bounded stdin exactly, including terminal newlines; reject mixed input modes. |
| `get --reveal` | Write exact plaintext to stdout without an added newline. Without the flag, reject usage before reading. |
| `list` and `delete` | List names without acquiring identities or decrypting values; delete only with a separate capability and explicit TTY or non-interactive confirmation. |
| `recipients list` | Inspect public recipient policy. In-place recipient changes remain deferred. |
| `identity generate` and `identity recipient` | Generate a private identity into a new restricted file outside the store with exclusive creation, refusing overwrite, or derive its public recipient without printing identity material. |
| `reencrypt` | Prepare a separate store for an explicit recipient set while leaving the source unchanged. |
| `verify` | Authenticate every managed entry and check required names without revealing values. |

Identity input would remain behind `AgeIdentityProvider`. A command requiring
identities must select exactly one explicit source and reject missing or
conflicting sources before reading any of them. File input would use bounded
parsing, link and permission checks, documented X25519 identity lines and
comments, and sanitised failures. A named environment variable may hold an
identity-file path, which receives the same checks, or explicitly injected
identity text. Pass the variable name, never its private value, in command
arguments.

Do not auto-discover identities or silently fall back to another source.
Environment variables do not securely erase values or prevent child-process
inheritance; a credential file is preferable where supported.

Concealed input must restore terminal state after cancellation, signals, and
errors. Non-interactive use requires an explicit input mode. Diagnostics and
stable exit categories must distinguish absence, invalid input, and operational
failure without printing values or raw exceptions. A failed mutation can have an
uncertain outcome. Ordinary age library operations need no shell subprocess.

### Device migration and server deployment

These are proposed workflows for the future CLI, not current SecretStore
operations. Device replacement may either provision an existing identity through
a separately trusted channel or create a destination identity and re-encrypt to
its public recipient. Use a distinct identity when devices need independent
provisioning. An independently held recovery identity must be included in the
recipient policy at creation if recovery from device loss is required. Every
recipient is a full decryption authority; losing all working recipient identities
makes the existing ciphertext unavailable to this workflow.

Re-encryption requires a stable source snapshot or externally paused writers.
Capture the complete selected name set and fail if any selected entry cannot be
read or written. Stage ciphertext in an owned directory below an exclusively
controlled destination parent, reject an existing destination, and verify the
complete staged file set before publication. Publish only through a qualified
same-filesystem directory operation; reject unsupported behaviour rather than
copying partial output into the destination. Keep the source unchanged.

On ordinary failure, clean only staging files owned by the command. A killed
process may leave ciphertext staging files. Errors after publication have an
uncertain outcome and must not trigger deployment automatically. There is no
universal transaction, recovery journal, resumable mutation, plaintext bundle,
automatic activation, or rollback. Restart with a fresh output from the
unchanged source snapshot.

`verify` checks decryption, invalid data, and explicitly required names, but
checking only discovered files cannot detect an omitted source entry. Deployment
tooling must also compare the complete expected name inventory and transfer
integrity. Existing transfer and deployment tools own transport, service-user
ownership, activation, and release rollback.

On a server, application releases, ciphertext artefacts, and identity provisioning
are separate inputs. Provision the identity through the deployment secret
facility or on the server, keep it out of images and repositories, and provide it
to the runtime through an explicitly selected file, environment, or service
credential source. Verify the expected names with the runtime identity and
permissions before activation. Decryption does not prove that a credential is
still valid with its issuing service; application-owned connection checks remain
separate. Rotate issued credentials when exposure requires it.

### Later utility: encrypted packs for bulk provisioning

A later utility may export caller-selected names and values from a reader,
then import them into a caller-selected writable store. Selection and
authorisation belong to the caller: a selected value can itself contain key
material, so the utility cannot infer safe entries from their contents. The
utility remains outside the neutral core and does not require `SecretLister`. Its
transport recipient policy is independent of the source and destination backend
keys. Keep transport identities separate from backend identities.

The proposed format is one versioned UTF-8 JSON document encrypted as a standard
age file. Encrypt names and values. Do not include archive paths, executable
hooks, or a destination selector. Do not automatically include source-backend
or transport identities, authentication caches, or host configuration.
Authenticate the complete ciphertext before parsing or writing. Validate the
version, shape, names, duplicate names, count, and finite per-entry and total
size limits before the first target write. Use bounded memory and ciphertext-only
temporary files. Never emit plaintext pack contents.

Age decryption establishes ciphertext authentication, not sender identity or
authorisation. An interactive import should show a value-free name plan;
automated deployments must supply an expected-name selection from an independently
trusted source.

Import checks destination capabilities, limits, and existing names before
writing. Existing entries are rejected by default. Since the core has no
conditional write, require an exclusively controlled destination or externally
paused writers. Write entries sequentially and stop on the first failure. Report
completed, failed or uncertain, and unattempted names with sanitised status codes.
Do not promise atomic installation, automatic rollback, or a durable recovery
journal; interruption can leave partial installation.

A fresh isolated destination can be prepared, verified, and activated through the
existing deployment mechanism. An age store is the first proposed target.
Obsidian import must run inside an Obsidian-owned integration through its official
API. A read-only systemd credential adapter is not an import target. Each
writable native backend owns its partial-installation evidence.

## Compatibility and validation

The packages are additive. They do not change existing encryption formats,
settings schemas, synchronisation behaviour, or application configuration.
Applications choose whether to accept literal values, references, or both; the
store never interprets arbitrary strings as references.

A consumer migration is consumer-owned: write the secret, verify its readable
value without logging it, then persist the reference. Keep the old setting
recoverable until that application's configuration update succeeds. Naming,
rollback, backups, and removal of legacy plaintext follow the application's
migration policy. Do not introduce a universal settings migration engine.

Kit owns neutral contracts and adapter behaviour. Consumers own reference
parsing, configuration persistence, and workflow composition. Current
Commonlib/LiveSync tests exercise ValueStore use only; they are not SecretStore
adoption evidence. Package-owned, consumer-owned, and real-host evidence are
separated in [Proven in use](../proven-in-use.md#secretstore-package-owned-evidence)
and [its ValueStore section](../proven-in-use.md#valuestore-package-and-consumer-evidence).

The implemented contract evidence covers absent versus empty values, stored JSON
`null`, defaults and snapshots, paired serialisers, sanitised failures, package
isolation, and adapter failure paths. Real Obsidian evidence is limited to the
reviewed host and platform described above. The age adapter evidence is limited
to Linux arm64 on ext4 and the exact Node matrix in the
[feasibility report](secret-store-age-feasibility.md). Native stores, systemd
units, CLI interaction, migration, encrypted-pack import, other filesystems,
and further host platforms remain proposals requiring their own validation.

## Sources

The following primary sources were inspected on 2026-10-18. Their dependency
versions and revisions identify the evaluated candidates; a later implementation
must recheck them when selecting its lockfile. These source findings are not
Fancy Kit runtime validation.

- [Obsidian API declarations](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) and the official [Secret Storage guide](https://docs.obsidian.md/plugins/guides/secret-storage): API signatures, availability, and host ownership.
- [typage 0.3.1 source](https://github.com/FiloSottile/typage/tree/38b8b10cb22409de0eaa8a617a01f16dc2e3f9f4) and [published metadata](https://registry.npmjs.org/age-encryption/0.3.1): codec API, licence, dependencies, and error boundaries.
- [`@napi-rs/keyring` 2.1.1 source](https://github.com/Brooooooklyn/keyring-node/tree/97aa4e0412a0ba8a0d47541cebe0474eea5efe02) and [published metadata](https://registry.npmjs.org/@napi-rs%2fkeyring/2.1.1): native packages, Linux store selection, and inspected side effects.
- [`just-secrets` 0.0.2 source](https://github.com/vercel-labs/just-secrets/tree/31719436bccf5ecfee621391e94c771b7484c0cf) and [published metadata](https://registry.npmjs.org/just-secrets/0.0.2): subprocess bridge, runtime requirement, and value limits.
- The [age manual](https://github.com/FiloSottile/age/blob/main/doc/age.1.ronn): recipient and identity roles, multi-recipient access, and identity-file format.
- [systemd credentials](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Credentials): service provisioning and `CREDENTIALS_DIRECTORY`.
- The [Node.js filesystem API](https://nodejs.org/api/fs.html): file descriptors, permissions, and platform-specific constraints. Tests establish replacement and durability behaviour; the API reference alone does not.
