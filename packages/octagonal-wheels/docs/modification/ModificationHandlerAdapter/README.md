[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [modification](../README.md) / ModificationHandlerAdapter

# Type Alias: ModificationHandlerAdapter\<TTarget, TSource, TExisting, TContent\>

```ts
type ModificationHandlerAdapter<TTarget, TSource, TExisting, TContent> =
  Readonly<{
    decode: (source: TSource) => TContent | PromiseLike<TContent>;
    isSame: (
      existing: TExisting,
      content: TContent,
      target: TTarget,
      source: TSource,
    ) => boolean | PromiseLike<boolean>;
    onReadError: (
      error: unknown,
      target: TTarget,
      source: TSource,
    ) => TExisting | PromiseLike<TExisting>;
    read: (
      target: TTarget,
      source: TSource,
    ) => TExisting | PromiseLike<TExisting>;
    write: (
      target: TTarget,
      content: TContent,
      source: TSource,
    ) => unknown | PromiseLike<unknown>;
  }>;
```

Defined in: packages/octagonal-wheels/src/modification.ts:5

Injected operations and application policy for handling one modification.

## Type Parameters

| Type Parameter |
| -------------- |
| `TTarget`      |
| `TSource`      |
| `TExisting`    |
| `TContent`     |
