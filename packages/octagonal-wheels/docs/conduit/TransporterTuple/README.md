[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / TransporterTuple

# Type Alias: TransporterTuple\<T, U\>

```ts
type TransporterTuple<T, U> = [
  Proxied<T, U>,
  Caller<T, U>,
  TransportController,
];
```

Defined in: packages/octagonal-wheels/src/conduit/transporter.ts:27

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |
