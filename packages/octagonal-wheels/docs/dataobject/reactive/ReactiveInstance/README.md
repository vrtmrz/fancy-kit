[**octagonal-wheels**](../../../README.md)

---

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

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:23

## Type Parameters

| Type Parameter |
| -------------- |
| `T`            |

## Properties

| Property                   | Modifier   | Type | Defined in                                                  |
| -------------------------- | ---------- | ---- | ----------------------------------------------------------- |
| <a id="value"></a> `value` | `readonly` | `T`  | packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:24 |

## Methods

### markClean()

```ts
markClean(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:26

#### Returns

`void`

---

### markDirty()

```ts
markDirty(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:25

#### Returns

`void`

---

### rippleChanged()

```ts
rippleChanged(): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/reactive\_v2.ts:27

#### Returns

`void`
