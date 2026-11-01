[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [encoding](../README.md) / cloneViaJSON

# Function: cloneViaJSON()

```ts
function cloneViaJSON<T, U>(value: T & JsonCompatible<T>): U;
```

Defined in: packages/octagonal-wheels/src/encoding/json.ts:39

Clones JSON data by serialising it and parsing the resulting text.

## Type Parameters

| Type Parameter | Default type | Description                                                  |
| -------------- | ------------ | ------------------------------------------------------------ |
| `T`            | -            | JSON-data input, checked recursively for unsupported values. |
| `U`            | `T`          | Caller-selected output type; defaults to the input type.     |

## Parameters

| Parameter | Type                                                         | Description                       |
| --------- | ------------------------------------------------------------ | --------------------------------- |
| `value`   | `T` & [`JsonCompatible`](../JsonCompatible/README.md)\<`T`\> | JSON data to serialise and parse. |

## Returns

`U`

The parsed JSON representation. An explicit U is a caller assertion,
not a runtime conversion or validation of that type.

## Throws

TypeError When native JSON serialisation rejects the runtime value,
such as for a circular reference or an unhandled bigint.

## Throws

SyntaxError When serialisation returns no JSON text and parsing fails.

## Remarks

The constraint rejects Date, functions, bigint, symbols, and root undefined
in typed calls. Runtime behaviour remains native JSON.parse(JSON.stringify()).
JavaScript callers and explicit assertions can bypass the constraint. Values
outside JSON's representable range retain native behaviour: NaN and infinities
become null. Prototypes and shared references are not preserved; runtime
undefined object fields disappear and toJSON hooks still run if supplied.
