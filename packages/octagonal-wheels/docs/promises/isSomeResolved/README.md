[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / isSomeResolved

# Function: isSomeResolved()

```ts
function isSomeResolved(promises: Promise<unknown>[]): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/promises.ts:30

Checking whether some promises have been resolved.

## Parameters

| Parameter  | Type                     | Description       |
| ---------- | ------------------------ | ----------------- |
| `promises` | `Promise`\<`unknown`\>[] | checking promises |

## Returns

`Promise`\<`boolean`\>

true if some promises have been resolved, false if not.
