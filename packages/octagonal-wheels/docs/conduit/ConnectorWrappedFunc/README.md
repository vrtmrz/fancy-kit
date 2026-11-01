[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / ConnectorWrappedFunc

# Type Alias: ConnectorWrappedFunc\<T, U\>

```ts
type ConnectorWrappedFunc<T, U> = (...args: T) => U | Promise<Awaited<U>>;
```

Defined in: packages/octagonal-wheels/src/conduit/connector.ts:13

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

## Parameters

| Parameter | Type |
| --------- | ---- |
| ...`args` | `T`  |

## Returns

`U` \| `Promise`\<`Awaited`\<`U`\>\>
