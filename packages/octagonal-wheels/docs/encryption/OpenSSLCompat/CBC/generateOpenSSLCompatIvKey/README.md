[**octagonal-wheels**](../../../../README.md)

---

[octagonal-wheels](../../../../modules.md) / [encryption](../../../README.md) / [OpenSSLCompat](../../README.md) / [CBC](../README.md) / generateOpenSSLCompatIvKey

# Function: generateOpenSSLCompatIvKey()

```ts
function generateOpenSSLCompatIvKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations?: number,
  usage?: "decrypt" | "encrypt",
): Promise<KeyIvPair>;
```

Defined in: packages/octagonal-wheels/src/encryption/openSSLCompat/CBC.ts:63

## Parameters

| Parameter    | Type                          | Default value |
| ------------ | ----------------------------- | ------------- |
| `passphrase` | `string`                      | `undefined`   |
| `salt`       | `Uint8Array`\<`ArrayBuffer`\> | `undefined`   |
| `iterations` | `number`                      | `100_000`     |
| `usage`      | `"decrypt"` \| `"encrypt"`    | `"decrypt"`   |

## Returns

`Promise`\<`KeyIvPair`\>
