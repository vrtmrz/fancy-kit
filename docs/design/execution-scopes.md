---
date: 2026-10-29
octagonal-wheels-version: "0.1.55"
commonlib-version: "0.2.2"
livesync-version: "1.0.42"
status: implemented-unreleased
---

# Execution scopes, pipelines, and iteration

## Purpose and status

This design gives an asynchronous operation one explicit lifetime for its
resources. Preparation is ordinary code. The operation registers cleanup with
`defer`, and its runner waits for that cleanup before returning. Reusable
pipelines and bounded iteration use the same callback shape.

The detailed contracts were accepted for implementation on 29 October 2026.
The runtime APIs and consumer pilots are implemented as unpublished candidates.
The [usage guide](../../packages/octagonal-wheels/guides/execution-scopes.md)
describes the current APIs. The original declaration sketches alongside this
design are retained as reviewed design evidence; maintained public API checks
use the [installed-package fixtures](../../test/packed-consumer/scope-usage.ts),
including the [neutral graph](../../test/packed-consumer/scope-neutral-usage.ts).

The reviewed baseline includes the unpublished shared-runtime work after
Octagonal Wheels 0.1.55, Commonlib 0.2.2, and Self-hosted LiveSync 1.0.42.
Existing `withSemaphore`, `withOwnedResource`, `DeferredAction`, and Commonlib's
`serviceFeature().withContext` retain their contracts.

## API and placement

| Entry                                          | API                                                           | Responsibility                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `octagonal-wheels/resource/scope`              | `Scope`, `ScopedStep`, `ScopedProgram`, `withScope`, `scoped` | Execute one scope, compose ordinary steps, and create child scopes through `pipeScoped`. |
| `octagonal-wheels/concurrency/cancellation`    | `Cancellation`, `CancellationScope`, `withCancellation`       | Connect an external cancellation signal to one owned operation.                          |
| `octagonal-wheels/concurrency/scopedIteration` | `forEachInScope`, `mapInScope`                                | Admit items with a concurrency bound and finish their child scopes.                      |
| `octagonal-wheels/concurrency/semaphore`       | `acquirePermit`                                               | Prepare an existing semaphore permit and defer its release.                              |

These are additions to existing focused modules and families. They do not
require a new package, a service registry, ambient context, persistent state,
or a separate setup/teardown object. The exact exports must be checked with
packed consumers before publication.

Base scopes, iteration, and the semaphore adapter require no DOM or Node types.
The cancellation entry uses standard `AbortSignal` and `AbortController`, and
resolves the controller only when an operation starts. Cleanup error aggregation
uses standard `AggregateError`; its availability is part of the focused runtime
verification, not a new package-wide compatibility claim.

## One operation

```ts
interface Scope<T> {
    readonly value: T;
    defer(cleanup: () => void | PromiseLike<void>): void;
}

const report = await withScope(settings, async (ctx) => {
    const source = await openSource(ctx.value);
    ctx.defer(() => source.close());
    return await inspect(source);
});
```

`withScope(value, operation)` creates a fresh cleanup owner, invokes the
operation once, awaits its result, drains its cleanup, and then settles its
promise. The same sequence applies to normal completion, early `return`, and
an exception. There is no requirement to use `pipe`.

`value` is the supplied reference or primitive. The runner does not clone,
merge, freeze, or dispose it. `readonly` prevents replacing the context's value;
it does not make an object deeply immutable. Passing the same object to several
operations deliberately shares its mutations. Each invocation still has its
own cleanup owner.

Register cleanup immediately after successful acquisition. An acquisition
function remains responsible for resources which it partially acquires before
rejecting. Only the owner registers disposal; borrowed services and values do
not acquire disposal obligations merely by entering `ctx.value`.

The resolved result is the callback's result after cleanup completes. Returning
an owned resource does not transfer its ownership or cancel its registered
cleanup. Return independent data when the resource must close at this boundary.
TypeScript does not enforce this lifetime rule.

## Cleanup contract

The owner has three internal states: running, closing, and closed. These are
local to the invocation and are not persistent or public mutable state.

1. During running, `defer` appends one cleanup registration.
2. When the callback settles, the owner enters closing. New registrations are
   rejected; this also applies to registrations attempted from cleanup callbacks.
3. Registrations run in reverse order, sequentially, with each result awaited.
4. A failed cleanup is recorded, and the remaining registrations still run.
5. The owner becomes closed and releases its registration references before the
   result or failure is returned.

Each registration runs once. Registering the same function twice creates two
registrations; there is no global deduplication. Cleanup may create and await a
separate scope if it needs its own temporary resources.

There is no `clearDefer`, public early flush, unregister operation, or ownership
transfer in this API. A child scope expresses an earlier cleanup boundary.

### Error policy

| Failures                                   | Result                                                          |
| ------------------------------------------ | --------------------------------------------------------------- |
| None                                       | Return the callback's value.                                    |
| Callback only                              | Rethrow the same value.                                         |
| One cleanup only                           | Rethrow the same value.                                         |
| Callback and cleanup, or multiple cleanups | Throw `AggregateError`, preserving all original failure values. |

Within an aggregate, a callback failure comes first, followed by cleanup
failures in cleanup execution order. Detect failure separately from its value:
`throw undefined` and `throw null` are still failures. Nested failures retain
their grouping rather than being silently flattened.

This differs from the existing `finally` precedence of `withSemaphore` and
`withOwnedResource`, where cleanup failure replaces a callback failure. Those
helpers stay unchanged. A consumer migration must either accept the new policy
explicitly or retain its existing error handling inside the deferred callback.

## Declare steps with closures

```ts
type ScopedStep<I, O, E extends object = object> = (ctx: Scope<I> & E) => O | PromiseLike<O>;

const inspect = scoped<Settings>()
    .pipe(acquirePermit(semaphore))
    .pipe(async (ctx) => {
        const db = await openDatabase(ctx.value);
        ctx.defer(() => db.close());
        return { settings: ctx.value, db };
    })
    .pipe(async (ctx) => makeReport(await ctx.value.db.readRows()));

const report = await withScope(settings, inspect);
```

`scoped<I>()` declares an identity program. Each `pipe` returns a new program
without changing the earlier declaration. Declaration does not acquire a
resource, create a cancellation controller, or start asynchronous work. The
same program can be executed repeatedly; captured dependencies remain shared
only where the caller has deliberately captured them.

The program is callable with a scope, so a named closure or another program
can be used as a step. Calling it with an existing scope borrows that scope;
`withScope` is the owner that eventually performs cleanup.

Each step receives a fresh value view over the same cleanup owner. Its returned
value becomes the next step's value. Earlier views retain their earlier values,
and deferred closures retain the resource references they captured. Carry
forward earlier fields explicitly; there is no implicit object merge.

`undefined` is ordinary step output. Returning from one step completes that
step; it does not mean `break`, pipeline cancellation, or immediate cleanup.
An unhandled rejection stops subsequent steps and returns through the owner's
cleanup. The builder has no `then` method and is not a promise.

`E` records capabilities supplied by a runner. The first extension is
`Cancellation`; declaring that requirement does not create its implementation.
A cancellation-dependent program cannot be executed by a plain `withScope`.
Ordinary steps remain reusable inside a cancellation-aware program. This is
type-level composition, not a runtime capability registration system.

## Finish a child scope before continuing

```ts
const inspectFile = scoped<FileInput>()
    .pipeScoped(async (ctx) => {
        const reader = await openReader(ctx.value.path);
        ctx.defer(() => reader.close());
        return await reader.read();
    })
    .pipe((ctx) => analyseContents(ctx.value));
```

`pipeScoped` creates a child cleanup owner for that step. It waits for the
callback and its cleanup before passing the result onward. The parent retains
its own registrations. If child cleanup fails, the next step is skipped and
the parent still performs its cleanup.

Capabilities are borrowed from the parent. In particular, a child created by
`pipeScoped` inherits cancellation observation but does not abort the parent's
signal when it closes. An explicitly separate `withCancellation` invocation
creates a separately owned controller.

This is the pipe form of nesting `withScope` for a temporary resource. It is
useful when a file handle, temporary reader, or permit must be released before
the next stage starts. It does not move all parent registrations into the child.

## Cancellation observes the operation's lifetime

```ts
const result = await withCancellation(input, { signal }, async (ctx) => {
    if (ctx.isCancelled()) return makeCancelledReport();
    const source = createSource({ ...ctx.value, signal: ctx.signal });
    ctx.defer(() => source.close());
    return await inspectAndPreservePartialResults(source, ctx);
});
```

The wrapper supplies `isCancelled()` and an owned signal in addition to `value`
and `defer`. It links the supplied parent signal to a fresh controller and
preserves the parent's abort reason. It never aborts the supplied parent.

The callback runs even when the parent was already aborted, so it can return
an application-specific cancelled or partial result. Cancellation by itself
does not reject the wrapper's promise, skip the callback, replace its result,
or swallow an `AbortError` from a called API. The callback determines its
return and error handling.

When cancellation occurs, the signal is notified promptly. Cleanup waits for
the callback to settle. When the scope closes normally, user cleanup runs
before the wrapper disconnects its parent listener and aborts its own signal.
The callback's completed result remains valid even if the signal becomes
aborted during cleanup. Contexts are no longer usable after their scope closes.

`pipe` retains normal composition semantics under this wrapper: it passes each
returned value to the next step. It does not silently short-circuit between
steps on cancellation, because that would require inventing a result of the
final type or discarding a deliberate partial result. A workflow needing an
early return from the whole operation keeps that decision in its enclosing
callback, or carries an explicit domain result which subsequent steps handle.
Automatic cancellation of a pipeline is outside this initial API.

Native operations still determine whether a signal can interrupt their work.
For example, the current Obsidian `nativeFetch` adapter does not forward a
signal to `requestUrl`; diagnostic code must still reject late responses and
avoid later requests after cancellation. A scope does not make that request
abortable.

## Iteration and bounded concurrency

```ts
await withScope(shared, async (parent) => {
    const result = await forEachInScope(parent, files, { concurrency: 4 }, async (file, ctx) => {
        const reader = await openReader(file.path);
        ctx.defer(() => reader.close());
        await processContents(await reader.read(), ctx.value);
    });
    return result;
});
```

`forEachInScope` and `mapInScope` accept synchronous or asynchronous iterables.
They pull through one iterator sequentially, await each yielded value, and
invoke callbacks in input order. Completion order may differ. The callback
receives the item, a child context, and its zero-based input index.

`concurrency` defaults to one and must be a positive safe integer. Validate it
before acquiring the input iterator. A slot remains occupied until the item's
callback and deferred cleanup have both settled. The runner does not create a
waiting promise for every item or exhaust the input ahead of available slots.
There is at most one pending iterator pull, within the reserved capacity.

Each item receives a fresh cleanup owner and the parent's shared value and
capabilities. Register item resources on the child, and register intentionally
shared resources on the parent. A parent-level registration cannot be used to
release an item permit: retaining all permits until parent completion could
prevent later items from starting.

The runner checks optional `isCancelled()` before a pull, after awaited input,
before dispatch, and before reporting completion. Once cancellation is
observed, it starts no more callbacks. Already started callbacks keep their
cooperative cancellation capability and finish their own cleanup.

On an uncaught item or iterator failure, the runner also stops further
admission and waits for every started item. It does not turn that failure into
parent cancellation or forcibly abort siblings. A callback which catches its
own error can preserve a consumer's existing continue-on-error policy.

When stopping early, wait for an in-flight iterator pull or yielded promise
before calling the iterator's `return` method once, if present. A late value is
not dispatched. Await iterator closure as well as the started item scopes.
An iterator or operation which never settles can therefore keep this call
pending; there is no timeout or pretend cancellation of an uninterruptible API.

All failures remain observable. A single failure is rethrown unchanged.
Multiple failures use `AggregateError`: input acquisition/read failure first,
then item failures in input-index order, then iterator-close failure. Item
cleanup failures follow the scope policy above. Failure takes precedence over
returning a cancellation summary.

### Result contracts

| Operation        | Result after all started work and cleanup finish               |
| ---------------- | -------------------------------------------------------------- |
| `forEachInScope` | `{ status: 'completed' \| 'cancelled', started: number }`      |
| `mapInScope`     | `{ status: 'completed' \| 'cancelled', values: readonly R[] }` |

These are discriminated unions in the declarations. `started` counts invoked
callbacks, not domain-level successful work. A cancelled callback may return
early; its ordinary return value is retained by `mapInScope`.

On cancellation, mapped values cover the started prefix of input items, ordered
by input index. The runner does not create placeholders for items it never
started, suppress `undefined` results, or present a partial array as a completed
map. On ordinary completion, values cover all input items. Checking cancellation
after the final cleanup can still produce `status: 'cancelled'` with all started
values; the caller retains both the status and the evidence.

These operations return promises which callers must await or return. The scope
does not discover arbitrary detached promises. In the supported composition,
the loop promise settles only after its children and iterator cleanup, so the
parent callback cannot finish early through a fail-fast `Promise.all` rejection.

## Semaphore preparation

`acquirePermit(semaphore)` returns a generic step which acquires one permit,
registers its release, and returns the current value unchanged. Acquisition
retains the method receiver and uses its existing quantity default. Acquisition
failure registers no release; successful acquisition registers it immediately.

Place it before other preparation within the item scope. Reverse cleanup then
releases item resources before the permit. This composes with a semaphore shared
across independent operations; a loop's local concurrency bound can be enforced
directly without creating a second semaphore.

The existing semaphore has no abortable `acquire` contract. An admitted step
which is waiting for a permit waits for acquisition, registers release, and
allows its operation to observe cancellation. It must not abandon a future
permit or claim that cancellation removed the queued acquisition.

The existing `withSemaphore` implementation and its exception precedence do
not change as part of this addition.

## Consumer adoption boundaries

| Consumer                                    | First useful application                                                                          | Contract to retain                                                                                                                                                                                                                     |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ConfigSync `scanAllConfigFiles`             | Replace task-array assembly and per-item lifetime plumbing with iteration.                        | Finish database enumeration before dispatch; finish the database-item batch before extra files; retain per-item logging and continuation. Do not silently turn the existing enumeration into streaming execution.                      |
| Commonlib database diagnostics              | Express source ownership and preparation with scopes, and cancellation at the operation boundary. | Preserve collected evidence, cancellation checks around I/O, native late-response rejection, and close errors recorded in the diagnostic result. Final report construction must remain after cleanup where it includes cleanup errors. |
| A temporary reader within a larger pipeline | Use `pipeScoped` to close the reader before analysis of independent content.                      | Return data rather than a resource which its child scope closes.                                                                                                                                                                       |
| Existing remote-resource or logger users    | Reuse an owned resource's disposal where an explicit scope improves composition.                  | Borrowed resources stay borrowed; preserve the established disposal and exception contract unless separately agreed.                                                                                                                   |

`createCouchDBDiagnosticSource` returns a resource whose lifetime continues after
the factory returns. Wrapping only that factory in a scope which immediately
closes the source is incorrect. The scope must cover the reader's use.

Commonlib's feature-generation `withContext` remains independent. Existing
`performBatchWithProgress` starts its batch eagerly and has its own progress and
error policy; it is not a mechanical migration to bounded iteration.

Octagonal Wheels already has `processAllTasksWithConcurrencyLimit` and
`mapAllTasksWithConcurrencyLimit`. They also accept already-started promises and
encode item errors in results. Preserve these APIs; reuse only compatible
implementation parts when implementing owned scopes and admission control.

## Verification and implementation sequence

The [declaration fixtures](execution-scopes/usage.typecheck.ts) cover value and
result inference, generic preparation, `pipeScoped`, cancellation capabilities,
iteration, and invalid composition. The [neutral fixture](execution-scopes/neutral.typecheck.ts)
checks that base scopes and iteration need neither DOM nor Node declarations.

From the repository root:

```sh
node --max-old-space-size=512 node_modules/typescript/bin/tsc -p docs/design/execution-scopes/tsconfig.json
node --max-old-space-size=512 node_modules/typescript/bin/tsc -p docs/design/execution-scopes/tsconfig.neutral.json
```

Type-check the declarations with the owning repository's TypeScript 5.9.3 and
the reviewed LiveSync consumer's TypeScript 6.0.3. Negative fixtures must reject
wrong step inputs, missing cancellation capabilities, invalid cleanup returns,
implicit value merging, and treating ordinary `undefined` as a control signal.
These historical sketches establish the reviewed type contract. The packed fixtures
check the implementation declarations and runtime behaviour through public imports.

The implementation and verification follow these contract groups:

1. Base scope and cleanup tests: success, early return, synchronous and async
   failure, reverse order, awaited cleanup, all cleanup after failure, failure
   identity, aggregates, thrown `undefined`, duplicate registrations, and late
   registration rejection. Check isolated and overlapping invocations.
2. Program composition and child scopes: lazy reusable declarations, stable
   earlier programs, value views, shared versus separate cleanup, nested
   failures, resources closed before the next step, and no import-time globals.
3. Cancellation: pre-aborted parent, reason propagation, independent controllers,
   returned partial results, unchanged callback errors, listener removal,
   normal close, inherited observation in child scopes, and cancellation during
   cleanup. Keep native late-response consumer tests.
4. Iteration: sequential and bounded execution, cleanup occupying slots, input
   ordering, async sources, awaited yielded values, cancellation at each await,
   iterator closure, uncaught failures, started-work drainage, retained errors,
   map result order, and callbacks which deliberately handle their own errors.
5. Semaphore preparation and consumer pilots: queue and release spies, exact
   acquisition failure, cancellation while waiting, and the two ConfigSync
   batches. Add or confirm consumer characterisation tests before changing
   production code, and preserve diagnostic partial and cleanup-error reports.
6. Focused Node and browser runtime tests, package checks, packed-consumer
   imports and declarations, and required downstream verification. Use the
   existing workspace and consumer gates at the integration milestone; run
   broad validation serially with the host's memory limit.

No retry, timeout, persistent recovery state, global scope registry, implicit
resource transfer, automatic pipeline short-circuiting, or general middleware
system is included. New requirements in those areas require a separate design
decision rather than an implicit addition to this scope API.
