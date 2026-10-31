[**octagonal-wheels**](../../../../README.md)

---

[octagonal-wheels](../../../../modules.md) / [encryption](../../../README.md) / [OpenSSLCompat](../../README.md) / [CBC](../README.md) / generateIV

# Function: generateIV()

```ts
function generateIV(
  keyMaterial: CryptoKey,
  salt: Uint8Array<ArrayBuffer>,
  iterations?: number,
): Promise<ArrayBuffer>;
```

Defined in: packages/octagonal-wheels/src/encryption/openSSLCompat/CBC.ts:39

## Parameters

| Parameter     | Type                          | Default value |
| ------------- | ----------------------------- | ------------- |
| `keyMaterial` | `CryptoKey`                   | `undefined`   |
| `salt`        | `Uint8Array`\<`ArrayBuffer`\> | `undefined`   |
| `iterations`  | `number`                      | `100_000`     |

## Returns

`Promise`\<`ArrayBuffer`\>
