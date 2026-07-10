[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [computed](../README.md) / ResolvedComputed

# Interface: ResolvedComputed\<T, U\>

Defined in: [src/dataobject/Computed.ts:30](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L30)

A class that computes a value based on provided arguments and caches the result.
The computation is only re-evaluated when the arguments change or when a forced update is requested.
Mostly similar to 'Refiner', but simpler implementation and features.
This class is designed for:
- Caching computed values based on arguments.
Not designed for:
- Reactive updates or subscriptions. (Use Refiner for that).

## Extends

- [`Computed`](../Computed/README.md)\<`T`, `U`\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Properties

| Property | Type | Description | Overrides | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="value"></a> `value` | `U` | Gets the current computed value. if the last evaluation resulted in an error, it throws that error. If never evaluated, it returns null. (because we cannot define a default value). | [`Computed`](../Computed/README.md).[`value`](../Computed/README.md#value) | [src/dataobject/Computed.ts:31](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/dataobject/Computed.ts#L31) |

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

#### Inherited from

[`Computed`](../Computed/README.md).[`reset`](../Computed/README.md#reset)

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

`Promise`\<`ResolvedComputed`\<`T`, `U`\>\>

The Computed instance (but value is guaranteed to be resolved).

#### Inherited from

[`Computed`](../Computed/README.md).[`update`](../Computed/README.md#update)

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

#### Inherited from

[`Computed`](../Computed/README.md).[`updateValue`](../Computed/README.md#updatevalue)
