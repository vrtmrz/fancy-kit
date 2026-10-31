[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkOption

# Type Alias: ClerkOption\<T\>

```ts
type ClerkOption<T> = ClerkOptionBase<T> & {
  job: (item: T) => Promise<any> | any;
};
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:17

## Type Declaration

### job

```ts
job: (item: T) => Promise<any> | any;
```

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `item`    | `T`  |

#### Returns

`Promise`\<`any`\> \| `any`

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |
