# Age file-store feasibility and evidence

Status: Phases 3a, 3b, and the Phase 3d value/object facade are implemented and locally verified. The Node adapter remains an unpublished `0.0.0` package.

Date: 2026-10-18

Related design: [Cross-platform SecretStore](secret-store.md#age-files).

## Result and scope

The public Node package provides the `./age` entry point for explicit age-file readers and read/write stores. The byte codec lives in `packages/secret-store-node/src/internal/age-codec.ts`; it is not a package export. The private feasibility facade at [`test/secret-store-age/codec.mjs`](../../test/secret-store-age/codec.mjs) now imports that built internal module, so package and feasibility checks exercise the same codec implementation.

`@vrtmrz/secret-store-node` remains at unpublished version `0.0.0`, targets Node.js `>=20.19.0`, and has exact direct runtime dependencies on `@vrtmrz/secret-store` `0.0.0` and `age-encryption` `0.3.1`. The platform-neutral `@vrtmrz/secret-store` package remains free of runtime dependencies. There is no registry release yet; a consumer trial must install local tarballs for both packages.

Phase 3b passed 54 filesystem tests, 17 codec tests, and 22 native interoperability tests (39 codec and interoperability cases combined) on Linux arm64 ext4 with Node.js 20.19.0, 22.23.3, and 24.18.0. The native suite includes public file-store round trips. The filesystem suite exercises real permission/link checks, injected I/O failures, concurrent replacement, bounded reads, and process termination before and after rename. Packed-consumer verification also passed with the installed public entry and Node-only type declarations. These are package-owned checks; no maintained consumer has adopted this adapter yet.

Phase 3d replaces the original public get/set methods with asynchronous value/object methods, optional defaults for absent entries, and paired serialisation; it does not change the binary age codec or file layout. The updated filesystem suite passes 58 tests on Node.js 20.19.0, 22.23.3, and 24.18.0 on Linux arm64 ext4. The complete workspace and installed-tarball gates pass, and the 22 pinned native interoperability checks pass through the updated public file-store methods on Node.js 24.18.0.

## Phase 3a historical codec evidence

Before the file adapter was added, a private codec prototype demonstrated the proposed binary age representation with exact UTF-8 values, native X25519 recipients, and a per-operation identity provider. Bidirectional tests passed against official `age` 1.3.2 and `rage` 0.12.1 binaries on Linux arm64. Both native tools decrypted codec output with either of two recipients, and the codec decrypted each tool's output. Native-generated and JavaScript-generated identities were exercised. The 37 codec and interoperability checks passed on Linux arm64 with Node.js 20.19.0, 22.23.3, and 24.18.0.

This historical evidence establishes codec interoperability only. It does not qualify the Phase 3b filesystem adapter, macOS or Windows behaviour, network filesystems, hardware power-loss durability, deployment, or the cryptographic implementations as a whole. Node.js 20.19.0 was a dependency-floor probe, not a new workspace support promise; repository CI uses Node.js 24.

## Dependencies and runtime evidence

The [lockfile](../../package-lock.json) records exact resolved packages and integrity digests. The Node adapter directly depends on `age-encryption` `0.3.1`; the selected package brings these reviewed runtime dependencies:

| Dependency | Resolved version | Licence | Runtime requirement |
| --- | --- | --- | --- |
| `age-encryption` | 0.3.1 | BSD-3-Clause | ESM; upstream documents ES2023 and Node.js 20+. No `engines` field. |
| `@noble/ciphers` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/curves` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/hashes` | 2.4.0 | MIT | Node.js >=20.19.0. |
| `@noble/post-quantum` | 0.5.4 | MIT | Node.js >=20.19.0; brings nested curves and hashes 2.0.1. |
| `@scure/base` | 2.4.0 | MIT | No `engines` field. |

The selected packages have no install lifecycle scripts. The age entry statically imports the post-quantum dependency even when only X25519 is used. Restricting the adapter's accepted key forms does not remove that dependency or its review burden. There are no native npm add-ons or external executables in the runtime codec path; `age` and `rage` are test tools only. The root workspace also retains `age-encryption` as a development dependency for the private native interoperability tests.

Neither the historical codec probes nor the Phase 3b runtime matrix qualifies other operating systems or architectures. Current filesystem qualification is limited to Linux arm64 on a local ext4 filesystem. Windows returns `unavailable`. macOS and network filesystems remain unqualified.

## Value and authentication boundaries

Each ciphertext contains the UTF-8 encoding of the string delivered to the backend. The codec adds no JSON envelope, custom header, or filename. Object methods supply JSON text, and an explicitly injected serializer may transform that string before the codec encrypts it. Tests preserve empty strings, whitespace, NUL, a leading BOM, Unicode, and values at the 64 KiB plaintext limit. The limit counts encoded bytes: 16,384 four-byte characters fit, while one additional ASCII byte is rejected. Lone surrogates are rejected before encoding.

The codec uses `decrypt(ciphertext, 'uint8array')`, followed by `TextDecoder('utf-8', { fatal: true, ignoreBOM: true })`. Upstream text mode removes a leading BOM and replaces malformed UTF-8; a test retains that evidence so an upstream change prompts a review of the integration. The byte API buffers the complete output and resolves only after header and payload authentication. Streaming output is unsuitable for the whole-entry contract because earlier chunks can be returned before a later authentication failure.

The adapter bounds the filesystem read to 1 MiB before invoking the codec. The codec also rejects ciphertext over that limit before identity acquisition. Authenticated plaintext above 64 KiB is `invalid-data`. A 1 MiB ciphertext still requires bounded allocation during decryption; the library does not impose the application's limits.

Negative cases cover wrong identities, malformed headers, payload tampering, truncation, appended data, authenticated invalid UTF-8, oversized data, and a validly encoded all-zero X25519 public point. Native tools also reject a damaged codec ciphertext. These are targeted interoperability and integration checks, not a substitute for a cryptographic audit. Phase 3b adds filesystem authority and failure-path coverage, including fixed errors when an upstream exception has a throwing property getter or prototype trap.

## Key, authority, and error boundaries

The codec copies a non-empty recipient policy at construction and uses no identity provider for encryption. Only native X25519 string forms are accepted. The codec creates a fresh decrypter and requests identities once per decryption; a later call uses the provider's current result. It neither caches identities globally nor generates, loads, or persists a key. Test setup creates disposable synthetic keys explicitly.

The public reader and writer require an existing private root directory. Construction does not create paths, change permissions, or acquire identities. The root must be owned by the effective user and private to that user; ancestors must meet trusted-owner and writable-path checks. Symbolic path components are rejected, authority is rechecked during operations, and a more permissive root is rejected rather than repaired. The adapter relies on POSIX ownership and no-follow operations and does not claim to defeat a trusted owner racing path replacement.

The writer maps each portable secret name to `<root>/secret-<name>.age`. It encrypts in memory, creates an exclusive mode-0600 temporary file, writes and synchronises the ciphertext, closes the file, renames it within the root, and synchronises the directory. Concurrent writers use last-writer-wins replacement. There is no lock, retry, backup, journal, or transaction. Once replacement starts, a rejected write has an uncertain outcome. Cleanup only removes the operation's verified temporary inode; residue can remain if the adapter cannot prove ownership or cleanup itself fails. `sync()` requests filesystem synchronisation but does not establish hardware power-loss guarantees.

The identity provider runs once after a bounded successful read of an existing entry and is not called for absence or writes. An empty list means `unavailable`; provider errors are sanitised as `operation-failed`. A missing entry returns `null` only while the original root remains available. Error categorisation remains conservative:

| Observed boundary | Sanitised code |
| --- | --- |
| Invalid name, value, or recipient/identity policy | `invalid-name` or `invalid-value` |
| Missing root, unavailable platform capability, or empty identity list | `unavailable` |
| Reliably identified permission denial | `access-denied` |
| Upstream ciphertext parsing, key selection, or authentication failure | `decryption-failed` |
| Ciphertext over the limit, malformed stored encoding, or oversized authenticated plaintext | `invalid-data` |
| Provider exception or uncertain filesystem/encryption failure | `operation-failed` |

Upstream cryptographic errors have no stable code taxonomy. Do not parse their text to distinguish wrong keys from damaged ciphertext. The adapter uses fixed core errors without upstream messages or causes. A provider failure never triggers another source, and no error output includes values, identity strings, or caller-supplied paths.

## Format implications

The file mapping is `<explicit-root>/secret-<portable-name>.age`, with one standard binary age ciphertext per entry. Recipients are explicit writer configuration; an optional management file such as `recipients.txt` is not reader state and is never discovered by the package. Identities are supplied by the application and kept elsewhere.

Names, counts, approximate value sizes, and change timing remain visible. age does not bind a ciphertext to its filename, identify its writer, establish freshness, or prevent replay. These properties support the documented directory-authority requirements; they do not justify a hidden namespace, extra envelope, journal, fallback backend, or automatic provisioning.

## Reproduction and consumer trial

From the workspace, build and run the package and feasibility checks:

```bash
npm run check --workspace @vrtmrz/secret-store-node
npm run test --workspace @vrtmrz/secret-store-node
npm run test:age:codec
npm run test:age:install-tools
npm run test:age:interop
```

The codec checks run through the private facade against the package's built internal codec. CI installs pinned native tools and runs interoperability. Missing tools or a version mismatch fail the interoperability command; they are not reported as skipped passes.

For a consumer trial, build and pack both local packages, then install both resulting tarballs in the consumer project. The package README gives the exact commands. No registry release has been made.

The installer verifies the SHA-256 digests recorded in [tools.json](../../test/secret-store-age/tools.json), obtained from the official GitHub release assets, before extracting only the named executables below ignored `_testdata/age-interop`. It does not install a system command. To use an existing pair, set `AGE_INTEROP_BIN` and `RAGE_INTEROP_BIN` to exact executable paths; the matching `-keygen` executable must be beside each binary. Version checks still require the pinned releases.

The interoperability suite creates a unique temporary directory, writes synthetic identities with restricted permissions, passes plaintext and ciphertext through captured pipes, and removes its directory in `finally`. No user store, Vault, credentials, or persistent identity is involved.

## Primary sources

- [typage 0.3.1 source](https://github.com/FiloSottile/typage/tree/38b8b10cb22409de0eaa8a617a01f16dc2e3f9f4) and [published metadata](https://registry.npmjs.org/age-encryption/0.3.1): API, licence, dependencies, byte/text behaviour, and error boundaries. The reviewed local source is the exact npm artefact selected by the lockfile.
- [age 1.3.2 release](https://github.com/FiloSottile/age/releases/tag/v1.3.2) and [rage 0.12.1 release](https://github.com/str4d/rage/releases/tag/v0.12.1): historical native interoperability versions and artefacts.
- [Node.js 20.19.0](https://nodejs.org/dist/v20.19.0/SHASUMS256.txt) and [Node.js 22.23.3](https://nodejs.org/dist/v22.23.3/SHASUMS256.txt): checksums for additional runtime probes. These are test runtimes, not changes to the workspace's Node.js selection.
