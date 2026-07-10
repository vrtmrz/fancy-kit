[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [actor](../README.md) / Actor

# Abstract Class: Actor\<T\>

Defined in: [src/actor.ts:94](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L94)

Represents an abstract class for an actor.

## Extended by

- [`LogActorBase`](../LogActorBase/README.md)

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | The type of the message that the actor can process. |

## Constructors

### Constructor

```ts
new Actor<T>(params: {
  multiInstance?: boolean;
  name?: string;
}): Actor<T>;
```

Defined in: [src/actor.ts:115](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L115)

Initializes a new instance of the Actor class.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | \{ `multiInstance?`: `boolean`; `name?`: `string`; \} | The parameters for the actor. |
| `params.multiInstance?` | `boolean` | Indicates whether the actor is a multi-instance. The default value is false. If true, the actor can have multiple instances to process each message concurrently. |
| `params.name?` | `string` | The name of the actor. It will be the class name if not provided. |

#### Returns

`Actor`\<`T`\>

## Properties

| Property | Modifier | Type | Default value | Description | Defined in |
| ------ | ------ | ------ | ------ | ------ | ------ |
| <a id="__process"></a> `__process` | `public` | `undefined` \| `Promise`\<`void`\> | `undefined` | - | [src/actor.ts:136](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L136) |
| <a id="_busy"></a> `_busy` | `public` | `boolean` | `false` | - | [src/actor.ts:121](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L121) |
| <a id="multiinstance"></a> `multiInstance` | `readonly` | `boolean` | `undefined` | Indicates whether the actor is a multi-instance. | [src/actor.ts:102](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L102) |
| <a id="name"></a> `name` | `readonly` | `string` | `undefined` | The name of the actor. | [src/actor.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L98) |
| <a id="hub"></a> `hub` | `static` | [`ActorHub`](../ActorHub/README.md)\<`any`\> | `undefined` | Represents the hub for actors. | [src/actor.ts:107](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L107) |

## Methods

### \_enqueue()

```ts
_enqueue(message: T): void;
```

Defined in: [src/actor.ts:139](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L139)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `T` |

#### Returns

`void`

***

### \_process()

```ts
_process(message: T): Promise<void>;
```

Defined in: [src/actor.ts:122](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L122)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `message` | `T` |

#### Returns

`Promise`\<`void`\>

***

### destroy()

```ts
destroy(): void;
```

Defined in: [src/actor.ts:190](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L190)

Destroys the actor instance.

#### Returns

`void`

***

### dispatch()

```ts
dispatch<U, V>(actor: {
(params: {
  multiInstance?: boolean;
  name?: string;
}): Actor<V>;
  hub: ActorHub<any>;
  prototype: Actor<any>;
}, message: U): void;
```

Defined in: [src/actor.ts:183](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L183)

Dispatches a message to the specified actor.
Utility method to dispatch a message to the actor, which is the subsequent actor of the current actor.
Just for hiding the hub from the derived class.

#### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `U` | The type of the message. |
| `V` | The type of the actor. |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `actor` | \{ (`params`: \{ `multiInstance?`: `boolean`; `name?`: `string`; \}): `Actor`\<`V`\>; `hub`: [`ActorHub`](../ActorHub/README.md)\<`any`\>; `prototype`: `Actor`\<`any`\>; \} | The actor to dispatch the message to. |
| `actor.hub` | [`ActorHub`](../ActorHub/README.md)\<`any`\> | Represents the hub for actors. |
| `actor.prototype` | `Actor`\<`any`\> | - |
| `message` | `U` | The message to be dispatched. |

#### Returns

`void`

***

### post()

```ts
post(message: T): void;
```

Defined in: [src/actor.ts:161](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L161)

Dispatches a message to the actor.
Note: Even if we posted messages to the specific actor, the message will be processed by some actor instances if the actor is a multi-instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `T` | The message to be dispatched. |

#### Returns

`void`

***

### postToThisInstance()

```ts
postToThisInstance(message: T): void;
```

Defined in: [src/actor.ts:170](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L170)

Posts a message to this actor instance.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `T` | The message to be posted. |

#### Returns

`void`

***

### process()

```ts
abstract process(message: T): void | Promise<void>;
```

Defined in: [src/actor.ts:154](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/actor.ts#L154)

Processes a message. This method should be overridden in the derived class. Automatically called when a message is dispatched to the actor.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `message` | `T` | The message to be processed. |

#### Returns

`void` \| `Promise`\<`void`\>
