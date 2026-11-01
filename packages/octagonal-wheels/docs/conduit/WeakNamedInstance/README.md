[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / WeakNamedInstance

# Class: WeakNamedInstance\<T\>

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:65

WeakNamedInstance is a variant of NamedInstance that stores instances as weak references.
This allows instances to be garbage collected when there are no other strong references.

## Extends

- [`NamedInstance`](../NamedInstance/README.md)\<`T`, `WeakRef`\<`T`\>\>

## Type Parameters

| Type Parameter         |
| ---------------------- |
| `T` _extends_ `object` |

## Constructors

### Constructor

```ts
new WeakNamedInstance<T>(name: string, factory: (name: string) => T): WeakNamedInstance<T>;
```

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:22

#### Parameters

| Parameter | Type                      | Description                                                      |
| --------- | ------------------------- | ---------------------------------------------------------------- |
| `name`    | `string`                  | The name of the instance type, used for logging and debugging.   |
| `factory` | (`name`: `string`) => `T` | A factory function that creates instances of the specified type. |

#### Returns

`WeakNamedInstance`\<`T`\>

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`constructor`](../NamedInstance/README.md#constructor)

## Properties

| Property                                 | Type                                                          | Overrides                                                                                 | Inherited from                                                                                          | Defined in                                                |
| ---------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| <a id="_factory"></a> `_factory`         | (`name`: `string`) => `T`                                     | -                                                                                         | [`NamedInstance`](../NamedInstance/README.md).[`_factory`](../NamedInstance/README.md#_factory)         | packages/octagonal-wheels/src/conduit/NamedInstance.ts:12 |
| <a id="_get"></a> `_get`                 | (`instanceName`: `string`) => `T` \| `undefined`              | [`NamedInstance`](../NamedInstance/README.md).[`_get`](../NamedInstance/README.md#_get)   | -                                                                                                       | packages/octagonal-wheels/src/conduit/NamedInstance.ts:70 |
| <a id="_getinternal"></a> `_getInternal` | (`instanceName`: `string`) => `WeakRef`\<`T`\> \| `undefined` | -                                                                                         | [`NamedInstance`](../NamedInstance/README.md).[`_getInternal`](../NamedInstance/README.md#_getinternal) | packages/octagonal-wheels/src/conduit/NamedInstance.ts:16 |
| <a id="_instances"></a> `_instances`     | `Map`\<`string`, `WeakRef`\<`T`\>\>                           | -                                                                                         | [`NamedInstance`](../NamedInstance/README.md).[`_instances`](../NamedInstance/README.md#_instances)     | packages/octagonal-wheels/src/conduit/NamedInstance.ts:11 |
| <a id="_name"></a> `_name`               | `string`                                                      | -                                                                                         | [`NamedInstance`](../NamedInstance/README.md).[`_name`](../NamedInstance/README.md#_name)               | packages/octagonal-wheels/src/conduit/NamedInstance.ts:10 |
| <a id="_wrap"></a> `_wrap`               | (`instance`: `T`) => `WeakRef`\<`T`\>                         | [`NamedInstance`](../NamedInstance/README.md).[`_wrap`](../NamedInstance/README.md#_wrap) | -                                                                                                       | packages/octagonal-wheels/src/conduit/NamedInstance.ts:67 |

## Methods

### dispose()

```ts
dispose(instanceName: string): void;
```

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:52

Disposes of the instance with the given name, if it exists.

#### Parameters

| Parameter      | Type     | Description                          |
| -------------- | -------- | ------------------------------------ |
| `instanceName` | `string` | The name of the instance to dispose. |

#### Returns

`void`

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`dispose`](../NamedInstance/README.md#dispose)

---

### of()

```ts
of<V>(instanceName: string): V;
```

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:32

Returns an instance named `instanceName`. If the instance already exists, the existing instance is returned.
If it does not exist, a new instance is created using the factory function provided in the constructor.

#### Type Parameters

| Type Parameter         |
| ---------------------- |
| `V` _extends_ `object` |

#### Parameters

| Parameter      | Type     | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `instanceName` | `string` | The name of the instance to retrieve or create. |

#### Returns

`V`

An instance of the specified type.

#### Inherited from

[`NamedInstance`](../NamedInstance/README.md).[`of`](../NamedInstance/README.md#of)
