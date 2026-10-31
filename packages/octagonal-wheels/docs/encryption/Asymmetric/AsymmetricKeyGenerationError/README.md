[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [encryption](../../README.md) / [Asymmetric](../README.md) / AsymmetricKeyGenerationError

# Class: AsymmetricKeyGenerationError

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/common.ts:77

## Extends

- [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md)

## Constructors

### Constructor

```ts
new AsymmetricKeyGenerationError(message: string, baseError?: any): AsymmetricKeyGenerationError;
```

Defined in: packages/octagonal-wheels/src/encryption/asymmetric/common.ts:51

#### Parameters

| Parameter    | Type     |
| ------------ | -------- |
| `message`    | `string` |
| `baseError?` | `any`    |

#### Returns

`AsymmetricKeyGenerationError`

#### Inherited from

[`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`constructor`](../AsymmetricEncryptionErrorBase/README.md#constructor)

## Properties

| Property                                       | Modifier | Type     | Default value                    | Description                                                                                                                                                                                                                                                                                                                                                                                                                                       | Overrides                                                                                                                               | Inherited from                                                                                                                                                | Defined in                                                       |
| ---------------------------------------------- | -------- | -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| <a id="message"></a> `message`                 | `public` | `string` | `undefined`                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                                                                                                                       | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`message`](../AsymmetricEncryptionErrorBase/README.md#message)                 | node\_modules/typescript/lib/lib.es5.d.ts:1077                   |
| <a id="name"></a> `name`                       | `public` | `string` | `"AsymmetricKeyGenerationError"` | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`name`](../AsymmetricEncryptionErrorBase/README.md#name) | -                                                                                                                                                             | packages/octagonal-wheels/src/encryption/asymmetric/common.ts:78 |
| <a id="stack"></a> `stack?`                    | `public` | `string` | `undefined`                      | -                                                                                                                                                                                                                                                                                                                                                                                                                                                 | -                                                                                                                                       | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`stack`](../AsymmetricEncryptionErrorBase/README.md#stack)                     | node\_modules/typescript/lib/lib.es5.d.ts:1078                   |
| <a id="stacktracelimit"></a> `stackTraceLimit` | `static` | `number` | `undefined`                      | The `Error.stackTraceLimit` property specifies the number of stack frames collected by a stack trace (whether generated by `new Error().stack` or `Error.captureStackTrace(obj)`). The default value is `10` but may be set to any valid JavaScript number. Changes will affect any stack trace captured _after_ the value has been changed. If set to a non-number value, or set to a negative number, stack traces will not capture any frames. | -                                                                                                                                       | [`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`stackTraceLimit`](../AsymmetricEncryptionErrorBase/README.md#stacktracelimit) | node\_modules/@types/node/globals.d.ts:68                        |

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

[`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`captureStackTrace`](../AsymmetricEncryptionErrorBase/README.md#capturestacktrace)

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

[`AsymmetricEncryptionErrorBase`](../AsymmetricEncryptionErrorBase/README.md).[`prepareStackTrace`](../AsymmetricEncryptionErrorBase/README.md#preparestacktrace)
