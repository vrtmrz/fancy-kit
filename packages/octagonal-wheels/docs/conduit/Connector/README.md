[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Connector

# Variable: Connector

```ts
const Connector: {
  classInstanceOf: {
   <T>  (classType: T): ConnectorInstanceOf<InstanceType<T>>;
   <T>  (name: string): ConnectorInstanceOf<InstanceType<T>>;
  };
  funcOf: <T, U>(param: string | ConnectorFunc<T, U>) => ConnectorFuncOf<T, U>;
  instanceOf: {
   <T>  (name: string): ConnectorInstanceOf<T>;
   <T>  (instanceObject: T): ConnectorInstanceOf<T>;
  };
};
```

Defined in: [src/conduit/connector.ts:303](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/connector.ts#L303)

Connector

## Type Declaration

### classInstanceOf()

```ts
classInstanceOf: {
<T>  (classType: T): ConnectorInstanceOf<InstanceType<T>>;
<T>  (name: string): ConnectorInstanceOf<InstanceType<T>>;
};
```

#### Call Signature

```ts
<T>(classType: T): ConnectorInstanceOf<InstanceType<T>>;
```

Get a class instance connector

##### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* (...`args`: `any`[]) => `any` |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `classType` | `T` | The class type to connect |

##### Returns

[`ConnectorInstanceOf`](../ConnectorInstanceOf/README.md)\<`InstanceType`\<`T`\>\>

The connector instance associated with the class instance.

#### Call Signature

```ts
<T>(name: string): ConnectorInstanceOf<InstanceType<T>>;
```

Get a class instance connector by name

##### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `_classType`\<`any`\> |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The name of the class type to connect |

##### Returns

[`ConnectorInstanceOf`](../ConnectorInstanceOf/README.md)\<`InstanceType`\<`T`\>\>

The connector instance associated with the class type.

##### Remarks

This function retrieves the connector instance associated with the given name.

### funcOf()

```ts
funcOf: <T, U>(param: string | ConnectorFunc<T, U>) => ConnectorFuncOf<T, U>;
```

Get a function connector

#### Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `param` | `string` \| [`ConnectorFunc`](../ConnectorFunc/README.md)\<`T`, `U`\> | A function to connect |

#### Returns

[`ConnectorFuncOf`](../ConnectorFuncOf/README.md)\<`T`, `U`\>

<ConnectorFuncOf<T, U>>

#### Remarks

This method returns a function connector that allows you to connect a function to a name and then invoke that function later.

### instanceOf()

```ts
instanceOf: {
<T>  (name: string): ConnectorInstanceOf<T>;
<T>  (instanceObject: T): ConnectorInstanceOf<T>;
};
```

#### Call Signature

```ts
<T>(name: string): ConnectorInstanceOf<T>;
```

Get a connector to instance by the name

##### Type Parameters

| Type Parameter |
| ------ |
| `T` |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `name` | `string` | The name of the instance to connect. |

##### Returns

[`ConnectorInstanceOf`](../ConnectorInstanceOf/README.md)\<`T`\>

<ConnectorInstanceOf<T>>

##### Remarks

This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.

#### Call Signature

```ts
<T>(instanceObject: T): ConnectorInstanceOf<T>;
```

Get a connector to instance by the instance object

##### Type Parameters

| Type Parameter | Description |
| ------ | ------ |
| `T` *extends* `object` | The type of the instance |

##### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `instanceObject` | `T` | The instance object to connect |

##### Returns

[`ConnectorInstanceOf`](../ConnectorInstanceOf/README.md)\<`T`\>

##### Remarks

This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.

## Remarks

Connector is a utility class that allows you to connect functions and instances.
It provides a way to connect a function or an instance to a name, and then invoke that function or instance later.
