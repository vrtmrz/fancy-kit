[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / NamedInstance

# Class: NamedInstance\<T, U\>

Defined in: [src/conduit/NamedInstance.ts:9](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L9)

NamedInstance is a utility class that enables us to create and manage instances of a given type, each identified by a name.
This is useful in scenarios where singleton-like behaviour is required for named instances.

Note: All properties prefixed with `_` are intended to be private, but are exposed for performance reasons. We should not access them directly.

## Extended by

- [`WeakNamedInstance`](../WeakNamedInstance/README.md)

## Type Parameters

| Type Parameter | Default type |
| ------ | ------ |
| `T` | - |
| `U` | `T` |

## Constructors

### Constructor

```ts
new NamedInstance<T, U>(name: string, factory: (name: string) => T): NamedInstance<T, U>;
```

Defined in: [src/conduit/NamedInstance.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L22)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The name of the instance type, used for logging and debugging. |
| `factory` | (`name`: `string`) => `T` | A factory function that creates instances of the specified type. |

#### Returns

`NamedInstance`\<`T`, `U`\>

## Properties

| Property | Type | Defined in |
| ------ | ------ | ------ |
| <a id="_factory"></a> `_factory` | (`name`: `string`) => `T` | [src/conduit/NamedInstance.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L12) |
| <a id="_get"></a> `_get` | (`instanceName`: `string`) => `undefined` \| `T` | [src/conduit/NamedInstance.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L14) |
| <a id="_getinternal"></a> `_getInternal` | (`instanceName`: `string`) => `undefined` \| `U` | [src/conduit/NamedInstance.ts:16](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L16) |
| <a id="_instances"></a> `_instances` | `Map`\<`string`, `U`\> | [src/conduit/NamedInstance.ts:11](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L11) |
| <a id="_name"></a> `_name` | `string` | [src/conduit/NamedInstance.ts:10](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L10) |
| <a id="_wrap"></a> `_wrap` | (`instance`: `T`) => `U` | [src/conduit/NamedInstance.ts:13](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/NamedInstance.ts#L13) |

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
| `V` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceName` | `string` | The name of the instance to retrieve or create. |

#### Returns

`V`

An instance of the specified type.
