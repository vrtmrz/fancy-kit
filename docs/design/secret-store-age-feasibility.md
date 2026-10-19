---
date: 2026-10-19
value-store-version: "0.0.0"
secret-store-version: "0.0.0"
secret-store-node-version: "0.0.0"
status: unreleased
---

# age file adapter feasibility

## Purpose and baseline

This report records the runtime, format, identity, and filesystem evidence for
the explicit-root age adapter in `@vrtmrz/secret-store-node`. Its public `./age`
entry creates readers and read/write stores. The byte codec is an internal
module, not a package export. The private feasibility facade at
[`test/secret-store-age/codec.mjs`](../../test/secret-store-age/codec.mjs)
imports the built internal codec, so package and feasibility checks exercise the
same implementation.

The package remains unreleased at version `0.0.0` and targets Node.js
`>=20.19.0`. It depends on the unreleased `@vrtmrz/value-store` and
`@vrtmrz/secret-store` packages at version `0.0.0`, plus `age-encryption`
`0.3.1`. No maintained consumer uses the Node age adapter yet. This is
package-owned evidence, not consumer adoption or deployment qualification.

The broader package boundaries are in the [SecretStore design](secret-store.md),
and current package evidence is summarised in
[Proven in use](../proven-in-use.md#secretstore-package-owned-evidence).

## Runtime dependencies

The lockfile records exact package versions and integrity digests. The selected
age dependency graph has no install lifecycle scripts, native npm add-ons, or
external executable in the runtime codec path.

| Dependency | Resolved version | Licence | Runtime requirement |
| --- | --- | --- | --- |
| `age-encryption` | 0.3.1 | BSD-3-Clause | ESM; upstream documents ES2023 and Node.js 20+. No `engines` field. |
| `@noble/ciphers` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/curves` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/hashes` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/post-quantum` | 0.5.4 | MIT | Node.js >=20.19.0; brings nested curves and hashes 2.0.1. |
| `@scure/base` | 2.4.0 | MIT | No `engines` field. |

The age entry statically imports the post-quantum dependency even though this
adapter accepts only native X25519 identity forms. Restricting accepted key
forms does not remove that dependency or its review burden. The root workspace
also keeps `age-encryption` as a development dependency for the private native
interoperability checks. The `age` and `rage` executables are test tools only.

## Recorded validation evidence

| Evidence set | Recorded result | Limit |
| --- | --- | --- |
| Current age filesystem suite | 58 tests on Linux arm64 ext4 with Node.js 20.19.0, 22.23.3, and 24.18.0. | Package-owned filesystem and injected-failure coverage. |
| Current codec suite | 17 codec tests against the production internal codec. | Targeted codec and error-boundary checks, not a cryptographic audit. |
| Current native interoperability suite | 22 pinned age/rage checks, including public file-store round trips, on Node.js 24.18.0. | Pinned tools and synthetic identities; no consumer deployment. |
| Earlier Phase 3b snapshot | 54 filesystem tests, 17 codec tests, and 22 native interoperability tests on Linux arm64 ext4. | Earlier file-store implementation before the later ValueStore facade checks. |
| Historical Phase 3a prototype | 37 combined codec and interoperability checks using a private codec prototype. | Codec interoperability only; it did not test the production filesystem adapter. |

The current file suite covers real permissions and links, bounded reads, atomic
replacement, concurrent writers, injected I/O failures, and process termination
before and after rename. The current native suite exchanges actual file-store
entries with the pinned tools. The current package and packed-consumer results
are recorded in [Proven in use](../proven-in-use.md); a packed consumer verifies
the focused public entry and Node-only declarations.

The historical Phase 3a checks ran on Linux arm64 with Node.js 20.19.0,
22.23.3, and 24.18.0. The later filesystem suite also passed on those Node
versions, while the latest recorded native interoperability run used Node.js
24.18.0. Node.js 20.19.0 was a dependency-floor probe, not a new workspace
support promise; repository CI uses Node.js 24.

## Value and authentication boundaries

Each ciphertext contains the UTF-8 encoding of the string delivered to the
backend. Object operations deliver JSON text, and an explicitly injected
serialiser may transform that string before encryption. There is no JSON
envelope, custom header, or filename in the ciphertext.

The codec decrypts to bytes and decodes with strict UTF-8 while preserving a
leading BOM. Upstream text mode removes that BOM and replaces malformed UTF-8;
the test retains this evidence so an upstream change prompts review. The byte
API buffers the complete output and resolves only after header and payload
authentication. Streaming output is unsuitable for the whole-entry contract
because it could return earlier chunks before a later authentication failure.

Tests cover empty strings, whitespace, line endings, NUL, a leading BOM,
Unicode, and the 64 KiB plaintext boundary. The limit counts encoded bytes:
16,384 four-byte characters fit, while one additional ASCII byte is rejected.
Lone surrogates are rejected before encoding. The filesystem adapter limits
ciphertext reads to 1 MiB before invoking the codec; the codec enforces the same
ciphertext maximum before identity acquisition. Authenticated plaintext above
64 KiB is `invalid-data`. Decryption still requires bounded allocation up to the
ciphertext limit.

Negative cases cover wrong identities, malformed headers, payload tampering,
truncation, appended data, authenticated invalid UTF-8, oversized data, and a
validly encoded all-zero X25519 public point. These tests establish selected
integration properties, not a cryptographic audit.

## Identity, authority, and write outcomes

The codec copies a non-empty recipient policy at construction and uses no
identity provider for encryption. It creates a fresh decrypter and requests
identities once for each read of an existing entry. A missing entry does not
acquire identities, and a write does not acquire a decryption identity. The
provider's current result is used on each call. The codec neither caches,
generates, loads, nor persists identities.

Factories require an explicit, existing private root. Construction does not
create paths, change permissions, or acquire identities. The root must belong to the effective user and have no group/other access or
special bits: readers require owner read/search permissions (`0500`), and
writers also require owner write permission (`0700`). Ancestors must belong to
root or the effective user; group/other-writable ancestors require the sticky
bit, with trusted ownership checked for each child. Every component rejects
symlinks. Device and inode identities are retained in memory and rechecked over
the ancestry during operations. Permissive paths are rejected rather than
repaired. The adapter relies on POSIX ownership and no-follow operations; it
does not claim to defeat a trusted owner racing path replacement.

A write encrypts in memory, exclusively creates a mode-0600 temporary ciphertext
file in the same directory, writes and synchronises the file, closes it, renames
it within the root, and synchronises the directory. Concurrent writers use
last-writer-wins replacement. There is no lock, retry, backup, journal, or
transaction. Before replacement, a failure leaves the previous entry intact.
Once replacement starts, a rejected write has an uncertain outcome. Cleanup
removes only the operation's verified temporary inode; residue can remain if
ownership cannot be proved or cleanup fails.

The adapter returns `unavailable` on Windows rather than substituting POSIX
permission checks for Windows ACL authority. Local filesystem qualification is
limited to Linux arm64 on ext4. macOS, network filesystems, and hardware
power-loss behaviour remain unqualified. A successful `sync()` request does
not establish hardware power-loss durability. The factory cannot detect every
unsuitable filesystem, so deployments must select a qualified local filesystem.

Errors are sanitised and fixed. Upstream ciphertext parsing, key selection, and
authentication failures map to `decryption-failed`; the dependency has no stable
typed taxonomy, so its messages are not parsed to distinguish wrong identities
from damaged ciphertext. Ciphertext over the size limit, invalid stored
encoding, authenticated invalid UTF-8, and oversized authenticated plaintext
are `invalid-data`. Reliably identified permission failures are
`access-denied`; absent roots, unavailable platform support, or an empty
identity list are `unavailable`. Provider exceptions and uncertain encryption
or filesystem failures are `operation-failed`. Provider failures never select a
fallback identity source, and errors do not include values, identities, or
caller-supplied paths.

## File format and metadata limits

The file mapping is `<explicit-root>/secret-<portable-name>.age`, with one
standard binary age ciphertext per entry. Recipients are explicit writer
configuration. An optional management file such as `recipients.txt` is not
reader state and is never discovered by the package. Identities are supplied by
the application and kept elsewhere.

Names, entry counts, approximate value sizes, and change timing remain visible.
age does not bind ciphertext to its filename, identify its writer, establish
freshness, or prevent replay. A party able to replace files can replay or swap
valid ciphertext; a holder of a public recipient can create new ciphertext.
Directory authority and trusted provisioning remain necessary. These properties
do not imply an envelope, hidden namespace, journal, fallback backend, or
automatic key provisioning.

## Reproduction

From the workspace, the recorded package checks can be reproduced with:

```sh
npm run check --workspace @vrtmrz/secret-store-node
npm run test --workspace @vrtmrz/secret-store-node
npm run test:age:codec
npm run test:age:install-tools
npm run test:age:interop
```

The private codec facade uses the built internal codec. CI installs pinned
native tools and runs interoperability; a missing tool or version mismatch
fails the command rather than counting as a skipped pass.

The installer verifies the SHA-256 digests recorded in
[tools.json](../../test/secret-store-age/tools.json), then extracts only the
named executables below ignored `_testdata/age-interop`. It does not install a
system command. Existing binaries may be selected through `AGE_INTEROP_BIN` and
`RAGE_INTEROP_BIN`; the matching `-keygen` executable must be beside each, and
version checks still require the pinned releases.

The interoperability suite creates a unique temporary directory, writes
synthetic identities with restricted permissions, passes plaintext and
ciphertext through captured pipes, and removes its directory in `finally`. It
uses no user store, Vault, credentials, or persistent identity.

## Primary sources

These sources document inspected dependency behaviour; the recorded test suites
establish the Fancy Kit runtime results above.

- [typage 0.3.1 source](https://github.com/FiloSottile/typage/tree/38b8b10cb22409de0eaa8a617a01f16dc2e3f9f4) and [published metadata](https://registry.npmjs.org/age-encryption/0.3.1): API, licence, dependencies, byte/text behaviour, and error boundaries. The reviewed local source was the exact npm artefact selected by the lockfile.
- [age 1.3.2 release](https://github.com/FiloSottile/age/releases/tag/v1.3.2) and [rage 0.12.1 release](https://github.com/str4d/rage/releases/tag/v0.12.1): pinned native interoperability versions and artefacts.
- [Node.js 20.19.0](https://nodejs.org/dist/v20.19.0/SHASUMS256.txt) and [Node.js 22.23.3](https://nodejs.org/dist/v22.23.3/SHASUMS256.txt): checksums for additional runtime probes. These are test runtimes, not changes to the workspace's Node.js selection.
