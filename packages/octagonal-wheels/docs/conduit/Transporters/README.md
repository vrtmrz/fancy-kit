[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Transporters

# Variable: Transporters

```ts
const Transporters: {
  of: TransporterTuple<T, U>;
};
```

Defined in: packages/octagonal-wheels/src/conduit/transporter.ts:272

## Type Declaration

### of()

```ts
of<T, U>(name: string): TransporterTuple<T, U>;
```

#### Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `name`    | `string` |

#### Returns

[`TransporterTuple`](../TransporterTuple/README.md)\<`T`, `U`\>
