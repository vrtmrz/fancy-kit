[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [actor](../README.md) / ActorHub

# Class: ActorHub\<T\>

Defined in: [src/actor.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L11)

Represents a hub for managing actors.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the message that can be dispatched to actors. |

## Constructors

### Constructor

```ts
new ActorHub<T>(): ActorHub<T>;
```

Defined in: [src/actor.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L12)

#### Returns

`ActorHub`\<`T`\>

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_actormap"></a> `_actorMap` | `Map`\<`string`, [`Actor`](../Actor/README.md)\<`T`\>[]\> | Represents a map of actors. The key is a name of actors, and the value is an array of actors of type T. Exposed for testing purposes. Do not use it directly. | [src/actor.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L21) |
| <a id="_actorrrindex"></a> `_actorRRIndex` | `Map`\<`string`, `number`\> | Represents a map of round-robin indexes for actors. The key is a name of actors, and the value is an index of the actor in the array of actors of type T. Exposed for testing purposes. Do not use it directly. | [src/actor.ts:28](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L28) |

## Methods

### add()

```ts
add(actor: Actor<T>): void;
```

Defined in: [src/actor.ts:35](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L35)

Adds an actor to be managed by the hub.
This method is used internally by the Actor class, but it can be used if you are sure and want to make an original and custom actor.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `actor` | [`Actor`](../Actor/README.md)\<`T`\> | The actor to be added. |

#### Returns

`void`

***

### dispatch()

```ts
dispatch(actorName: string, message: T): void;
```

Defined in: [src/actor.ts:63](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `actorName` | `string` |
| `message` | `T` |

#### Returns

`void`

***

### remove()

```ts
remove(actor: Actor<T>): void;
```

Defined in: [src/actor.ts:54](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L54)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `actor` | [`Actor`](../Actor/README.md)\<`T`\> |

#### Returns

`void`
