[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / AsymmetricEncryptionErrorBase

# Class: AsymmetricEncryptionErrorBase

Defined in: [src/encryption/asymmetric/common.ts:48](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L48)

## Extends

- `Error`

## Extended by

- [`AsymmetricEncryptionError`](../AsymmetricEncryptionError/README.md)
- [`AsymmetricDecryptionError`](../AsymmetricDecryptionError/README.md)
- [`AsymmetricKeyGenerationError`](../AsymmetricKeyGenerationError/README.md)
- [`AsymmetricEncryptionArgumentError`](../AsymmetricEncryptionArgumentError/README.md)
- [`AsymmetricKeyIOError`](../AsymmetricKeyIOError/README.md)

## Constructors

### Constructor

```ts
new AsymmetricEncryptionErrorBase(message: string, baseError?: any): AsymmetricEncryptionErrorBase;
```

Defined in: [src/encryption/asymmetric/common.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `baseError?` | `any` |

#### Returns

`AsymmetricEncryptionErrorBase`

#### Overrides

```ts
Error.constructor
```

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="message"></a> `message` | `public` | `string` | `undefined` | - | - | `Error.message` | node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name` | `public` | `string` | `"AsymmetricEncryptionErrorBase"` | - | `Error.name` | - | [src/encryption/asymmetric/common.ts:50](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L50) |
| <a id="stack"></a> `stack?` | `public` | `string` | `undefined` | - | - | `Error.stack` | node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | `undefined` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | - | `Error.prepareStackTrace` | node\_modules/@types/node/globals.d.ts:28 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | `undefined` | - | - | `Error.stackTraceLimit` | node\_modules/@types/node/globals.d.ts:30 |

## Methods

### captureStackTrace()

```ts
static captureStackTrace(targetObject: object, constructorOpt?: Function): void;
```

Defined in: node\_modules/@types/node/globals.d.ts:21

Create .stack property on a target object

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `targetObject` | `object` |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

```ts
Error.captureStackTrace
```
