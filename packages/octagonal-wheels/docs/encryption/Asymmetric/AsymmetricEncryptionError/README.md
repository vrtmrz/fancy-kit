[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / AsymmetricEncryptionError

# Class: AsymmetricEncryptionError

Defined in: [src/encryption/asymmetric/common.ts:70](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L70)

## Extends

- [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md)

## Constructors

### Constructor

```ts
new AsymmetricEncryptionError(message: string, baseError?: any): AsymmetricEncryptionError;
```

Defined in: [src/encryption/asymmetric/common.ts:51](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `string` |
| `baseError?` | `any` |

#### Returns

`AsymmetricEncryptionError`

#### Inherited from

[`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`constructor`](../AsymmetricEncryptionErrorBase/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="message"></a> `message` | `public` | `string` | `undefined` | - | - | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`message`](../AsymmetricEncryptionErrorBase/README.md#message) | node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name` | `public` | `string` | `"AsymmetricEncryptionError"` | - | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`name`](../AsymmetricEncryptionErrorBase/README.md#name) | - | [src/encryption/asymmetric/common.ts:71](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/encryption/asymmetric/common.ts#L71) |
| <a id="stack"></a> `stack?` | `public` | `string` | `undefined` | - | - | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`stack`](../AsymmetricEncryptionErrorBase/README.md#stack) | node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | `undefined` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | - | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`prepareStackTrace`](../AsymmetricEncryptionErrorBase/README.md#preparestacktrace) | node\_modules/@types/node/globals.d.ts:28 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | `undefined` | - | - | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`stackTraceLimit`](../AsymmetricEncryptionErrorBase/README.md#stacktracelimit) | node\_modules/@types/node/globals.d.ts:30 |

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

[`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`captureStackTrace`](../AsymmetricEncryptionErrorBase/README.md#capturestacktrace)
