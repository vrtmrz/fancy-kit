[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [messagepassing](../../README.md) / [signal](../README.md) / waitForValue

# Function: waitForValue()

```ts
function waitForValue<T>(id: string, timeout?: number): Promise<WithTimeout<T>>;
```

Defined in: [src/bureau/SlipBoard.ts:242](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/SlipBoard.ts#L242)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Parameters

| Parameter | Type |
| ------ | ------ |
| `id` | `string` |
| `timeout?` | `number` |

## Returns

`Promise`\<[`WithTimeout`](../WithTimeout/README.md)\<`T`\>\>
