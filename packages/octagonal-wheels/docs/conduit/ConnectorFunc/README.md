[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / ConnectorFunc

# Type Alias: ConnectorFunc()\<T, U\>

```ts
type ConnectorFunc<T, U> = (...args: T) => U;
```

Defined in: [src/conduit/connector.ts:12](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L12)

ConnectorFunc

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* `any`[] | the type of the arguments |
| `U` | the type of the return value |

## Parameters

| Parameter | Type |
| ------ | ------ |
| ...`args` | `T` |

## Returns

`U`

a promise that resolves to the return value of the function

## Remarks

ConnectorFunc is a function that takes a set of arguments and returns a promise.
It is used to connect a function to a name, and then invoke that function later.
