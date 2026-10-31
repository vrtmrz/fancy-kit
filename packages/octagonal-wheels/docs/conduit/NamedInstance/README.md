[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / NamedInstance

# Class: NamedInstance\<T, U\>

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:9

NamedInstance is a utility class that enables us to create and manage instances of a given type, each identified by a name.
This is useful in scenarios where singleton-like behaviour is required for named instances.

Note: All properties prefixed with `_` are intended to be private, but are exposed for performance reasons. We should not access them directly.

## Extended by

- [`WeakNamedInstance`](../WeakNamedInstance/README.md)

## Type Parameters

| Type Parameter | Default type |
| -------------- | ------------ |
| `T`            | -            |
| `U`            | `T`          |

## Constructors

### Constructor

```ts
new NamedInstance<T, U>(name: string, factory: (name: string) => T): NamedInstance<T, U>;
```

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:22

#### Parameters

| Parameter | Type                      | Description                                                      |
| --------- | ------------------------- | ---------------------------------------------------------------- |
| `name`    | `string`                  | The name of the instance type, used for logging and debugging.   |
| `factory` | (`name`: `string`) => `T` | A factory function that creates instances of the specified type. |

#### Returns

`NamedInstance`\<`T`, `U`\>

## Properties

| Property                                 | Type                                             | Defined in                                                |
| ---------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| <a id="_factory"></a> `_factory`         | (`name`: `string`) => `T`                        | packages/octagonal-wheels/src/conduit/NamedInstance.ts:12 |
| <a id="_get"></a> `_get`                 | (`instanceName`: `string`) => `T` \| `undefined` | packages/octagonal-wheels/src/conduit/NamedInstance.ts:14 |
| <a id="_getinternal"></a> `_getInternal` | (`instanceName`: `string`) => `U` \| `undefined` | packages/octagonal-wheels/src/conduit/NamedInstance.ts:16 |
| <a id="_instances"></a> `_instances`     | `Map`\<`string`, `U`\>                           | packages/octagonal-wheels/src/conduit/NamedInstance.ts:11 |
| <a id="_name"></a> `_name`               | `string`                                         | packages/octagonal-wheels/src/conduit/NamedInstance.ts:10 |
| <a id="_wrap"></a> `_wrap`               | (`instance`: `T`) => `U`                         | packages/octagonal-wheels/src/conduit/NamedInstance.ts:13 |

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

---

### of()

```ts
of<V>(instanceName: string): V;
```

Defined in: packages/octagonal-wheels/src/conduit/NamedInstance.ts:32

Returns an instance named `instanceName`. If the instance already exists, the existing instance is returned.
If it does not exist, a new instance is created using the factory function provided in the constructor.

#### Type Parameters

| Type Parameter |
| -------------- |
| `V`            |

#### Parameters

| Parameter      | Type     | Description                                     |
| -------------- | -------- | ----------------------------------------------- |
| `instanceName` | `string` | The name of the instance to retrieve or create. |

#### Returns

`V`

An instance of the specified type.
