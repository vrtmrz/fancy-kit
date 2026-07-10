[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / CryptographicKeyConfig

# Type Alias: CryptographicKeyConfig

```ts
type CryptographicKeyConfig = {
  modulusLength?: number;
  publicExponent?: Uint8Array<ArrayBuffer>;
};
```

Defined in: [src/encryption/asymmetric/common.ts:35](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L35)

Configuration options for generating cryptographic keys.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="moduluslength"></a> `modulusLength?` | `number` | RSA modulus length in bits. Minimum 2048, recommended 3072+. | [src/encryption/asymmetric/common.ts:37](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L37) |
| <a id="publicexponent"></a> `publicExponent?` | `Uint8Array`\<`ArrayBuffer`\> | RSA public exponent. Default is 65537 (0x010001). | [src/encryption/asymmetric/common.ts:39](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L39) |
