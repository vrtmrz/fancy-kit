[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [encoding](../README.md) / JsonCompatible

# Type Alias: JsonCompatible\<T\>

```ts
type JsonCompatible<T> = T extends string | number | boolean | null
  ? T
  : T extends ((...args: never[]) => unknown) | ((...args: never[]) => unknown)
    ? never
    : T extends readonly unknown[]
      ? { [K in keyof T]: JsonCompatible<T[K]> }
      : T extends object
        ? { [K in keyof T]: JsonCompatible<T[K]> }
        : never;
```

Defined in: packages/octagonal-wheels/src/encoding/json.ts:10

Recursively retains JSON-data properties and rejects non-data values.

Ordinary interfaces, optional properties, readonly arrays, and tuples retain
their shape without requiring a string index signature. This is a compile-time
constraint; numbers still admit NaN and infinities, and cycles are not detected.

## Type Parameters

| Type Parameter | Description                                               |
| -------------- | --------------------------------------------------------- |
| `T`            | The input shape whose properties are checked recursively. |
