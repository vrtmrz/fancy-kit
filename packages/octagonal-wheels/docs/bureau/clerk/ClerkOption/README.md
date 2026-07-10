[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkOption

# Type Alias: ClerkOption\<T\>

```ts
type ClerkOption<T> = ClerkOptionBase<T> & {
  job: (item: T) => Promise<any> | any;
};
```

Defined in: [src/bureau/Clerk.ts:17](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L17)

## Type Declaration

### job()

```ts
job: (item: T) => Promise<any> | any;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`Promise`\<`any`\> \| `any`

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
