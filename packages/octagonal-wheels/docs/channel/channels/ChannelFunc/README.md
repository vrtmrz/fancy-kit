[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [channel](../../README.md) / [channels](../README.md) / ChannelFunc

# Type Alias: ChannelFunc()\<T, U\>

```ts
type ChannelFunc<T, U> = (...args: T) => Promise<Awaited<U>>;
```

Defined in: [src/channel/channels.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/channel/channels.ts#L23)

Function type for channel registration and invocation

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

`Promise`\<`Awaited`\<`U`\>\>
