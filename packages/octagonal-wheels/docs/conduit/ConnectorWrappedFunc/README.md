[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / ConnectorWrappedFunc

# Type Alias: ConnectorWrappedFunc()\<T, U\>

```ts
type ConnectorWrappedFunc<T, U> = (...args: T) => U | Promise<Awaited<U>>;
```

Defined in: [src/conduit/connector.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L13)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `T` |

## Returns

`U` \| `Promise`\<`Awaited`\<`U`\>\>
