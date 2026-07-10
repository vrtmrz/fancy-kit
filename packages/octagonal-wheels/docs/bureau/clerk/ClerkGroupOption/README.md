[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkGroupOption

# Type Alias: ClerkGroupOption\<T, U\>

```ts
type ClerkGroupOption<T, U> = ClerkOptionBase<T> & {
  initialMemberCount: number;
  instantiate: (params: ClerkOption<T>) => U;
  job: (item: T) => Promise<any> | any;
};
```

Defined in: [src/bureau/Clerk.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L21)

## Type Declaration

### initialMemberCount

```ts
initialMemberCount: number;
```

### instantiate()

```ts
instantiate: (params: ClerkOption<T>) => U;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ClerkOption`](../ClerkOption/README.md)\<`T`\> |

#### Returns

`U`

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
| `U` *extends* [`ClerkBase`](../ClerkBase/README.md)\<`T`\> |
