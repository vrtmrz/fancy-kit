# Compose shared runtime utilities

Choose a shared operation by the behaviour it owns, then supply the host-specific
capabilities at the application boundary. This guide connects the utilities used
by the current unpublished Commonlib and Self-hosted LiveSync integrations.
The new APIs require the corresponding candidate packages until released;
installing the last published versions does not provide them all.

## Choose the operation and its owner

| Need | Public entry and API | What the application still decides |
| --- | --- | --- |
| Prepare or compare text and bytes | `octagonal-wheels/binary/blob`: `createTextBlob`, `createBinaryBlob`, `toBlob`, `isBlobContentEqual` | Document formats, host comparison strategy, and whether equal bytes mean no application change. |
| Handle a source modification | `octagonal-wheels/modification`: `createModificationHandler` | Storage operations, decoding, equality, read-error recovery, and follow-up state updates. |
| Keep one value with its cleanup | `octagonal-wheels/resource`: `createOwnedResource`, `withOwnedResource` | Acquisition, lifetime, and which callers borrow the value. |
| Register cleanup during an operation | `octagonal-wheels/resource/scope`: `withScope`, `scoped` | Resources acquired by that operation and where child lifetimes end. |
| Observe cancellation and iterate with cleanup | `octagonal-wheels/concurrency/cancellation`, `concurrency/scoped.iteration` | Cancellation responses, item failure policy, and retained partial results. |
| Share a concurrency limit or lock groups | `concurrency/semaphore`: `withSemaphore`, `acquirePermit`; `concurrency/lock`: `withLocks` | Shared semaphore ownership, unique ordered keys, and work which must run after unlocking. |
| Wait for a notification | `octagonal-wheels/concurrency/notifier`: `createNotifier` | Which work sends notifications and when waiting starts. Idle notifications are discarded. |
| Replace one delayed callback | `concurrency/deferredAction`: `createDeferredAction` | Delay, host scheduler, and lifetime termination. |
| Count active operations or reduce progress callbacks | `concurrency/counting`: `withCounting`; `concurrency/coalescingNotifier`: `createCoalescingNotifier` | Which events advance progress and whether the last partial update is flushed. |
| Suppress repeated callback values | `octagonal-wheels/function`: `onlyWhenChanged` | The value to compare and callback failure handling. This is consecutive-value suppression, not result caching. |
| Expose an Obsidian command conditionally | `@vrtmrz/obsidian-plugin-kit/command`: `createCommandCheck` | Current selection and the action, including asynchronous error reporting. |
| Reuse value transformations | `notation/duration`, `encoding/json`, `path`, `string`, and `collection` under `octagonal-wheels` | Formats, limits, application-specific defaults, and UI navigation state. |

The abbreviated concurrency entries above are subpaths of `octagonal-wheels`.
Use focused imports; the package root includes other runtime families. See the
[import and runtime guide](../packages/octagonal-wheels/guides/imports-and-runtime.md)
for each entry's platform requirements and exact value contracts.

## Keep content policy in the adapter

The content factory provides the common order: read, recover a failed read if
allowed, decode, compare, and write only when different. It awaits each stage.
Only read failures invoke `onReadError`; failures in recovery or any later stage
reject the operation. Storage success means that `write` returned or resolved;
its resolved value is ignored.

```ts
import { createModificationHandler } from "octagonal-wheels/modification";

const values = new Map<string, string>();
const applyText = createModificationHandler<string, string, string | undefined, string>({
  read: key => values.get(key),
  onReadError: error => { throw error; },
  decode: source => source,
  isSame: (existing, content) => existing === content,
  write: (key, content) => { values.set(key, content); },
});

const outcome = await applyText("example", "replacement");
```

The map is an executable example of the storage boundary. A real adapter supplies
its own text or binary reader and writer. Treat a missing value separately from
an unreadable target; a read failure is not automatically permission to overwrite.
In LiveSync, the existing ConfigSync adapters deliberately retain their logged
empty-content fallback, text and binary comparisons, captured file timestamps,
and update-after-write policy. The shared factory adds no retries, locks,
rollback, or atomicity. Serialise callers explicitly when their storage needs it.

## Give cleanup a visible lifetime

Use `createOwnedResource` when a value has already been acquired and one owner
will dispose it. Use `withScope` when acquisition and cleanup registration happen
inside an asynchronous operation:

```ts
import { withScope } from "octagonal-wheels/resource/scope";

type Reader = { read(): Promise<string>; close(): Promise<void> };
declare function openReader(path: string): Promise<Reader>;

const text = await withScope("example.txt", async ctx => {
  const reader = await openReader(ctx.value);
  ctx.defer(() => reader.close());
  return await reader.read();
});
```

A borrowed value is not automatically disposed. Register cleanup immediately after
successful acquisition, and await work which uses the resource before returning.
A returned resource still closes if its cleanup was registered. For pipelines,
`.pipe()` shares the current cleanup owner; `.pipeScoped()` waits for a child's
cleanup before the following step. See the
[execution scope guide](../packages/octagonal-wheels/guides/execution-scopes.md)
for typed pipelines, cancellation, bounded iteration, and error ordering.

Choose the failure contract deliberately. `withOwnedResource` and
`withSemaphore` retain ordinary `finally` precedence: a cleanup failure replaces
an earlier body failure. Execution scopes preserve a single failure and aggregate
multiple body and cleanup failures. This distinction matters when migrating an
existing error-reporting workflow.

Long-lived UI or service owners should register disposal at their own termination
boundary. Borrowers receive the required operations rather than the owner's
cleanup capability. A plain logger callback needs no new resource wrapper;
a registered log handler does have a lifetime. Commonlib's
[service feature composition guide](https://github.com/vrtmrz/livesync-commonlib/blob/main/docs/service-feature-composition.md)
explains narrow service dependencies and registration ownership. Application
composition continues to own legacy logger bridges and display history.

## Decide what progress counts

Count attempted work before starting it, or successfully completed work after it
settles, according to the existing application contract. The notifier sees only
updates; it cannot infer success or failure.

```ts
import { createCoalescingNotifier } from "octagonal-wheels/concurrency/coalescingNotifier";

const reported: number[] = [];
const progress = createCoalescingNotifier<number>({
  everyCount: 25,
  leading: true,
  onNotify: count => { reported.push(count); },
});
for (let attempted = 1; attempted <= 30; attempted++) progress.update(attempted);
progress.dispose(); // drops the last partial interval; reported is [1, 26]
```

With `leading: true`, count-only notifications occur on the first update and then
each configured count increase. No timer is created without `maxWaitMs`.
`flush()` sends a pending update; disposal discards it. Neither is an implicit
end-of-batch notification. Callback errors propagate synchronously, and a returned
promise is not awaited. Keep asynchronous work and its errors with the caller.
LiveSync's hidden-file workflows retain their distinct attempted-item and
completed-item counts and do not add a final partial notification.

## Keep host and application boundaries explicit

The UI contracts belong to `@vrtmrz/ui-interactions`; browser DOM and Obsidian
adapters belong to their respective kits. The host chooses the target Document,
container, storage, fetch implementation, and lifecycle. Svelte sessions and
LiveSync-specific menus still retain application mounting and cancellation policy.
Use the [browser guide](../packages/browser-ui-kit/docs/usage-guide.md) and
[Obsidian guide](../packages/obsidian-plugin-kit/docs/usage-guide.md) for those
adapters instead of adding a shared object containing every host global.

Commonlib keeps document semantics, revision decisions, replication, and
compatibility adapters. LiveSync keeps Vault policy, settings, logs, recovery
choices, and follow-up state changes. Existing compatibility imports remain
available where their contracts require them; new generic consumers use the
owning package's focused API. Memoisation which changes whether failed results
are retained is a separate policy decision from moving a utility.

## Verify the composition at its boundary

Package contracts cover the shared operation, and installed-tarball checks cover
exports, types, and runtime loading. Consumer tests then exercise the real shared
operation with injected application capabilities: assert resulting content,
ordering, cleanup, error paths, and follow-up state. Spies can prove composition
without replacing the shared implementation.

Use real-runtime checks for the remaining host behaviour, such as Obsidian Vault
writes, rendered UI, browser storage, or CLI filesystem access. A passing build
or simulated mobile layout does not establish physical-device behaviour or
filesystem durability. The [maintained-consumer record](proven-in-use.md) names
the evidence and its limits; it is not a replacement for the public API contracts.
