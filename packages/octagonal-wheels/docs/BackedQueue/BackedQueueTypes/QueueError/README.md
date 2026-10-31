[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [BackedQueue](../../README.md) / [BackedQueueTypes](../README.md) / QueueError

# Class: QueueError

Defined in: packages/octagonal-wheels/src/BackedQueue/BackedQueueTypes.ts:32

Base class for queue-related errors.

## Extends

- `LSError`

## Extended by

- [`QueueOperationError`](../QueueOperationError/README.md)
- [`QueueTimeoutError`](../QueueTimeoutError/README.md)
- [`QueueAbortError`](../QueueAbortError/README.md)

## Constructors

### Constructor

```ts
new QueueError(message: string, options?: {
  cause?: unknown;
  status?: number;
}): QueueError;
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

`QueueError`

#### Inherited from

```ts
LSError.constructor;
```

## Properties

| Property                                       | Modifier | Type     | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from            | Defined in                                       |
| ---------------------------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------ |
| <a id="cause"></a> `cause?`                    | `public` | `Error`  | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `LSError.cause`           | packages/octagonal-wheels/src/common/error.ts:14 |
| <a id="message"></a> `message`                 | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `LSError.message`         | node\_modules/typescript/lib/lib.es5.d.ts:1077   |
| <a id="name"></a> `name`                       | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `LSError.name`            | packages/octagonal-wheels/src/common/error.ts:13 |
| <a id="overridestatus"></a> `overrideStatus?`  | `public` | `number` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `LSError.overrideStatus`  | packages/octagonal-wheels/src/common/error.ts:15 |
| <a id="stack"></a> `stack?`                    | `public` | `string` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `LSError.stack`           | node\_modules/typescript/lib/lib.es5.d.ts:1078   |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `LSError.stackTraceLimit` | node\_modules/@types/node/globals.d.ts:68        |

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

```ts
LSError.status;
```

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

```ts
LSError.captureStackTrace;
```

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

```ts
LSError.fromError;
```

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

```ts
LSError.isCausedBy;
```

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

```ts
LSError.prepareStackTrace;
```
