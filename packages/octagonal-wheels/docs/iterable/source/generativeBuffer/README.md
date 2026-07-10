[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [iterable](../../README.md) / [source](../README.md) / generativeBuffer

# Function: generativeBuffer()

```ts
function generativeBuffer<T>(): {
  get size(): number;
  [asyncIterator]: AsyncGenerator<Awaited<T>, void, unknown>;
  [dispose]: void;
  dispose: void;
  enqueue: void;
  finish: void;
  values: AsyncGenerator<Awaited<T>, void, unknown>;
};
```

Defined in: [src/iterable/source.ts:4](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/iterable/source.ts#L4)

## Type Parameters

| Type Parameter |
| ------ |
| `T` |

## Returns

```ts
{
  get size(): number;
  [asyncIterator]: AsyncGenerator<Awaited<T>, void, unknown>;
  [dispose]: void;
  dispose: void;
  enqueue: void;
  finish: void;
  values: AsyncGenerator<Awaited<T>, void, unknown>;
}
```

### size

#### Get Signature

```ts
get size(): number;
```

##### Returns

`number`

### \[asyncIterator\]()

```ts
asyncIterator: AsyncGenerator<Awaited<T>, void, unknown>;
```

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>

### \[dispose\]()

```ts
dispose: void;
```

#### Returns

`void`

### dispose()

```ts
dispose(): void;
```

#### Returns

`void`

### enqueue()

```ts
enqueue(item: T): void;
```

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `item` | `T` |

#### Returns

`void`

### finish()

```ts
finish(): void;
```

#### Returns

`void`

### values()

```ts
values(): AsyncGenerator<Awaited<T>, void, unknown>;
```

#### Returns

`AsyncGenerator`\<`Awaited`\<`T`\>, `void`, `unknown`\>
