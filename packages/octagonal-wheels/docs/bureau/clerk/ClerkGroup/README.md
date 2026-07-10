[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [clerk](../README.md) / ClerkGroup

# Class: ClerkGroup\<T, U\>

Defined in: [src/bureau/Clerk.ts:170](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L170)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |
| `U` *extends* [`ClerkBase`](../ClerkBase/README.md)\<`T`\> |

## Constructors

### Constructor

```ts
new ClerkGroup<T, U>(params: ClerkGroupOption<T, U>): ClerkGroup<T, U>;
```

Defined in: [src/bureau/Clerk.ts:178](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L178)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ClerkGroupOption`](../ClerkGroupOption/README.md)\<`T`, `U`\> |

#### Returns

`ClerkGroup`\<`T`, `U`\>

## Properties

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_assigned"></a> `_assigned` | [`Inbox`](../../inbox/Inbox/README.md)\<`T`\> | `undefined` | [src/bureau/Clerk.ts:173](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L173) |
| <a id="_clerks"></a> `_clerks` | `U`[] | `undefined` | [src/bureau/Clerk.ts:171](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L171) |
| <a id="_hiredcount"></a> `_hiredCount` | `number` | `0` | [src/bureau/Clerk.ts:174](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L174) |
| <a id="_instantiate"></a> `_instantiate` | (`params`: [`ClerkOption`](../ClerkOption/README.md)\<`T`\>) => `U` | `undefined` | [src/bureau/Clerk.ts:176](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L176) |
| <a id="_job"></a> `_job` | (`item`: `T`) => `Promise`\<`any`\> | `undefined` | [src/bureau/Clerk.ts:175](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L175) |
| <a id="_namebase"></a> `_nameBase` | `string` | `undefined` | [src/bureau/Clerk.ts:172](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L172) |

## Accessors

### freeMembers

#### Get Signature

```ts
get freeMembers(): number;
```

Defined in: [src/bureau/Clerk.ts:231](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L231)

##### Returns

`number`

***

### stateDetail

#### Get Signature

```ts
get stateDetail(): ClerkStateDetail;
```

Defined in: [src/bureau/Clerk.ts:214](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L214)

##### Returns

`ClerkStateDetail`

## Methods

### adjustMemberCount()

```ts
adjustMemberCount(count: number): void;
```

Defined in: [src/bureau/Clerk.ts:202](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L202)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `count` | `number` |

#### Returns

`void`

***

### dispose()

```ts
dispose(): void;
```

Defined in: [src/bureau/Clerk.ts:235](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L235)

#### Returns

`void`

***

### fireMember()

```ts
fireMember(): void;
```

Defined in: [src/bureau/Clerk.ts:198](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L198)

#### Returns

`void`

***

### hireMember()

```ts
hireMember(params: ClerkOption<T>): void;
```

Defined in: [src/bureau/Clerk.ts:189](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/Clerk.ts#L189)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `params` | [`ClerkOption`](../ClerkOption/README.md)\<`T`\> |

#### Returns

`void`
