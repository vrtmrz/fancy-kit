[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [resource](../README.md) / OwnedResource

# Interface: OwnedResource\<T\>

Defined in: packages/octagonal-wheels/src/resource.ts:26

A value and the explicit cleanup responsibility held by its owner.

## Extends

- [`DisposableResource`](../DisposableResource/README.md)

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                   | Modifier   | Type | Description                                                           | Defined in                                   |
| -------------------------- | ---------- | ---- | --------------------------------------------------------------------- | -------------------------------------------- |
| <a id="value"></a> `value` | `readonly` | `T`  | The original value, which need not have a disposal method of its own. | packages/octagonal-wheels/src/resource.ts:28 |

## Methods

### dispose()

```ts
dispose(): void | Promise<void>;
```

Defined in: packages/octagonal-wheels/src/resource.ts:22

Releases owned resources synchronously or returns their cleanup promise.
Await the result when cleanup may be asynchronous. Failures propagate;
repeated calls must not retry cleanup. Other operations after disposal
follow the concrete resource's contract.

#### Returns

`void` \| `Promise`\<`void`\>

#### Inherited from

[`DisposableResource`](../DisposableResource/README.md).[`dispose`](../DisposableResource/README.md#dispose)
