[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [dataobject](../../README.md) / [refiner](../README.md) / Refiner

# Class: Refiner\<T, U\>

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:55

Refiner class is a utility for evaluating and caching results based on a source value.
It can handle both synchronous and asynchronous evaluations.
To address the issue of performance, it uses no `#` properties. Do not call `_` prefixed methods directly.
This class is designed for:

- Reactive updates or subscriptions.
  Not designed for:
- Caching computed values based on arguments. (Use Computed for that).

## See

RefinerOptions

## Type Parameters

| Type Parameter | Description                   |
| -------------- | ----------------------------- |
| `T`            | The type of the source value. |
| `U`            | The type of the result value. |

## Constructors

### Constructor

```ts
new Refiner<T, U>(options: RefinerOptions<T, U>): Refiner<T, U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:114

Constructor for the Refiner class.

#### Parameters

| Parameter | Type                                                        | Description                           |
| --------- | ----------------------------------------------------------- | ------------------------------------- |
| `options` | [`RefinerOptions`](../RefinerOptions/README.md)\<`T`, `U`\> | The options for the Refiner instance. |

#### Returns

`Refiner`\<`T`, `U`\>

## Properties

| Property                                             | Type                                                                              | Default value | Description                                                                                                                 | Defined in                                              |
| ---------------------------------------------------- | --------------------------------------------------------------------------------- | ------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| <a id="__evaluation"></a> `__evaluation`             | (`source`: `T`, `previous?`: `U`) => `U` \| `Promise`\<`U`\>                      | `undefined`   | An internal and swappable method used to evaluate the source and return a result.                                           | packages/octagonal-wheels/src/dataobject/Refiner.ts:72  |
| <a id="__shouldupdate"></a> `__shouldUpdate`         | (`isDifferent`: `boolean`, `source`: `T`, `previous?`: `U`) => `boolean`          | `undefined`   | a function to determine if the result should be updated based on the source and previous result.                            | packages/octagonal-wheels/src/dataobject/Refiner.ts:80  |
| <a id="_cachedby"></a> `_cachedBy?`                  | `T`                                                                               | `undefined`   | The cached source value used for comparison.                                                                                | packages/octagonal-wheels/src/dataobject/Refiner.ts:59  |
| <a id="_cachedresult"></a> `_cachedResult?`          | `U`                                                                               | `undefined`   | The cached result of the evaluation. It can be undefined if the evaluation has not been performed yet.                      | packages/octagonal-wheels/src/dataobject/Refiner.ts:64  |
| <a id="_evaluationpromise"></a> `_evaluationPromise` | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`U`\> | `undefined`   | The promise with resolvers used to handle the evaluation result.                                                            | packages/octagonal-wheels/src/dataobject/Refiner.ts:68  |
| <a id="_evaluations"></a> `_evaluations`             | `Promise`\<`void`\>                                                               | `undefined`   | An internal variable to track the latest evaluation. It is used to prevent outdated evaluations from being processed.       | packages/octagonal-wheels/src/dataobject/Refiner.ts:129 |
| <a id="_latest"></a> `_latest`                       | `number`                                                                          | `0`           | An internal variable to track the latest evaluation index. It is used to prevent outdated evaluations from being processed. | packages/octagonal-wheels/src/dataobject/Refiner.ts:134 |

## Accessors

### value

#### Get Signature

```ts
get value(): Promise<U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:201

##### Returns

`Promise`\<`U`\>

## Methods

### \_\_isDifferent()

```ts
__isDifferent(a: T, b: T): boolean;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:89

An internal and swappable method function to determine if two sources are different.

#### Parameters

| Parameter | Type | Description    |
| --------- | ---- | -------------- |
| `a`       | `T`  | source value.  |
| `b`       | `T`  | compare value. |

#### Returns

`boolean`

a boolean indicating if the two sources are different.
It defaults to isObjectDifferent function.

---

### \_getValue()

```ts
_getValue(): Promise<U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:185

#### Returns

`Promise`\<`U`\>

---

### \_refinePromise()

```ts
_refinePromise(): {
  promise: Promise<U>;
  reject: (reason?: any) => void;
  resolve: (value: U | PromiseLike<U>) => void;
};
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:95

An internal method to renew the promise with resolvers.
It is called when the evaluation is re-read.

#### Returns

```ts
{
  promise: Promise<U>;
  reject: (reason?: any) => void;
  resolve: (value: U | PromiseLike<U>) => void;
}
```

##### promise

```ts
promise: Promise<U>;
```

##### reject

```ts
reject: (reason?: any) => void;
```

###### Parameters

| Parameter | Type  |
| --------- | ----- |
| `reason?` | `any` |

###### Returns

`void`

##### resolve

```ts
resolve: (value: U | PromiseLike<U>) => void;
```

###### Parameters

| Parameter | Type                        |
| --------- | --------------------------- |
| `value`   | `U` \| `PromiseLike`\<`U`\> |

###### Returns

`void`

---

### \_startEvaluation()

```ts
_startEvaluation(source: T): void;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:142

An internal method to start the evaluation process.
It creates a new promise with resolvers and starts the evaluation.

#### Parameters

| Parameter | Type | Description                                                                           |
| --------- | ---- | ------------------------------------------------------------------------------------- |
| `source`  | `T`  | The source value to evaluate. It starts the evaluation process and caches the result. |

#### Returns

`void`

---

### update()

```ts
update(source: T): Refiner<T, U>;
```

Defined in: packages/octagonal-wheels/src/dataobject/Refiner.ts:174

#### Parameters

| Parameter | Type |
| --------- | ---- |
| `source`  | `T`  |

#### Returns

`Refiner`\<`T`, `U`\>
