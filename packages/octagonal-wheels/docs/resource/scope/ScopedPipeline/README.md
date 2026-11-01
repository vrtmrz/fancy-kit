[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [resource](../../README.md) / [scope](../README.md) / ScopedPipeline

# Interface: ScopedPipeline()\<I, O, E\>

Defined in: packages/octagonal-wheels/src/resource/scope.ts:21

A reusable pipeline declaration. Composition itself starts no work.

## Type Parameters

| Type Parameter         | Default type |
| ---------------------- | ------------ |
| `I`                    | -            |
| `O`                    | -            |
| `E` _extends_ `object` | `object`     |

```ts
ScopedPipeline(ctx: Scope<I> & E): Awaitable<O>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:23

Runs the declared steps in the supplied scope, without closing that borrowed scope.

## Parameters

| Parameter | Type                                       |
| --------- | ------------------------------------------ |
| `ctx`     | [`Scope`](../Scope/README.md)\<`I`\> & `E` |

## Returns

[`Awaitable`](../Awaitable/README.md)\<`O`\>

## Methods

### pipe()

```ts
pipe<N>(step: ScopedStep<O, N, E>): ScopedPipeline<I, N, E>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:25

Returns a new pipeline whose next step shares this operation's cleanup owner.

#### Type Parameters

| Type Parameter |
| -------------- |
| `N`            |

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `step`    | [`ScopedStep`](../ScopedStep/README.md)\<`O`, `N`, `E`\> |

#### Returns

`ScopedPipeline`\<`I`, `N`, `E`\>

---

### pipeScoped()

```ts
pipeScoped<N>(step: ScopedStep<O, N, E>): ScopedPipeline<I, N, E>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:52

Returns a new pipeline which closes a child scope before passing its result onward.

#### Type Parameters

| Type Parameter |
| -------------- |
| `N`            |

#### Parameters

| Parameter | Type                                                     |
| --------- | -------------------------------------------------------- |
| `step`    | [`ScopedStep`](../ScopedStep/README.md)\<`O`, `N`, `E`\> |

#### Returns

`ScopedPipeline`\<`I`, `N`, `E`\>

#### Example

```ts
interface Reader {
  read(): Promise<string>;
  close(): Promise<void>;
}
declare function openReader(path: string): Promise<Reader>;
declare function analyse(contents: string): { words: number };
declare const path: string;

const inspect = scoped<string>()
  .pipeScoped(async (ctx) => {
    const reader = await openReader(ctx.value);
    ctx.defer(() => reader.close());
    return await reader.read();
  })
  .pipe((ctx) => analyse(ctx.value));
const report = withScope(path, inspect);
```

The reader closes before analysis starts; cleanup registered by ordinary
steps remains owned by the enclosing scope until the whole pipeline ends.
