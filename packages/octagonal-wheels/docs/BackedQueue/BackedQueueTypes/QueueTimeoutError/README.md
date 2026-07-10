[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueueTimeoutError

# Class: QueueTimeoutError

Defined in: [src/BackedQueue/BackedQueueTypes.ts:42](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/BackedQueue/BackedQueueTypes.ts#L42)

Error class for queue timeout errors.

## Extends

- [`QueueError`](../QueueError/README.md)

## Constructors

### Constructor

```ts
new QueueTimeoutError(message: string, options?: {
  cause?: unknown;
  status?: number;
}): QueueTimeoutError;
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

`QueueTimeoutError`

#### Inherited from

[`QueueError`](../QueueError/README.md).[`constructor`](../QueueError/README.md#constructor)

## Properties

| Property | Modifier | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="cause"></a> `cause?` | `public` | `Error` | - | [`QueueError`](../QueueError/README.md).[`cause`](../QueueError/README.md#cause) | [src/common/error.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L14) |
| <a id="message"></a> `message` | `public` | `string` | - | [`QueueError`](../QueueError/README.md).[`message`](../QueueError/README.md#message) | node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name` | `public` | `string` | - | [`QueueError`](../QueueError/README.md).[`name`](../QueueError/README.md#name) | [src/common/error.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L13) |
| <a id="overridestatus"></a> `overrideStatus?` | `public` | `number` | - | [`QueueError`](../QueueError/README.md).[`overrideStatus`](../QueueError/README.md#overridestatus) | [src/common/error.ts:15](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/common/error.ts#L15) |
| <a id="stack"></a> `stack?` | `public` | `string` | - | [`QueueError`](../QueueError/README.md).[`stack`](../QueueError/README.md#stack) | node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="preparestacktrace"></a> `prepareStackTrace?` | `static` | (`err`: `Error`, `stackTraces`: `CallSite`[]) => `any` | Optional override for formatting stack traces **See** https://v8.dev/docs/stack-trace-api#customizing-stack-traces | [`QueueError`](../QueueError/README.md).[`prepareStackTrace`](../QueueError/README.md#preparestacktrace) | node\_modules/@types/node/globals.d.ts:28 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | - | [`QueueError`](../QueueError/README.md).[`stackTraceLimit`](../QueueError/README.md#stacktracelimit) | node\_modules/@types/node/globals.d.ts:30 |

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

[`QueueError`](../QueueError/README.md).[`status`](../QueueError/README.md#status)

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

[`QueueError`](../QueueError/README.md).[`captureStackTrace`](../QueueError/README.md#capturestacktrace)

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

[`QueueError`](../QueueError/README.md).[`fromError`](../QueueError/README.md#fromerror)

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

[`QueueError`](../QueueError/README.md).[`isCausedBy`](../QueueError/README.md#iscausedby)
