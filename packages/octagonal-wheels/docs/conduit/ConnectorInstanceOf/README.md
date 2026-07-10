[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / ConnectorInstanceOf

# Interface: ConnectorInstanceOf\<T\>

Defined in: [src/conduit/connector.ts:70](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L70)

ConnectorInstanceOf

## Remarks

Connect and get an instance via connector.
It is used to connect an instance to a name, and then retrieve that instance later.

## Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` | the type of the instance |

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="isconnected"></a> `isConnected` | `readonly` | `boolean` | [src/conduit/connector.ts:98](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L98) |

## Methods

### connect()

```ts
connect(obj: T, teardown?: () => void): void;
```

Defined in: [src/conduit/connector.ts:77](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L77)

Connect an instance to the connector

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `obj` | `T` | The instance to connect |
| `teardown?` | () => `void` | Optional callback to be called when the instance is disconnected |

#### Returns

`void`

#### Remarks

***

### connected()

```ts
connected(): Promise<T>;
```

Defined in: [src/conduit/connector.ts:83](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L83)

Get the connected instance

#### Returns

`Promise`\<`T`\>

a promise that resolves to the connected instance

#### Remarks

***

### connectedSync()

```ts
connectedSync(): T;
```

Defined in: [src/conduit/connector.ts:90](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L90)

Get the connected instance synchronously

#### Returns

`T`

the connected instance

#### Remarks

#### Throws

Error if no instance is connected yet

***

### disconnect()

```ts
disconnect(): void;
```

Defined in: [src/conduit/connector.ts:97](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L97)

Disconnect the connected instance

#### Returns

`void`

void

#### Remarks

This will remove the instance from the connector and clear the connection.
