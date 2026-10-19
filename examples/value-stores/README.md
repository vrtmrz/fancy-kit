# Value-store serialisation example

The [OW HKDF serializer](ow-hkdf-serializer.ts) demonstrates the same injected transformation for local values and named secrets. It uses the current `octagonal-wheels/encryption/hkdf` API from OW `0.1.55`, with HKDF-derived AES-GCM keys and the salted ciphertext format. It does not use the separate OpenSSL-compatible AES-CBC entry.

Import this example into application-owned code and provide the passphrase source explicitly:

```ts
import { MemoryLocalValueStore } from '@vrtmrz/local-storage';
import { MemorySecretStore } from '@vrtmrz/secret-store';
import { createOwHkdfSerializer } from './ow-hkdf-serializer.js';
import type { PassphraseProvider } from './ow-hkdf-serializer.js';

export async function demonstrateValues(getPassphrase: PassphraseProvider) {
  const serializer = createOwHkdfSerializer(getPassphrase);
  const local = new MemoryLocalValueStore({ serializer });
  const secrets = new MemorySecretStore({ serializer });

  await local.setObject('preferences', { hints: false, attempts: 0, label: '' });
  await secrets.setObject('connection', { token: 'example-placeholder', expiresAt: null });
  return {
    preferences: await local.getObject('preferences'),
    connection: await secrets.getObject('connection'),
  };
}
```

The same `serializer` option is accepted by Web Storage, Node file, and Obsidian factories, and by the age reader and writer. The neutral cores do not depend on OW. The [type fixture](../../test/value-store-serializers/public-types.ts) checks that the serializer types from the two cores are structurally compatible.

`setObject` converts the value to JSON text before invoking the serializer; `getObject` deserialises before parsing it. Value methods pass their string directly to the serializer. Backend absence skips deserialisation. Optional getter defaults are return values only: they neither invoke encryption nor persist data. A local empty-string value write deletes without invoking encryption; `setObject(key, '')` instead stores a JSON empty string as data. Secret empty strings are stored values.

The example authenticates a JSON pair containing the logical key and the string. This preserves arbitrary JavaScript strings across OW's UTF-8 boundary and rejects ciphertext copied to a different logical key. It does not hide the backend's physical keys or add authority to a namespace. OW carries the PBKDF2 salt inside the ciphertext and generates the encryption nonce; the provider remains responsible for supplying the matching passphrase after restart. This example adds no key generation, persistence, recovery, or rotation workflow. OW manages its own key-derivation cache; this wrapper adds none.

Errors contain fixed text without input values or causes. Invalid ciphertext, wrong passphrases, and mismatched logical keys fail without trying plaintext. The owning store maps arbitrary serializer exceptions to its fixed public error. The example's runtime tests do not constitute a cryptographic audit.

Run the focused type and behavioural checks with:

```sh
npm run check:value-serializers
npm run test:value-serializers
npm run test:local-storage:browser
```

The browser scenario also encrypts into real Chromium local storage and decrypts after reopening the same isolated profile. The complete workspace gate includes all three checks.
