[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [resource](../../README.md) / [scope](../README.md) / Scope

# Interface: Scope\<T\>

Defined in: packages/octagonal-wheels/src/resource/scope.ts:5

A borrowed value and cleanup registrations owned by one execution.

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                   | Modifier   | Type | Description                                                                   | Defined in                                        |
| -------------------------- | ---------- | ---- | ----------------------------------------------------------------------------- | ------------------------------------------------- |
| <a id="value"></a> `value` | `readonly` | `T`  | The supplied value. Object identity and any deliberate sharing are preserved. | packages/octagonal-wheels/src/resource/scope.ts:7 |

## Methods

### defer()

```ts
defer(cleanup: () => Awaitable<void>): void;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:14

Registers cleanup to run once, in reverse registration order, after the operation settles.

Each result is awaited and failures do not skip remaining registrations. Register only
resources owned by this execution. Registration after closing has started throws.

#### Parameters

| Parameter | Type                                                  |
| --------- | ----------------------------------------------------- |
| `cleanup` | () => [`Awaitable`](../Awaitable/README.md)\<`void`\> |

#### Returns

`void`
