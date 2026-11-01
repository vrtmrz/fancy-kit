[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [promises](../README.md) / isResolved

# Function: isResolved()

```ts
function isResolved(promise: Promise<unknown>): Promise<boolean>;
```

Defined in: packages/octagonal-wheels/src/promises.ts:22

Checking whether a promise has been resolved.

## Parameters

| Parameter | Type                   | Description        |
| --------- | ---------------------- | ------------------ |
| `promise` | `Promise`\<`unknown`\> | a checking promise |

## Returns

`Promise`\<`boolean`\>

true if resolved, false if not.
