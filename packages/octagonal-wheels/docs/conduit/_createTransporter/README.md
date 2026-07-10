[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / \_createTransporter

# Function: \_createTransporter()

```ts
function _createTransporter<T, U>(
   emitter: TransporterBackbone<PayloadTypes<T, U>>, 
   name: string, 
forceTransportNo?: number): TransporterTuple<T, U>;
```

Defined in: [src/conduit/transporter.ts:66](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/transporter.ts#L66)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `emitter` | [`TransporterBackbone`](../TransporterBackbone/README.md)\<`PayloadTypes`\<`T`, `U`\>\> |
| `name` | `string` |
| `forceTransportNo?` | `number` |

## Returns

[`TransporterTuple`](../TransporterTuple/README.md)\<`T`, `U`\>
