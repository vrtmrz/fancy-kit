[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / WeakNamedInstance

# Class: WeakNamedInstance\<T\>

Defined in: [src/conduit/NamedInstance.ts:65](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L65)

WeakNamedInstance is a variant of NamedInstance that stores instances as weak references.
This allows instances to be garbage collected when there are no other strong references.

## Extends

- [`NamedInstance`](../NamedInstance/README.md)\<`T`, `WeakRef`\<`T`\>\>

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `object` |

## Constructors

### Constructor

```ts
new WeakNamedInstance<T>(name: string, factory: (name: string) => T): WeakNamedInstance<T>;
```

Defined in: [src/conduit/NamedInstance.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L22)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The name of the instance type, used for logging and debugging. |
| `factory` | (`name`: `string`) => `T` | A factory function that creates instances of the specified type. |

#### Returns

`WeakNamedInstance`\<`T`\>

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`constructor`](../NamedInstance/README.md#constructor)

## Properties

| Property | Type | Overrides | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="_factory"></a> `_factory` | (`name`: `string`) => `T` | - | [`NamedInstance`](../NamedInstance/README.md).[`_factory`](../NamedInstance/README.md#_factory) | [src/conduit/NamedInstance.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L12) |
| <a id="_get"></a> `_get` | (`instanceName`: `string`) => `undefined` \| `T` | [`NamedInstance`](../NamedInstance/README.md).[`_get`](../NamedInstance/README.md#_get) | - | [src/conduit/NamedInstance.ts:70](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L70) |
| <a id="_getinternal"></a> `_getInternal` | (`instanceName`: `string`) => `undefined` \| `WeakRef`\<`T`\> | - | [`NamedInstance`](../NamedInstance/README.md).[`_getInternal`](../NamedInstance/README.md#_getinternal) | [src/conduit/NamedInstance.ts:16](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L16) |
| <a id="_instances"></a> `_instances` | `Map`\<`string`, `WeakRef`\<`T`\>\> | - | [`NamedInstance`](../NamedInstance/README.md).[`_instances`](../NamedInstance/README.md#_instances) | [src/conduit/NamedInstance.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L11) |
| <a id="_name"></a> `_name` | `string` | - | [`NamedInstance`](../NamedInstance/README.md).[`_name`](../NamedInstance/README.md#_name) | [src/conduit/NamedInstance.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L10) |
| <a id="_wrap"></a> `_wrap` | (`instance`: `T`) => `WeakRef`\<`T`\> | [`NamedInstance`](../NamedInstance/README.md).[`_wrap`](../NamedInstance/README.md#_wrap) | - | [src/conduit/NamedInstance.ts:67](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L67) |

## Methods

### dispose()

```ts
dispose(instanceName: string): void;
```

Defined in: [src/conduit/NamedInstance.ts:52](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L52)

Disposes of the instance with the given name, if it exists.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance to dispose. |

#### Returns

`void`

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`dispose`](../NamedInstance/README.md#dispose)

***

### of()

```ts
of<V>(instanceName: string): V;
```

Defined in: [src/conduit/NamedInstance.ts:32](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L32)

Returns an instance named `instanceName`. If the instance already exists, the existing instance is returned.
If it does not exist, a new instance is created using the factory function provided in the constructor.

#### Type Parameters

| Type Parameter |
| ------ |
| `V` *extends* `object` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance to retrieve or create. |

#### Returns

`V`

An instance of the specified type.

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`of`](../NamedInstance/README.md#of)
