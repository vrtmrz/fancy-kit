[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [events](../README.md) / EventHub

# Class: EventHub\<Events\>

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:27

A class that provides an event hub for managing custom events.

## Type Parameters

| Type Parameter                    | Default type | Description                                                                                                                                                                   |
| --------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Events` _extends_ `AnyHubEvents` | `LSEvents`   | The type of events that the EventHub will handle. This type should be an object with event names as keys and event data types as values. This make all events strongly typed. |

## Constructors

### Constructor

```ts
new EventHub<Events>(emitter?: EventTarget): EventHub<Events>;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:38

Creates an instance of the EventHub.

#### Parameters

| Parameter  | Type          | Description                                                                                                                                                                                                                                             |
| ---------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `emitter?` | `EventTarget` | An optional EventTarget to use as the event emitter. If not provided, a dedicated new EventTarget will be created. i.e., it can share the same emitter with other EventHubs (e.g., for a global event bus, or separately built apps via window object). |

#### Returns

`EventHub`\<`Events`\>

## Methods

### emitEvent()

#### Call Signature

```ts
emitEvent<ET, K>(event: EventTypeWithoutData<ET, K>): void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:113

Emits an event without data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter | Type                                                                     | Description        |
| --------- | ------------------------------------------------------------------------ | ------------------ |
| `event`   | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to emit. |

##### Returns

`void`

#### Call Signature

```ts
emitEvent<ET, K>(event: EventTypeWithData<ET, K>, data: ET[K]): void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:122

Emits an event with data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter | Type                                                               | Description                     |
| --------- | ------------------------------------------------------------------ | ------------------------------- |
| `event`   | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\> | The event to emit.              |
| `data`    | `ET`\[`K`\]                                                        | data to include with the event. |

##### Returns

`void`

---

### off()

```ts
off<ET, K>(event: EventType<K>, callback?: CallableFunction): void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:176

Removes current event registrations in bulk.

Prefer the disposer returned by `on`, `onEvent`, `once`, or `onceEvent` when removing one registration.

#### Type Parameters

| Type Parameter                                 |
| ---------------------------------------------- |
| `ET` _extends_ `AnyHubEvents`                  |
| `K` _extends_ `string` \| `number` \| `symbol` |

#### Parameters

| Parameter   | Type                                         | Description                                                                                             |
| ----------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `event`     | [`EventType`](../EventType/README.md)\<`K`\> | The event whose registrations should be removed.                                                        |
| `callback?` | `CallableFunction`                           | The callback whose registrations should be removed. Omit it to remove every registration for the event. |

#### Returns

`void`

---

### offAll()

```ts
offAll(): void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:192

Removes all event listeners.

#### Returns

`void`

---

### on()

#### Call Signature

```ts
on<ET, K>(
   event: EventTypeWithoutData<ET, K>,
   callback: (e: Event) => void | Promise<void>,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:137

Registers an event listener for a specific event.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                                     | Description                                                                                           |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to listen for.                                                                              |
| `callback` | (`e`: `Event`) => `void` \| `Promise`\<`void`\>                          | The callback to execute when the event is triggered.                                                  |
| `options?` | `AddEventListenerOptions`                                                | Native `EventTarget` listener options. A supplied signal removes only this registration when aborted. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

#### Call Signature

```ts
on<ET, K>(
   event: EventTypeWithData<ET, K>,
   callback: (e: Event, data: ET[K]) => void | Promise<void>,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:152

Registers an event listener for a specific event.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                                 | Description                                                                                           |
| ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\>   | The event to listen for.                                                                              |
| `callback` | (`e`: `Event`, `data`: `ET`\[`K`\]) => `void` \| `Promise`\<`void`\> | The callback to execute when the event is triggered.                                                  |
| `options?` | `AddEventListenerOptions`                                            | Native `EventTarget` listener options. A supplied signal removes only this registration when aborted. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

---

### once()

#### Call Signature

```ts
once<ET, K>(
   event: EventTypeWithoutData<ET, K>,
   callback: (e: Event) => void,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:249

Registers a one-time event listener for a specific event.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                                     | Description                                                                           |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to listen for.                                                              |
| `callback` | (`e`: `Event`) => `void`                                                 | The callback to execute when the event is triggered.                                  |
| `options?` | `AddEventListenerOptions`                                                | Native `EventTarget` listener options. The `once` option is always treated as `true`. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

#### Call Signature

```ts
once<ET, K>(
   event: EventTypeWithData<ET, K>,
   callback: (e: Event, data: ET[K]) => void,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:264

Registers a one-time event listener for a specific event.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                               | Description                                                                           |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\> | The event to listen for.                                                              |
| `callback` | (`e`: `Event`, `data`: `ET`\[`K`\]) => `void`                      | The callback to execute when the event is triggered.                                  |
| `options?` | `AddEventListenerOptions`                                          | Native `EventTarget` listener options. The `once` option is always treated as `true`. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

---

### onceEvent()

#### Call Signature

```ts
onceEvent<ET, K>(
   event: EventTypeWithoutData<ET, K>,
   callback: () => void,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:287

Registers a one-time event listener for a specific event, with a callback that only receives the event data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                                     | Description                                                                           |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to listen for.                                                              |
| `callback` | () => `void`                                                             | The callback to execute when the event is triggered.                                  |
| `options?` | `AddEventListenerOptions`                                                | Native `EventTarget` listener options. The `once` option is always treated as `true`. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

#### Call Signature

```ts
onceEvent<ET, K>(
   event: EventTypeWithData<ET, K>,
   callback: (data: ET[K]) => void,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:302

Registers a one-time event listener for a specific event, with a callback that only receives the event data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                               | Description                                                                           |
| ---------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\> | The event to listen for.                                                              |
| `callback` | (`data`: `ET`\[`K`\]) => `void`                                    | The callback to execute when the event is triggered.                                  |
| `options?` | `AddEventListenerOptions`                                          | Native `EventTarget` listener options. The `once` option is always treated as `true`. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

---

### onEvent()

#### Call Signature

```ts
onEvent<ET, K>(
   event: EventTypeWithoutData<ET, K>,
   callback: () => any,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:208

Registers an event listener for a specific event, with a callback that only receives the event data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                                     | Description                                                                                           |
| ---------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to listen for.                                                                              |
| `callback` | () => `any`                                                              | The callback to execute when the event is triggered.                                                  |
| `options?` | `AddEventListenerOptions`                                                | Native `EventTarget` listener options. A supplied signal removes only this registration when aborted. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

#### Call Signature

```ts
onEvent<ET, K>(
   event: EventTypeWithData<ET, K>,
   callback: (data: ET[K]) => any,
   options?: AddEventListenerOptions): () => void;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:223

Registers an event listener for a specific event, with a callback that only receives the event data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter  | Type                                                               | Description                                                                                           |
| ---------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `event`    | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\> | The event to listen for.                                                                              |
| `callback` | (`data`: `ET`\[`K`\]) => `any`                                     | The callback to execute when the event is triggered.                                                  |
| `options?` | `AddEventListenerOptions`                                          | Native `EventTarget` listener options. A supplied signal removes only this registration when aborted. |

##### Returns

An idempotent function that removes only this registration.

() => `void`

---

### waitFor()

#### Call Signature

```ts
waitFor<ET, K>(event: EventTypeWithoutData<ET, K>): Promise<null>;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:323

Waits for a specific event to be emitted.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter | Type                                                                     | Description            |
| --------- | ------------------------------------------------------------------------ | ---------------------- |
| `event`   | [`EventTypeWithoutData`](../EventTypeWithoutData/README.md)\<`ET`, `K`\> | The event to wait for. |

##### Returns

`Promise`\<`null`\>

A Promise that resolves with null.

#### Call Signature

```ts
waitFor<ET, K>(event: EventTypeWithData<ET, K>): Promise<ET[K]>;
```

Defined in: packages/octagonal-wheels/src/events/EventHub.ts:332

Waits for a specific event to be emitted and returns a promise that resolves with the event data.

##### Type Parameters

| Type Parameter                                 | Description           |
| ---------------------------------------------- | --------------------- |
| `ET` _extends_ `AnyHubEvents`                  | The type of events.   |
| `K` _extends_ `string` \| `number` \| `symbol` | The key of the event. |

##### Parameters

| Parameter | Type                                                               | Description            |
| --------- | ------------------------------------------------------------------ | ---------------------- |
| `event`   | [`EventTypeWithData`](../EventTypeWithData/README.md)\<`ET`, `K`\> | The event to wait for. |

##### Returns

`Promise`\<`ET`\[`K`\]\>

A promise that resolves with the event data.
