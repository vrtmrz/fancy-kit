[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Manifold

# Interface: Manifold\<T\>

Defined in: packages/octagonal-wheels/src/conduit/manifold.ts:13

Manifold
A manifold is a collection of functions that can be added, removed to invoke them with a set of arguments

## Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |

## Properties

| Property                     | Type                                       | Description                                                                                                                     | Defined in                                           |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| <a id="add"></a> `add`       | (`func`: `ManifoldFunc`\<`T`\>) => `void`  | Add a function to the manifold                                                                                                  | packages/octagonal-wheels/src/conduit/manifold.ts:19 |
| <a id="all"></a> `all`       | (...`args`: `T`) => `Promise`\<`boolean`\> | Invoke all associated functions until one returns false **Remarks** If no functions are in the manifold, this will return false | packages/octagonal-wheels/src/conduit/manifold.ts:65 |
| <a id="any"></a> `any`       | (...`args`: `T`) => `Promise`\<`boolean`\> | Invoke all associated functions until one returns true **Remarks** If no functions are in the manifold, this will return true   | packages/octagonal-wheels/src/conduit/manifold.ts:51 |
| <a id="clear"></a> `clear`   | () => `void`                               | Clear all functions from the manifold                                                                                           | packages/octagonal-wheels/src/conduit/manifold.ts:30 |
| <a id="every"></a> `every`   | (...`args`: `T`) => `Promise`\<`boolean`\> | Invoke all associated functions until one returns false **Remarks** If no functions are in the manifold, this will return true  | packages/octagonal-wheels/src/conduit/manifold.ts:58 |
| <a id="remove"></a> `remove` | (`func`: `ManifoldFunc`\<`T`\>) => `void`  | -                                                                                                                               | packages/octagonal-wheels/src/conduit/manifold.ts:25 |
| <a id="set"></a> `set`       | (`func`: `ManifoldFunc`\<`T`\>) => `void`  | **Remarks** This will clear all other functions from the manifold                                                               | packages/octagonal-wheels/src/conduit/manifold.ts:37 |
| <a id="some"></a> `some`     | (...`args`: `T`) => `Promise`\<`boolean`\> | Invoke all associated functions until one returns true **Remarks** If no functions are in the manifold, this will return false  | packages/octagonal-wheels/src/conduit/manifold.ts:44 |
