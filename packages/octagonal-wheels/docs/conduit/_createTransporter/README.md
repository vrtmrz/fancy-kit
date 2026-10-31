[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / \_createTransporter

# Function: \_createTransporter()

```ts
function _createTransporter<T, U>(
  emitter: TransporterBackbone<PayloadTypes<T, U>>,
  name: string,
  forceTransportNo?: number,
): TransporterTuple<T, U>;
```

Defined in: packages/octagonal-wheels/src/conduit/transporter.ts:66

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

## Parameters

| Parameter           | Type                                                                                    |
| ------------------- | --------------------------------------------------------------------------------------- |
| `emitter`           | [`TransporterBackbone`](../TransporterBackbone/README.md)\<`PayloadTypes`\<`T`, `U`\>\> |
| `name`              | `string`                                                                                |
| `forceTransportNo?` | `number`                                                                                |

## Returns

[`TransporterTuple`](../TransporterTuple/README.md)\<`T`, `U`\>
