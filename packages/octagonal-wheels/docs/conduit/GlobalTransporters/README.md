[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / GlobalTransporters

# Variable: GlobalTransporters

```ts
const GlobalTransporters: {
  of: TransporterTuple<T, U>;
};
```

Defined in: [src/conduit/transporter.ts:281](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporter.ts#L281)

## Type Declaration

### of()

```ts
of<T, U>(name: string): TransporterTuple<T, U>;
```

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `name` | `string` |

#### Returns

[`TransporterTuple`](../TransporterTuple/README.md)\<`T`, `U`\>
