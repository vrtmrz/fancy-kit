# Secret store Node adapters

`@vrtmrz/secret-store-node` provides a Node.js age-file adapter for the platform-neutral contracts in [`@vrtmrz/secret-store`](../secret-store/README.md). The package is currently an unpublished `0.0.0` development version. It requires Node.js `>=20.19.0` and has runtime dependencies on `@vrtmrz/value-store`, `@vrtmrz/secret-store`, and `age-encryption` `0.3.1`.

The package exposes only the `./age` entry point:

```ts
import {
  createAgeFileSecretReader,
  createAgeFileSecretStore,
} from '@vrtmrz/secret-store-node/age';
```

## Supply key authority explicitly

Both factories require an existing private directory and an application-owned source of provisioned native X25519 identities. The writable store also requires a non-empty list of native X25519 recipients. The package does not create the directory, generate or locate keys, read environment variables, or fall back to another store.

```ts
const identityProvider = async () => provisionedIdentitiesFromYourKeyAuthority();
const recipients = provisionedRecipientsFromYourKeyAuthority;

const reader = await createAgeFileSecretReader({
  rootPath: '/srv/example/secrets',
  identityProvider,
});

const store = await createAgeFileSecretStore({
  rootPath: '/srv/example/secrets',
  identityProvider,
  recipients,
});

await store.setValue('example-api-token', 'synthetic-example-value');
const value = await reader.getValue('example-api-token'); // string or null
await store.setObject('example-api-settings', { enabled: false, retries: 0 });
const settings = await reader.getObject('example-api-settings');
```

The identity provider runs once for each read of an existing entry, after its bounded ciphertext read. It is not called for an absent entry or for writes. An empty identity list rejects with `unavailable`; provider failures reject with a fixed `ValueStoreError` from `@vrtmrz/value-store`. Recipients are validated and copied when the writable store is constructed. There is no automatic `recipients.txt` lookup.

The age adapter can also receive the core package's optional `ValueSerializer`. It transforms logical strings before the adapter encrypts them and restores them after authenticated decryption; object methods send JSON text through the same pair. This is an additional consumer-selected transform, not the age encryption boundary. Encryption, file permissions, and key provisioning remain owned by the age backend and its application composition.

## Directory and file behaviour

The root directory must already exist, belong to the effective user, and have private owner-only permissions. Every path component must be a real directory rather than a symbolic link, and ancestor ownership and permissions must meet the adapter's trusted-path checks. Reads require owner read/search (`0500`); writes require owner read/write/search (`0700`). Group/other permissions and special bits on the root are rejected. Ancestors must belong to root or the effective user, and group/other writable ancestors require the sticky bit. The adapter rejects more permissive paths instead of changing their permissions. It never creates a directory. Root and ancestor device/inode identities are bound at construction and rechecked; a lost or replaced root rejects rather than reporting an absent entry. Existing entries must be private, owner-readable regular files without extra hard links.

Entries use the name mapping `secret-<name>.age` and contain standard binary age ciphertext. Names follow the core package's 1–64-character lowercase ASCII profile. Empty strings, whitespace, NUL, a leading BOM, and other well-formed Unicode values round-trip exactly. The UTF-8 plaintext limit after optional serialisation is 64 KiB; the ciphertext limit is 1 MiB. Invalid Unicode input, oversized writes, malformed stored data, and authentication failures reject with fixed error codes. Without a default, `getValue` returns `null` for absence and `getObject` returns `undefined`; stored JSON `null` remains `null`. Both getters accept the core contract's optional default used only for absence, which is never encrypted or persisted and never replaces a read or decryption failure.

A write serialises the logical string, encrypts in memory, creates an exclusive owner-only temporary ciphertext file, synchronises and closes it, renames it within the root, then synchronises the directory. Concurrent writers use last-writer-wins replacement. There is no lock, retry, backup, or transaction. Temporary files use mode `0600`. The reader exposes `getValue` and `getObject`; the store adds `setValue` and `setObject`, without listing, deletion, or provisioning. Once replacement starts, a rejected write has an uncertain outcome; it does not prove that the old value remains. Cleanup is limited to the operation's verified temporary file, so residue can remain if ownership cannot be proved or cleanup fails.

This adapter requires POSIX ownership and no-follow filesystem operations. Windows reports `unavailable`. Current local qualification covers Linux arm64 on ext4. macOS, network filesystems, and hardware power-loss behaviour are not qualified by that evidence. Portable Node checks cannot prevent a trusted owner from racing path replacement.

Names, entry counts, approximate value sizes, and change timing are visible. age does not authenticate the writer, bind ciphertext to a name, prevent swapping entries, or prevent rollback. Directory write authority and trusted provisioning remain necessary. The factories cannot identify every unsupported mount automatically; select a qualified local filesystem explicitly.

## Use a local workspace build

The Node adapter has no registry release yet. ValueStore and SecretStore 0.1.0 are published; to test source changes across the workspace packages, install the workspace dependencies, then build and pack all three packages from the Fancy Kit workspace:

```bash
npm run build --workspace @vrtmrz/value-store
npm run build --workspace @vrtmrz/secret-store
npm run build --workspace @vrtmrz/secret-store-node
mkdir -p /tmp/fancy-kit-secret-store-tarballs
npm pack --workspace @vrtmrz/value-store --pack-destination /tmp/fancy-kit-secret-store-tarballs
npm pack --workspace @vrtmrz/secret-store --pack-destination /tmp/fancy-kit-secret-store-tarballs
npm pack --workspace @vrtmrz/secret-store-node --pack-destination /tmp/fancy-kit-secret-store-tarballs
```

From a consumer project, install all three local tarballs together so the adapter resolves to the matching local core builds:

```bash
npm install \
  /tmp/fancy-kit-secret-store-tarballs/vrtmrz-value-store-0.1.0.tgz \
  /tmp/fancy-kit-secret-store-tarballs/vrtmrz-secret-store-0.1.0.tgz \
  /tmp/fancy-kit-secret-store-tarballs/vrtmrz-secret-store-node-0.0.0.tgz
```

For implementation evidence and limits, see the [age file-store feasibility report](../../docs/design/secret-store-age-feasibility.md).
