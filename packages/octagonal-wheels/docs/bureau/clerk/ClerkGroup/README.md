[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkGroup

# Class: ClerkGroup\<T, U\>

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:170

## Type Parameters

| Type Parameter                                             |
| ---------------------------------------------------------- |
| `T`                                                        |
| `U` _extends_ [`ClerkBase`](../ClerkBase/README.md)\<`T`\> |

## Constructors

### Constructor

```ts
new ClerkGroup<T, U>(params: ClerkGroupOption<T, U>): ClerkGroup<T, U>;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:178

#### Parameters

| Parameter | Type                                                            |
| --------- | --------------------------------------------------------------- |
| `params`  | [`ClerkGroupOption`](../ClerkGroupOption/README.md)\<`T`, `U`\> |

#### Returns

`ClerkGroup`\<`T`, `U`\>

## Properties

| Property                                 | Type                                                                | Default value | Defined in                                        |
| ---------------------------------------- | ------------------------------------------------------------------- | ------------- | ------------------------------------------------- |
| <a id="_assigned"></a> `_assigned`       | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\>                       | `undefined`   | packages/octagonal-wheels/src/bureau/Clerk.ts:173 |
| <a id="_clerks"></a> `_clerks`           | `U`[]                                                               | `undefined`   | packages/octagonal-wheels/src/bureau/Clerk.ts:171 |
| <a id="_hiredcount"></a> `_hiredCount`   | `number`                                                            | `0`           | packages/octagonal-wheels/src/bureau/Clerk.ts:174 |
| <a id="_instantiate"></a> `_instantiate` | (`params`: [`ClerkOption`](../ClerkOption/README.md)\<`T`\>) => `U` | `undefined`   | packages/octagonal-wheels/src/bureau/Clerk.ts:176 |
| <a id="_job"></a> `_job`                 | (`item`: `T`) => `Promise`\<`any`\>                                 | `undefined`   | packages/octagonal-wheels/src/bureau/Clerk.ts:175 |
| <a id="_namebase"></a> `_nameBase`       | `string`                                                            | `undefined`   | packages/octagonal-wheels/src/bureau/Clerk.ts:172 |

## Accessors

### freeMembers

#### Get Signature

```ts
get freeMembers(): number;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:231

##### Returns

`number`

---

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:214

##### Returns

`ClerkStateDetail`

## Methods

### adjustMemberCount()

```ts
adjustMemberCount(count: number): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:202

#### Parameters

| Parameter | Type     |
| --------- | -------- |
| `count`   | `number` |

#### Returns

`void`

---

### dispose()

```ts
dispose(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:235

#### Returns

`void`

---

### fireMember()

```ts
fireMember(): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:198

#### Returns

`void`

---

### hireMember()

```ts
hireMember(params: ClerkOption<T>): void;
```

Defined in: packages/octagonal-wheels/src/bureau/Clerk.ts:189

#### Parameters

| Parameter | Type                                             |
| --------- | ------------------------------------------------ |
| `params`  | [`ClerkOption`](../ClerkOption/README.md)\<`T`\> |

#### Returns

`void`
