[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [obfuscatePath](../README.md) / obfuscatePath

# Function: obfuscatePath()

```ts
function obfuscatePath<T>(
   path: T, 
   passphrase: string, 
autoCalculateIterations: boolean): Promise<string>;
```

Defined in: [src/encryption/obfuscatePath.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/obfuscatePath.ts#L11)

Obfuscates the given path using AES-GCM encryption. This obfuscation is deterministic.

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `string` |

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `path` | `T` | The path to obfuscate. |
| `passphrase` | `string` | The passphrase used for encryption. |
| `autoCalculateIterations` | `boolean` | A boolean indicating whether to automatically calculate the iterations. |

## Returns

`Promise`\<`string`\>

The obfuscated path: |%| iv(32) | salt(32) | data ....
