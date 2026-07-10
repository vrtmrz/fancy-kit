[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [databases](../../README.md) / [dbcommon](../README.md) / DatabaseTransactionAbortError

# Class: DatabaseTransactionAbortError

Defined in: [src/databases/dbcommon.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L10)

## Extends

- [`DatabaseTransactionError`](../DatabaseTransactionError/README.md)

## Constructors

### Constructor

```ts
new DatabaseTransactionAbortError(message: string, options?: {
  cause?: unknown;
  status?: number;
}): DatabaseTransactionAbortError;
```

Defined in: [src/common/error.ts:34](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L34)

Constructs a new LiveSyncError instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `string` | The error message to be displayed. |
| `options?` | \{ `cause?`: `unknown`; `status?`: `number`; \} | - |
| `options.cause?` | `unknown` | - |
| `options.status?` | `number` | - |

#### Returns

`DatabaseTransactionAbortError`

#### Inherited from

[`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`constructor`](../DatabaseTransactionError/README.md#constructor)

## Properties

| Property | Modifier | Type | Default value | Description | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="abortederror"></a> `abortedError?` | `public` | `Error` | `undefined` | - | - | - | [src/databases/dbcommon.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L12) |
| <a id="cause"></a> `cause?` | `public` | `Error` | `undefined` | - | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`cause`](../DatabaseTransactionError/README.md#cause) | [src/common/error.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L14) |
| <a id="message"></a> `message` | `public` | `string` | `undefined` | - | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`message`](../DatabaseTransactionError/README.md#message) | node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name` | `public` | `string` | `"DatabaseTransactionAbortError"` | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`name`](../DatabaseTransactionError/README.md#name) | - | [src/databases/dbcommon.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L11) |
| <a id="overridestatus"></a> `overrideStatus?` | `public` | `number` | `undefined` | - | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`overrideStatus`](../DatabaseTransactionError/README.md#overridestatus) | [src/common/error.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L15) |
| <a id="stack"></a> `stack?` | `public` | `string` | `undefined` | - | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`stack`](../DatabaseTransactionError/README.md#stack) | node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | `undefined` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`prepareStackTrace`](../DatabaseTransactionError/README.md#preparestacktrace) | node\_modules/@types/node/globals.d.ts:28 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | `undefined` | - | - | [`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`stackTraceLimit`](../DatabaseTransactionError/README.md#stacktracelimit) | node\_modules/@types/node/globals.d.ts:30 |

## Accessors

### status

#### Get Signature

```ts
get status(): number;
```

Defined in: [src/common/error.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L21)

Returns the HTTP status code associated with the error, if available.
If the error has a status property, it returns that; otherwise, it defaults to 500 (Internal Server Error).

##### Returns

`number`

The HTTP status code.

#### Inherited from

[`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`status`](../DatabaseTransactionError/README.md#status)

## Methods

### setAbortedError()

```ts
setAbortedError(err: Error): void;
```

Defined in: [src/databases/dbcommon.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/databases/dbcommon.ts#L13)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `err` | `Error` |

#### Returns

`void`

***

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

[`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`captureStackTrace`](../DatabaseTransactionError/README.md#capturestacktrace)

***

### fromError()

```ts
static fromError<T>(this: T, error: any): InstanceType<T>;
```

Defined in: [src/common/error.ts:69](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L69)

Creates a new instance of the error class from an existing error.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* *typeof* `LSError` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `this` | `T` | - |
| `error` | `any` | The error to wrap. |

#### Returns

`InstanceType`\<`T`\>

A new instance of the error class with the original error's message and stack trace.

#### Inherited from

[`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`fromError`](../DatabaseTransactionError/README.md#fromerror)

***

### isCausedBy()

```ts
static isCausedBy<T>(error: any, errorClass: (...args: any[]) => T): boolean;
```

Defined in: [src/common/error.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L52)

Determines whether an error is caused by a specific error class.

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `LSError` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `error` | `any` | The error to examine. |
| `errorClass` | (...`args`: `any`[]) => `T` | The error class to compare against. |

#### Returns

`boolean`

True if the error is caused by the specified error class; otherwise, false.

#### Example

```ts
LiveSyncError.isCausedBy(someSyncParamsFetchError, SyncParamsNotFoundError); // Returns true if the error is caused by SyncParamsNotFoundError; this is usually represented as SyncParamsFetchError at the uppermost layer.
```

#### Inherited from

[`DatabaseTransactionError`](../DatabaseTransactionError/README.md).[`isCausedBy`](../DatabaseTransactionError/README.md#iscausedby)
