# Execution scopes

Use an execution scope when one asynchronous operation acquires resources and
must finish their cleanup before returning. The APIs in this guide are
unreleased. The previous `octagonal-wheels/concurrency/scopedIteration` import
remains available as a compatibility re-export.
Select `withScope` for one operation, add typed steps with `scoped().pipe()`, and
use `pipeScoped()` when one step must close its resources before the next starts.

```ts
import { scoped, withScope } from "octagonal-wheels/resource/scope";
import { acquirePermit } from "octagonal-wheels/concurrency/semaphore";

const inspect = scoped<{ path: string }>()
  .pipe(acquirePermit(semaphore))
  .pipeScoped(async ctx => {
    const reader = await openReader(ctx.value.path);
    ctx.defer(() => reader.close());
    return await reader.read();
  })
  .pipe(ctx => analyseContents(ctx.value));

const report = await withScope({ path: "notes.md" }, inspect);
```

Here `semaphore`, `openReader`, and `analyseContents` are application dependencies.
The reader closes before analysis starts; the permit remains held until the whole
operation finishes. To release a permit at the reader boundary, place its
`acquirePermit` step inside the child pipeline instead.

## Values and ownership

`withScope(value, operation)` calls the operation once with `ctx.value` and
`ctx.defer`. It returns the operation's result after cleanup, whether the body
returns normally, returns early, or throws. A pipeline is optional.

Values are borrowed by reference. The scope does not clone, freeze, merge, or
automatically dispose them. Register only resources acquired for this execution,
immediately after acquisition succeeds. Returning a resource does not transfer
ownership: registered cleanup still runs. Return independent data from a child
scope when its resources must close before the next step.

`ctx.defer(cleanup)` accepts a callback returning `void` or an awaitable `void`.
Cleanup runs sequentially in reverse registration order. Every registration runs
once, even if earlier cleanup fails. Registering the same callback twice creates
two registrations. Registration after closing starts throws, including from
inside a cleanup callback. Use a separate scope for temporary cleanup resources.

A single failure is rethrown unchanged. Multiple failures produce `AggregateError`
with the body failure first, then cleanup failures in execution order. Thrown
`undefined` and nested aggregates are retained. This differs from
`withOwnedResource` and `withSemaphore`, whose existing `finally` precedence is
unchanged. A consumer with a domain-specific cleanup report can catch failures
inside its deferred callback and add them to that report.

## Declare and compose steps

A step is an ordinary closure of type `ScopedStep<Input, Output, Capabilities>`.
`scoped<Input>()` declares an identity pipeline. Each `.pipe(step)` returns a new
pipeline, passing the preceding return value as the next `ctx.value`. Earlier
pipelines remain reusable, and declaring a pipeline starts no work.

Steps share the execution's cleanup owner. Their value views remain stable, so
deferred closures keep the resources they captured. Pass earlier fields onward
explicitly when a later step needs them; values are not implicitly merged.

`.pipeScoped(step)` creates a child cleanup owner, waits for that child's body
and cleanup, and then passes the result onward. Parent registrations remain
pending. There is no operation to clear all pending cleanup mid-pipeline.

Pipelines are callable with an existing scope and can themselves be steps. Such
a call borrows the supplied scope; the runner remains responsible for closing it.
An exception stops later steps. An ordinary return, including `undefined`, passes
data onward and does not end the pipeline early.

## Observe cancellation

```ts
import { withCancellation } from "octagonal-wheels/concurrency/cancellation";

const result = await withCancellation(input, { signal }, async ctx => {
  if (ctx.isCancelled()) return partialResult();
  const source = await openSource(ctx.value, ctx.signal);
  ctx.defer(() => source.close());
  return await inspectSource(source, ctx);
});
```

`withCancellation` owns a fresh controller. It forwards the optional parent's
abort reason, never aborts the parent, and calls the body even for a pre-aborted
parent. The body decides how to retain partial results or propagate errors.
Cancellation alone does not reject, replace the result, or skip pipeline steps.
Keep a whole-operation early return in the enclosing callback.

Cancellation is notified promptly, but cleanup waits for the body. User cleanup
runs before the parent listener is removed and the owned signal is aborted.
Child scopes borrow the signal and cancellation observation; closing a child
does not abort the parent's controller. Contexts are valid only during their
own execution.

Cancellation remains cooperative. It cannot interrupt an API which ignores the
signal, withdraw an existing semaphore acquisition, or discover detached promises.
Await or return every child operation which must finish before scope closure.

## Iterate with an item lifetime

```ts
import { forEachInScope, mapInScope } from "octagonal-wheels/concurrency/scoped.iteration";

const result = await withCancellation(shared, { signal }, async parent => {
  return await mapInScope(parent, files, { concurrency: 4 }, async (file, child, index) => {
    const reader = await openReader(file.path);
    child.defer(() => reader.close());
    return { index, content: await reader.read() };
  });
});

if (result.status === "cancelled") retainPartialResults(result.values);
```

Both operations accept `Iterable` or `AsyncIterable` input and await yielded
values. Pulls are serial, callbacks start in input order, and each child borrows
the parent's value and capabilities. The default concurrency is one; an explicit
bound must be a positive safe integer. A slot remains occupied until that child's
cleanup finishes. The runner pulls no more input than the available capacity.

`forEachInScope` returns `{ status, started }`; `mapInScope` returns
`{ status, values }`, with values in input order. `status` is `completed` or
`cancelled`. A cancelled map retains the started prefix, including explicit
`undefined` results. Counts describe invoked callbacks, not application success.

Cancellation stops new callbacks after it is observed. An uncaught failure also
stops admission without aborting siblings. Both paths wait for started bodies,
their cleanup, any pending input, and the iterator's early `return()` when present.
An input or body which never settles therefore keeps the operation pending.
Catch errors inside an item when the application's policy is to log and continue.

Failures take precedence over a cancellation summary. One failure retains its
identity; multiple failures are ordered as input failure, item failures by input
index, then iterator-close failure. Item aggregates retain their grouping.

Use `acquirePermit` when the item must also participate in an existing shared
semaphore. Register it before other resources so its release runs last. The
iteration's local concurrency limit alone needs no additional semaphore.

## Imports and validation

Base scopes, iteration, and semaphore preparation have declaration graphs without
DOM or Node types. Cancellation uses standard `AbortSignal` and `AbortController`,
and creates the controller at invocation. Multiple-failure reporting requires
standard `AggregateError`. These focused contracts do not change the package-wide
runtime support policy.

The focused subpaths also have `.js` aliases. Namespace access is available as
`resource.scope`, `concurrency.cancellation`, and `concurrency.scopedIteration`.
Package browser contracts and installed-tarball Node/type fixtures exercise these
boundaries. Consumer tests remain responsible for their ordering, application
error handling, and choice of borrowed versus owned resources.
