[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / CryptographicKeyConfig

# Type Alias: CryptographicKeyConfig

```ts
type CryptographicKeyConfig = {
  modulusLength?: number;
  publicExponent?: Uint8Array<ArrayBuffer>;
};
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/common.ts:35

Configuration options for generating cryptographic keys.

## Properties

| Property                                      | Type                          | Description                                                  | Defined in                                                       |
| --------------------------------------------- | ----------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| <a id="moduluslength"></a> `modulusLength?`   | `number`                      | RSA modulus length in bits. Minimum 2048, recommended 3072+. | packages/octagonal-wheels/src/encryption/asymmetric/common.ts:37 |
| <a id="publicexponent"></a> `publicExponent?` | `Uint8Array`\<`ArrayBuffer`\> | RSA public exponent. Default is 65537 (0x010001).            | packages/octagonal-wheels/src/encryption/asymmetric/common.ts:39 |
