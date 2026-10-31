[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueueOperationError

# Class: QueueOperationError

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:37

Error class for queue operation errors.

## Extends

- [`QueueError`](../QueueError/README.md)

## Constructors

### Constructor

```ts
new QueueOperationError(message: string, options?: {
  cause?: unknown;
  status?: number;
}): QueueOperationError;
```

Defined in: packages/octagonal-wheels/src/common/error.ts:34

Constructs a new LiveSyncError instance.

#### Parameters

| Parameter         | Type                                            | Description                        |
| ----------------- | ----------------------------------------------- | ---------------------------------- |
| `message`         | `string`                                        | The error message to be displayed. |
| `options?`        | \{ `cause?`: `unknown`; `status?`: `number`; \} | -                                  |
| `options.cause?`  | `unknown`                                       | -                                  |
| `options.status?` | `number`                                        | -                                  |

#### Returns

`QueueOperationError`

#### Inherited from

[`QueueError`](../QueueError/README.md).[`constructor`](../QueueError/README.md#constructor)

## Properties

| Property                                       | Modifier | Type     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from                                                                                       | Defined in                                       |
| ---------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| <a id="cause"></a> `cause?`                    | `public` | `Error`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`QueueError`](../QueueError/README.md).[`cause`](../QueueError/README.md#cause)                     | packages/octagonal-wheels/src/common/error.ts:14 |
| <a id="message"></a> `message`                 | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`QueueError`](../QueueError/README.md).[`message`](../QueueError/README.md#message)                 | node\_modules/typescript/lib/lib.es5.d.ts:1077   |
| <a id="name"></a> `name`                       | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`QueueError`](../QueueError/README.md).[`name`](../QueueError/README.md#name)                       | packages/octagonal-wheels/src/common/error.ts:13 |
| <a id="overridestatus"></a> `overrideStatus?`  | `public` | `number` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`QueueError`](../QueueError/README.md).[`overrideStatus`](../QueueError/README.md#overridestatus)   | packages/octagonal-wheels/src/common/error.ts:15 |
| <a id="stack"></a> `stack?`                    | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`QueueError`](../QueueError/README.md).[`stack`](../QueueError/README.md#stack)                     | node\_modules/typescript/lib/lib.es5.d.ts:1078   |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | [`QueueError`](../QueueError/README.md).[`stackTraceLimit`](../QueueError/README.md#stacktracelimit) | node\_modules/@types/node/globals.d.ts:68        |

## Accessors

### status

#### Get Signature

```ts
get status(): number;
```

Defined in: packages/octagonal-wheels/src/common/error.ts:21

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

Defined in: node\_modules/@types/node/globals.d.ts:52

Creates a `.stack` property on `targetObject`, which when accessed returns
a string representing the location in the code at which
`Error.captureStackTrace()` was called.

```js
const myObject = {};
Error.captureStackTrace(myObject);
myObject.stack; // Similar to `new Error().stack`
```

The first line of the trace will be prefixed with
`${myObject.name}: ${myObject.message}`.

The optional `constructorOpt` argument accepts a function. If given, all frames
above `constructorOpt`, including `constructorOpt`, will be omitted from the
generated stack trace.

The `constructorOpt` argument is useful for hiding implementation
details of error generation from the user. For instance:

```js
function a() {
  b();
}

function b() {
  c();
}

function c() {
  // Create an error without stack trace to avoid calculating the stack trace twice.
  const { stackTraceLimit } = Error;
  Error.stackTraceLimit = 0;
  const error = new Error();
  Error.stackTraceLimit = stackTraceLimit;

  // Capture the stack trace above function b
  Error.captureStackTrace(error, b); // Neither function c, nor b is included in the stack trace
  throw error;
}

a();
```

#### Parameters

| Parameter         | Type       |
| ----------------- | ---------- |
| `targetObject`    | `object`   |
| `constructorOpt?` | `Function` |

#### Returns

`void`

#### Inherited from

[`QueueError`](../QueueError/README.md).[`captureStackTrace`](../QueueError/README.md#capturestacktrace)

---

### fromError()

```ts
static fromError<T>(this: T, error: any): InstanceType<T>;
```

Defined in: packages/octagonal-wheels/src/common/error.ts:69

Creates a new instance of the error class from an existing error.

#### Type Parameters

| Type Parameter                   |
| -------------------------------- |
| `T` _extends_ _typeof_ `LSError` |

#### Parameters

| Parameter | Type  | Description        |
| --------- | ----- | ------------------ |
| `this`    | `T`   | -                  |
| `error`   | `any` | The error to wrap. |

#### Returns

`InstanceType`\<`T`\>

A new instance of the error class with the original error's message and stack trace.

#### Inherited from

[`QueueError`](../QueueError/README.md).[`fromError`](../QueueError/README.md#fromerror)

---

### isCausedBy()

```ts
static isCausedBy<T>(error: any, errorClass: (...args: any[]) => T): boolean;
```

Defined in: packages/octagonal-wheels/src/common/error.ts:52

Determines whether an error is caused by a specific error class.

#### Type Parameters

| Type Parameter          |
| ----------------------- |
| `T` _extends_ `LSError` |

#### Parameters

| Parameter    | Type                        | Description                         |
| ------------ | --------------------------- | ----------------------------------- |
| `error`      | `any`                       | The error to examine.               |
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

---

### prepareStackTrace()

```ts
static prepareStackTrace(err: Error, stackTraces: CallSite[]): any;
```

Defined in: node\_modules/@types/node/globals.d.ts:56

#### Parameters

| Parameter     | Type         |
| ------------- | ------------ |
| `err`         | `Error`      |
| `stackTraces` | `CallSite`[] |

#### Returns

`any`

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Inherited from

[`QueueError`](../QueueError/README.md).[`prepareStackTrace`](../QueueError/README.md#preparestacktrace)
