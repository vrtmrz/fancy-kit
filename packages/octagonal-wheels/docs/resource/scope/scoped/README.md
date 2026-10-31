[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [resource](../../README.md) / [scope](../README.md) / scoped

# Function: scoped()

```ts
function scoped<I, E>(): ScopedPipeline<I, I, E>;
```

Defined in: packages/octagonal-wheels/src/resource/scope.ts:207

Declares an identity pipeline which can be extended with typed steps.

## Type Parameters

| Type Parameter         | Default type | Description                                                                         |
| ---------------------- | ------------ | ----------------------------------------------------------------------------------- |
| `I`                    | -            | The value supplied when the pipeline is executed.                                   |
| `E` _extends_ `object` | `object`     | Capabilities required from the execution context; declaration does not create them. |

## Returns

[`ScopedPipeline`](../ScopedPipeline/README.md)\<`I`, `I`, `E`\>

A callable pipeline with immutable pipe and pipeScoped composition methods.

## Remarks

pipe shares the current cleanup owner. pipeScoped owns cleanup for its step and
awaits that cleanup before the next step. Every step receives a stable value view;
its result becomes the next value without implicit merging. Undefined is ordinary
data, and cancellation observation does not automatically skip steps. Rejected
steps skip later steps, leaving the runner to perform the current scope's cleanup.
Declaration and composition acquire no resources and start no asynchronous work.

## Example

```ts
interface Reader {
  read(): Promise<string>;
  close(): Promise<void>;
}
declare function acquirePermit(): () => void;
declare function openReader(path: string): Promise<Reader>;
declare function analyse(contents: string): { words: number };
declare const path: string;

const inspect = scoped<string>()
  .pipe((ctx) => {
    ctx.defer(acquirePermit());
    return ctx.value;
  })
  .pipeScoped(async (ctx) => {
    const reader = await openReader(ctx.value);
    ctx.defer(() => reader.close());
    return await reader.read();
  })
  .pipe((ctx) => analyse(ctx.value));
const report = withScope(path, inspect);
```

The permit remains held through analysis; the reader closes before analysis
starts. The returned pipeline can be reused by another `withScope` call.
