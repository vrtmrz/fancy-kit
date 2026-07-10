[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [events](../README.md) / InterceptiveEventTarget

# Class: InterceptiveEventTarget

Defined in: [src/events/CustomEventTargets.ts:9](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/CustomEventTargets.ts#L9)

LinkedEventTarget is an EventTarget that can link to upstream and downstream EventTargets.
It will first try to dispatch the event upstream, and if that fails, it will dispatch it to itself.
If the event is not handled by itself or upstream, it will then dispatch it downstream.
If the event is not handled by any of the targets, it will return false.
Note: events should be cancelable for this to work properly.
If the event is not cancelable, it will always return true.

## Extends

- `EventTarget`

## Extended by

- [`LinkedEventTarget`](../LinkedEventTarget/README.md)
- [`GlobalChannelTarget`](../GlobalChannelTarget/README.md)

## Constructors

### Constructor

```ts
new InterceptiveEventTarget(onBeforeDispatch?: (event: Event) => boolean, onAfterDispatch?: (event: Event) => boolean): InterceptiveEventTarget;
```

Defined in: [src/events/CustomEventTargets.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/CustomEventTargets.ts#L13)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `onBeforeDispatch?` | (`event`: `Event`) => `boolean` |
| `onAfterDispatch?` | (`event`: `Event`) => `boolean` |

#### Returns

`InterceptiveEventTarget`

#### Overrides

```ts
EventTarget.constructor
```

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_onafterdispatch"></a> `_onAfterDispatch?` | (`event`: `Event`) => `boolean` | [src/events/CustomEventTargets.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/CustomEventTargets.ts#L11) |
| <a id="_onbeforedispatch"></a> `_onBeforeDispatch?` | (`event`: `Event`) => `boolean` | [src/events/CustomEventTargets.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/CustomEventTargets.ts#L10) |

## Methods

### addEventListener()

```ts
addEventListener(
   type: string, 
   callback: null | EventListenerOrEventListenerObject, 
   options?: boolean | AddEventListenerOptions): void;
```

Defined in: node\_modules/typescript/lib/lib.dom.d.ts:11569

The **`addEventListener()`** method of the EventTarget interface sets up a function that will be called whenever the specified event is delivered to the target.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/addEventListener)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `callback` | `null` \| `EventListenerOrEventListenerObject` |
| `options?` | `boolean` \| `AddEventListenerOptions` |

#### Returns

`void`

#### Inherited from

```ts
EventTarget.addEventListener
```

***

### dispatchEvent()

```ts
dispatchEvent(event: Event): boolean;
```

Defined in: [src/events/CustomEventTargets.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/events/CustomEventTargets.ts#L19)

The **`dispatchEvent()`** method of the EventTarget sends an Event to the object, (synchronously) invoking the affected event listeners in the appropriate order.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/dispatchEvent)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `event` | `Event` |

#### Returns

`boolean`

#### Overrides

```ts
EventTarget.dispatchEvent
```

***

### removeEventListener()

```ts
removeEventListener(
   type: string, 
   callback: null | EventListenerOrEventListenerObject, 
   options?: boolean | EventListenerOptions): void;
```

Defined in: node\_modules/typescript/lib/lib.dom.d.ts:11581

The **`removeEventListener()`** method of the EventTarget interface removes an event listener previously registered with EventTarget.addEventListener() from the target.

[MDN Reference](https://developer.mozilla.org/docs/Web/API/EventTarget/removeEventListener)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `type` | `string` |
| `callback` | `null` \| `EventListenerOrEventListenerObject` |
| `options?` | `boolean` \| `EventListenerOptions` |

#### Returns

`void`

#### Inherited from

```ts
EventTarget.removeEventListener
```
