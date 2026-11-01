[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [collection](../README.md) / range

# Function: range()

```ts
function range(from: number, to: number): Generator<number, void, unknown>;
```

Defined in: packages/octagonal-wheels/src/collection.array.ts:33

Generates a sequence of numbers from `from` to `to` (inclusive).

## Parameters

| Parameter | Type     | Description                          |
| --------- | -------- | ------------------------------------ |
| `from`    | `number` | The starting number of the sequence. |
| `to`      | `number` | The ending number of the sequence.   |

## Returns

`Generator`\<`number`, `void`, `unknown`\>

## Yields

The next number in the sequence.
