[**octagonal-wheels**](../../README.md)

***

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / RegulatorOf

# Interface: RegulatorOf\<T, U\>

Defined in: [src/conduit/regulator.ts:19](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/regulator.ts#L19)

Regulator

## Remarks

Regulator allows you to regulate the number of concurrent processes.

## Example

```ts
const reg = new Regulator(2);
reg.onProcess(async example(args) => {
    // do something with args
});

reg.invoke([1, 2, 3]); (all example will be called with [1, 2, 3] but only 2 at a time will be processed)
```

## Type Parameters

| Type Parameter |
| ------ |
| `T` *extends* `any`[] |
| `U` |

## Methods

### invoke()

```ts
invoke(...args: T): Promise<U>;
```

Defined in: [src/conduit/regulator.ts:41](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/regulator.ts#L41)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| ...`args` | `T` |  |

#### Returns

`Promise`\<`U`\>

<Promise<U>>

#### Remarks

Invoke the regulator with the given arguments.

***

### invokeAll()

```ts
invokeAll(items: T[]): Promise<U>[];
```

Defined in: [src/conduit/regulator.ts:49](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/regulator.ts#L49)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `items` | `T`[] |  |

#### Returns

`Promise`\<`U`\>[]

#### Remarks

Invoke the regulator with the given arguments.
This will call the function with the given arguments and return a promise that resolves when all functions are done.
Note that order of the results is not same as the order of the arguments.

***

### maxConcurrency()

```ts
maxConcurrency(n: number): RegulatorOf<T, U>;
```

Defined in: [src/conduit/regulator.ts:27](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/regulator.ts#L27)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `n` | `number` |  |

#### Returns

`RegulatorOf`\<`T`, `U`\>

<RegulatorOf<T, U>>

#### Remarks

Set the maximum number of concurrent processes.
Default is 1.

***

### onProcess()

```ts
onProcess(func: (...args: T) => Promise<U>): RegulatorOf<T, U>;
```

Defined in: [src/conduit/regulator.ts:34](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/conduit/regulator.ts#L34)

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `func` | (...`args`: `T`) => `Promise`\<`U`\> |  |

#### Returns

`RegulatorOf`\<`T`, `U`\>

<RegulatorOf<T, U>>

#### Remarks

Set the function to be called when the regulator is invoked.
