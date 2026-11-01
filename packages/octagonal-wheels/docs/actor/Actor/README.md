[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [actor](../README.md) / Actor

# Abstract Class: Actor\<T\>

Defined in: packages/octagonal-wheels/src/actor.ts:94

Represents an abstract class for an actor.

## Extended by

- [`LogActorBase`](../LogActorBase/README.md)

## Type Parameters

| Type Parameter | Description                                         |
| -------------- | --------------------------------------------------- |
| `T`            | The type of the message that the actor can process. |

## Constructors

### Constructor

```ts
new Actor<T>(params?: {
  multiInstance?: boolean;
  name?: string;
}): Actor<T>;
```

Defined in: packages/octagonal-wheels/src/actor.ts:115

Initializes a new instance of the Actor class.

#### Parameters

| Parameter               | Type                                                  | Description                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `params`                | \{ `multiInstance?`: `boolean`; `name?`: `string`; \} | The parameters for the actor.                                                                                                                                     |
| `params.multiInstance?` | `boolean`                                             | Indicates whether the actor is a multi-instance. The default value is false. If true, the actor can have multiple instances to process each message concurrently. |
| `params.name?`          | `string`                                              | The name of the actor. It will be the class name if not provided.                                                                                                 |

#### Returns

`Actor`\<`T`\>

## Properties

| Property                                   | Modifier   | Type                                         | Default value | Description                                      | Defined in                                 |
| ------------------------------------------ | ---------- | -------------------------------------------- | ------------- | ------------------------------------------------ | ------------------------------------------ |
| <a id="__process"></a> `__process`         | `public`   | `Promise`\<`void`\> \| `undefined`           | `undefined`   | -                                                | packages/octagonal-wheels/src/actor.ts:136 |
| <a id="_busy"></a> `_busy`                 | `public`   | `boolean`                                    | `false`       | -                                                | packages/octagonal-wheels/src/actor.ts:121 |
| <a id="multiinstance"></a> `multiInstance` | `readonly` | `boolean`                                    | `undefined`   | Indicates whether the actor is a multi-instance. | packages/octagonal-wheels/src/actor.ts:102 |
| <a id="name"></a> `name`                   | `readonly` | `string`                                     | `undefined`   | The name of the actor.                           | packages/octagonal-wheels/src/actor.ts:98  |
| <a id="hub"></a> `hub`                     | `static`   | [`ActorHub`](../ActorHub/README.md)\<`any`\> | `undefined`   | Represents the hub for actors.                   | packages/octagonal-wheels/src/actor.ts:107 |

## Methods

### \_enqueue()

```ts
_enqueue(message: T): void;
```

Defined in: packages/octagonal-wheels/src/actor.ts:139

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `message` | `T`  |

#### Returns

`void`

---

### \_process()

```ts
_process(message: T): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/actor.ts:122

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `message` | `T`  |

#### Returns

`Promise`\<`void`\>

---

### destroy()

```ts
destroy(): void;
```

Defined in: packages/octagonal-wheels/src/actor.ts:189

Destroys the actor instance.

#### Returns

`void`

---

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

Defined in: packages/octagonal-wheels/src/actor.ts:182

Dispatches a message to the specified actor.
Utility method to dispatch a message to the actor, which is the subsequent actor of the current actor.
Just for hiding the hub from the derived class.

#### Type Parameters

| Type Parameter | Description              |
| -------------- | ------------------------ |
| `U`            | The type of the message. |
| `V`            | The type of the actor.   |

#### Parameters

| Parameter         | Type                                                                                                                                                                         | Description                           |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `actor`           | \{ (`params`: \{ `multiInstance?`: `boolean`; `name?`: `string`; \}): `Actor`\<`V`\>; `hub`: [`ActorHub`](../ActorHub/README.md)\<`any`\>; `prototype`: `Actor`\<`any`\>; \} | The actor to dispatch the message to. |
| `actor.hub`       | [`ActorHub`](../ActorHub/README.md)\<`any`\>                                                                                                                                 | Represents the hub for actors.        |
| `actor.prototype` | `Actor`\<`any`\>                                                                                                                                                             | -                                     |
| `message`         | `U`                                                                                                                                                                          | The message to be dispatched.         |

#### Returns

`void`

---

### post()

```ts
post(message: T): void;
```

Defined in: packages/octagonal-wheels/src/actor.ts:160

Dispatches a message to the actor.
Note: Even if we posted messages to the specific actor, the message will be processed by some actor instances if the actor is a multi-instance.

#### Parameters

| Parameter | Type | Description                   |
| --------- | ---- | ----------------------------- |
| `message` | `T`  | The message to be dispatched. |

#### Returns

`void`

---

### postToThisInstance()

```ts
postToThisInstance(message: T): void;
```

Defined in: packages/octagonal-wheels/src/actor.ts:169

Posts a message to this actor instance.

#### Parameters

| Parameter | Type | Description               |
| --------- | ---- | ------------------------- |
| `message` | `T`  | The message to be posted. |

#### Returns

`void`

---

### process()

```ts
abstract process(message: T): void | Promise<void>;
```

Defined in: packages/octagonal-wheels/src/actor.ts:153

Processes a message. This method should be overridden in the derived class. Automatically called when a message is dispatched to the actor.

#### Parameters

| Parameter | Type | Description                  |
| --------- | ---- | ---------------------------- |
| `message` | `T`  | The message to be processed. |

#### Returns

`void` \| `Promise`\<`void`\>
