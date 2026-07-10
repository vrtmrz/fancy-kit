[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [computed](../README.md) / Computed

# Class: Computed\<T, U\>

Defined in: [src/dataobject/Computed.ts:43](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L43)

A class that computes a value based on provided arguments and caches the result.
The computation is only re-evaluated when the arguments change or when a forced update is requested.
Mostly similar to 'Refiner', but simpler implementation and features.
This class is designed for:
- Caching computed values based on arguments.
Not designed for:
- Reactive updates or subscriptions. (Use Refiner for that).

## Extended by

- [`ResolvedComputed`](../ResolvedComputed/README.md)

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Constructors

### Constructor

```ts
new Computed<T, U>(params: ComputedOptions<T, U>): Computed<T, U>;
```

Defined in: [src/dataobject/Computed.ts:86](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L86)

Creates an instance of Computed.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `params` | [`ComputedOptions`](../ComputedOptions/README.md)\<`T`, `U`\> | Parameters for the Computed instance. |

#### Returns

`Computed`\<`T`, `U`\>

## Accessors

### value

#### Get Signature

```ts
get value(): null | U;
```

Defined in: [src/dataobject/Computed.ts:157](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L157)

Gets the current computed value. if the last evaluation resulted in an error, it throws that error.
If never evaluated, it returns null. (because we cannot define a default value).

##### Returns

`null` \| `U`

The computed value.

## Methods

### reset()

```ts
reset(): void;
```

Defined in: [src/dataobject/Computed.ts:136](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L136)

Resets the cached arguments and result.
If called, the next update will always re-evaluate the computation.

#### Returns

`void`

***

### update()

```ts
update(...args: T): Promise<ResolvedComputed<T, U>>;
```

Defined in: [src/dataobject/Computed.ts:147](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L147)

Updates the computed value and returns the instance.
(Convenience method)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `T` | The current arguments. |

#### Returns

`Promise`\<[`ResolvedComputed`](../ResolvedComputed/README.md)\<`T`, `U`\>\>

The Computed instance (but value is guaranteed to be resolved).

***

### updateValue()

```ts
updateValue(...args: T): Promise<boolean>;
```

Defined in: [src/dataobject/Computed.ts:101](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L101)

Updates the computed value if necessary.
if requiresUpdate and  throws something, this method will reject with that error.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `T` | The current arguments. |

#### Returns

`Promise`\<`boolean`\>

True if the value was updated, false otherwise.
