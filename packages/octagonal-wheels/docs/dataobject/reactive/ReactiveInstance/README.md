[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [reactive](../README.md) / ReactiveInstance

# Type Alias: ReactiveInstance\<T\>

```ts
type ReactiveInstance<T> = {
  value: T;
  markClean: void;
  markDirty: void;
  rippleChanged: void;
};
```

Defined in: [src/dataobject/reactive\_v2.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L23)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="value"></a> `value` | `readonly` | `T` | [src/dataobject/reactive\_v2.ts:24](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L24) |

## Methods

### markClean()

```ts
markClean(): void;
```

Defined in: [src/dataobject/reactive\_v2.ts:26](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L26)

#### Returns

`void`

***

### markDirty()

```ts
markDirty(): void;
```

Defined in: [src/dataobject/reactive\_v2.ts:25](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L25)

#### Returns

`void`

***

### rippleChanged()

```ts
rippleChanged(): void;
```

Defined in: [src/dataobject/reactive\_v2.ts:27](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/reactive_v2.ts#L27)

#### Returns

`void`
