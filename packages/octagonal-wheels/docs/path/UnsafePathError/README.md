[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / UnsafePathError

# Class: UnsafePathError

Defined in: packages/octagonal-wheels/src/path.ts:42

An error raised when an untrusted path fails the OW path-safety contract.

## Extends

- `Error`

## Constructors

### Constructor

```ts
new UnsafePathError(
   input: string,
   reason: UnsafePathReason,
   component?: string): UnsafePathError;
```

Defined in: packages/octagonal-wheels/src/path.ts:59

Creates an unsafe-path error.

#### Parameters

| Parameter    | Type                                                | Description                              |
| ------------ | --------------------------------------------------- | ---------------------------------------- |
| `input`      | `string`                                            | The complete untrusted input.            |
| `reason`     | [`UnsafePathReason`](../UnsafePathReason/README.md) | The stable rejection reason.             |
| `component?` | `string`                                            | The rejected component, when applicable. |

#### Returns

`UnsafePathError`

#### Overrides

```ts
Error.constructor;
```

## Properties

| Property                                       | Modifier   | Type                                                | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Inherited from          | Defined in                                     |
| ---------------------------------------------- | ---------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------- |
| <a id="component"></a> `component`             | `readonly` | `string` \| `undefined`                             | The rejected component, when the failure applies to one component.                                                                                                                                                                                                                                                                                                                                                                                | -                       | packages/octagonal-wheels/src/path.ts:50       |
| <a id="input"></a> `input`                     | `readonly` | `string`                                            | The complete untrusted input that was rejected.                                                                                                                                                                                                                                                                                                                                                                                                   | -                       | packages/octagonal-wheels/src/path.ts:44       |
| <a id="message"></a> `message`                 | `public`   | `string`                                            | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.message`         | node\_modules/typescript/lib/lib.es5.d.ts:1077 |
| <a id="name"></a> `name`                       | `public`   | `string`                                            | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.name`            | node\_modules/typescript/lib/lib.es5.d.ts:1076 |
| <a id="reason"></a> `reason`                   | `readonly` | [`UnsafePathReason`](../UnsafePathReason/README.md) | The stable reason that the input was rejected.                                                                                                                                                                                                                                                                                                                                                                                                    | -                       | packages/octagonal-wheels/src/path.ts:47       |
| <a id="stack"></a> `stack?`                    | `public`   | `string`                                            | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `Error.stack`           | node\_modules/typescript/lib/lib.es5.d.ts:1078 |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static`   | `number`                                            | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | `Error.stackTraceLimit` | node\_modules/@types/node/globals.d.ts:68      |

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
Error.captureStackTrace;
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
Error.prepareStackTrace;
```
