---
date: 2026-11-10
value-store-version: "0.1.0"
status: implementation-candidate
---

# ValueStore batches and SQLite storage

## Purpose and status

Extend ValueStore so applications can move growing state from Web Storage or
small JSON files to SQLite while retaining their asynchronous value operations,
serialisers, and literal key prefixes. Kit manages the normal file connection
lifecycle; applications choose the file, stop their producers, and await store
disposal. An additional entry borrows an existing connection from its owner.

This document records the agreed design. The APIs below are implemented as an
unpublished candidate; the declaration
sketches describe their public boundary. The implementation passed the complete
workspace gate and separate Node/Deno native checks; see
[recorded candidate evidence](../proven-in-use.md#unpublished-batch-and-sqlite-candidate).
The baseline is
`@vrtmrz/value-store` 0.1.0 at Fancy Kit commit
`0a0476a658af5e2fa89cb58b67748cafe2a016bc`. It extends the
[existing storage design](key-value-and-local-storage.md) and preserves the
capability, serialisation, and dependency boundaries in
[ADR 0003](../adr/0003-value-store-capabilities.md).

Per-file state can exceed Web Storage quotas as an application's working set
grows. When a write is required before dispatch, a quota failure can stop later
processing. A shared SQLite adapter removes that storage ceiling; applications
retain responsibility for delivery checkpoints and error recovery.

The initial scope covers ordered batches for SQLite, JSON files, Web Storage,
and memory; scoped clearing where supported; and explicit completion of a
store's accepted work. General read transactions, enumeration, compare-and-swap,
cross-namespace transactions, worker offloading, automatic backend fallback,
and changes to the secret profile or age adapter are outside this design.

## Public capabilities and placement

Keep `ValueStore`, `ValueReader`, `ValueDeleter`, `ValueBackendReader`, and
`ValueBackend` compatible. Add capabilities independently so an existing custom
backend does not acquire new mandatory methods. Existing generic facade
factories continue to capture only their documented methods; they do not
silently emulate a batch by repeatedly calling public setters.

```ts
// @vrtmrz/value-store: additions to the neutral contracts.
type ValueBatchOperation =
  | { type: 'setValue'; key: string; value: string; ifAbsent?: boolean }
  | { type: 'setObject'; key: string; value: ObjectValue; ifAbsent?: boolean }
  | { type: 'delete'; key: string };

interface ValueBatchWriter {
  writeBatch(operations: readonly ValueBatchOperation[]): Promise<void>;
}

interface ValueClearer {
  clear(): Promise<void>;
}

interface ValueStoreDisposer {
  dispose(): Promise<void>;
}
```

`writeBatch` means ordered application, with success after every operation has
been applied. It does not promise rollback on every backend. There is no public
`atomic` option in this version. A future generic atomic capability would need
its own explicit contract.

| Entry or factory | Additions and responsibility |
| --- | --- |
| `@vrtmrz/value-store` | Neutral capability types and shared preparation; `MemoryValueStore` gains batch, clear, and disposal capabilities. |
| `@vrtmrz/value-store/web-storage` | `createWebStorageValueStore` gains batches and disposal, retaining explicit injection and raw per-key storage. |
| `@vrtmrz/value-store/node-json-file` | `createJsonFileValueStore` gains batches, prefix-scoped clear, and disposal; existing arguments and file format remain valid. |
| `@vrtmrz/value-store/node-sqlite` | New managed-file and borrowed-connection factories, both exposing value operations, delete, batch, clear, and disposal. |

The existing minimal `WebStorageAccess` contains only `getItem`, `setItem`, and
`removeItem`. Those methods suffice for batches, but not for enumerating a
prefix. Its factory therefore does not advertise `ValueClearer`. Do not widen
that injected interface or call the host's global `clear()` implicitly. An
explicit enumeration capability can support scoped clearing in a later change.
Memory clears its instance-owned map; JSON clears its captured prefix; SQLite
clears its captured namespace and prefix.

Keep `node:sqlite`, filesystem modules, and `DatabaseSync` types inside the new
Node subpath. The neutral root and Web Storage entry remain independent of Node,
DOM globals, Obsidian, and runtime, optional, or peer package dependencies.
The SQLite subpath requires a runtime providing the native API it uses; adding
it does not raise the runtime floor of the existing JSON or neutral entries.

## SQLite construction

```ts
// @vrtmrz/value-store/node-sqlite
import type { DatabaseSync } from 'node:sqlite';

interface SqliteValueStoreOptions extends ValueStoreOptions {
  /** Literal key prefix, including delimiters. Empty is allowed. */
  prefix: string;
  /** Exact independent namespace. Defaults to the empty string. */
  namespace?: string;
}

interface SqliteFileValueStoreOptions extends SqliteValueStoreOptions {
  /** Filesystem path; resolve relative paths once at construction. */
  filePath: string;
  /** Managed connections use WAL; synchronous defaults to FULL. */
  durability?: 'full' | 'normal';
  /** Optional notification of a retained initialisation or idle-close failure. */
  onBackgroundError?: (error: ValueStoreError) => void | Promise<void>;
}

type SqliteValueStore = ValueStore & ValueDeleter & ValueBatchWriter
  & ValueClearer & ValueStoreDisposer;

function createSqliteFileValueStore(
  options: SqliteFileValueStoreOptions,
): SqliteValueStore;

function createSqliteValueStore(
  database: DatabaseSync,
  options: SqliteValueStoreOptions,
): SqliteValueStore;
```

The managed factory is the normal entry. Like the JSON factory, it returns a
facade synchronously and accepts `filePath`, `prefix`, and `serializer`.
Malformed options can fail during construction. File initialisation has an
internally observed Promise which each operation and `dispose()` awaits; its
failure is retained and reported through those calls and the optional hook.
Construction-error timing is therefore not identical to the current JSON
factory. A public `ready()` or pool argument is not required.

The caller supplies an existing parent directory. Kit does not discover an
environment variable, choose an application directory, or silently create a
directory hierarchy. `filePath` is a filesystem path, not an arbitrary SQLite
URI or an in-memory database selector. Kit encodes any internal URI itself.
The borrowed factory can be used with a host-created in-memory connection.

```ts
const state = createSqliteFileValueStore({
  filePath: stateFile,
  prefix: 'peer:',
  namespace: 'bridge-state',
  durability: 'full',
});

await state.setObject('checkpoint', checkpoint);
const saved = await state.getObject('checkpoint');

// The host stops producers and waits for their work before disposal.
await state.dispose();
```

The file format is new. Selecting SQLite does not convert an existing JSON
file, reinterpret it, or fall back to another backend after an error. Moving
application data between formats remains an explicit consumer operation.

## Values, names, and scope

Preserve the current absence and serialisation rules: missing strings return
`null`, missing objects return `undefined`, and JSON `null`, false, zero, and
empty strings are stored data. Defaults apply only to absence and never hide
an error. Validate and snapshot object inputs and defaults before the first
await. Capture the serialiser pair and its receiver at construction, pass the
unprefixed logical key, and transform once per prepared write or present read.
Deletion and absent reads bypass the serialiser.

Within one SQLite namespace, physical keys remain the exact concatenation
`prefix + key`. Thus prefix `ab` with key `c` and prefix `a` with key `bc` refer
to the same entry. SQLite stores the namespace separately: namespace `ab` with
physical key `c` differs from namespace `a` with physical key `bc`. There is no
trimming, case folding, Unicode normalisation, or implicit delimiter.

`clear()` removes only physical keys beginning with the captured literal prefix
in the selected namespace. An empty prefix covers that namespace. Overlapping
prefixes deliberately share entries, so clearing one can affect another view.
Other namespaces, schema metadata, and the database file remain intact. A
namespace is a logical partition, not an access-control boundary. Consumers
sharing entries must agree on serialisation; Kit adds no serialiser registry.

Generic ValueStore strings include embedded NULs and lone UTF-16 surrogates.
Native TEXT bindings must not silently change these strings. Store namespaces,
physical keys, and serialised values with a lossless internal codec; fixed
big-endian UTF-16 code units in BLOB columns are the initial representation.
Validate stored encodings and types before decoding. The codec is separate from
the caller's serialiser. Prefix matching must preserve code-unit semantics and
must not depend on SQL text collation or `LIKE` wildcard interpretation.

## Ordered batches and visibility

One batch belongs to one store scope. Its sequence is:

1. Register the operation before its first await. Validate the complete array
   and snapshot operation descriptors, keys, flags, and JSON values.
2. Prepare each value write through the captured serialiser, in array order,
   before starting data application. Preparation has no storage writes. A
   preparation failure leaves the batch's data unapplied.
3. Enter the backend's application boundary and apply operations in array
   order. A repeated key sees earlier operations in that batch.
4. Resolve after all operations succeed and the backend's commit or replacement
   completes. Stop on the first application failure and reject with a sanitised
   error. The backend determines what earlier operations remain visible.

`ifAbsent: true` checks presence at application time, including earlier batch
operations. Empty strings and JSON null count as present. Its serialiser is
still prepared once even if the conditional write will be skipped; no
serialiser runs inside a SQLite transaction. An empty batch performs no data
I/O, but still observes lifecycle and initialisation failures. The result is
`void`, not a count of inserted records.

| Backend | Application and failure boundary | Concurrent access limit |
| --- | --- | --- |
| SQLite | One SQL transaction; ordinary statement failure rolls back the batch. A commit or rollback failure can leave the result uncertain. | Kit operations on a connection share a lock; SQLite coordinates other connections. `ifAbsent` uses a conditional insert inside the transaction. |
| JSON file | Read once, build one candidate document, check its encoded size, and replace once using the existing temporary-file protocol. A replacement failure can have an uncertain outcome. | Existing single-writer restriction remains. A batch does not introduce a cross-process lock. |
| Memory | Prepare a candidate state and publish it synchronously after successful application. | Instance-owned state, with no cross-instance sharing implied. |
| Web Storage | Apply synchronous per-key calls without an intervening await or callback. A failure may leave earlier operations applied. | No cross-tab batch isolation or atomic conditional insertion. The ordinary single-agent execution limit does not protect against another Window or quota failure. |

JSON retains its inclusive `1_048_576`-byte limit on the complete UTF-8 document,
including metadata, keys, prefixes, and escapes. It is not a per-value limit
and is not made configurable by this design. Its version-1 format and existing
file checks remain unchanged. SQLite has no new Kit-imposed 10 MB or 1 MiB cap;
real SQLite and filesystem limits still apply.

Ordinary reads never consult queued write buffers. A read can see the previous
stored state while a batch prepares, or the resulting state after application.
After a Web Storage application failure, earlier successful entries are stored
state and can be read. Different ordinary reads need not belong to one snapshot.
There is no value cache retained across operations and no hidden write-behind.
Operation-local snapshots and connection lifecycle metadata are separate from
that rule. MemoryValueStore's map is its storage, not an additional cache.

Concurrent public calls have no new invocation-order guarantee: an asynchronous
serialiser can let a later call reach application first. Await dependencies.
`clear()` does not cancel another write still preparing; that write may store a
value after clear completes. A host using clear as a reset boundary must stop
and drain producers first. Large imports should use explicit bounded batches;
Kit does not silently split a batch or promise non-blocking native I/O.

## Connection coordination and transactions

Use one coordinator per actual SQLite connection, shared by all its Kit stores
and namespaces. Reads, individual writes, deletion, clearing, batches, schema
work, and connection closing participate. Preparation and deserialisation run
outside the connection lock; the raw read is captured under the lock and the
complete public operation remains tracked until decoding settles.

Acquire the connection lock before checking `database.isTransaction`. An earlier
Kit transaction finishes before this check. If an external transaction is then
active, reject the normal operation without committing or rolling it back.
Reads also reject rather than exposing that connection's external uncommitted
changes. The borrowed connection owner must not start direct SQL work or close
the connection while its Kit users are operating.

The native application section is synchronous: check transaction state, begin,
apply prepared operations, and commit, with no external callbacks or awaits.
Use private already-locked primitives instead of calling public methods that
would reacquire a non-reentrant lock. On failure, roll back only a transaction
Kit started. A failed rollback or uncertain connection state faults the
coordinator; subsequent work must not reuse it or mistake the leftover state
for a new host-owned transaction. A failed operation with confirmed rollback
does not by itself fault an otherwise usable connection.

Other processes and independent connections rely on SQLite's own locking. Busy
and locked results are surfaced; there is no implicit write retry. Avoid adding
a hidden long busy-wait policy to this synchronous adapter. The initial managed
connection uses no additional busy delay; a borrowed connection retains its
owner's policy. The public Promise shape permits a future worker implementation
without promising one now.

SQLite isolates separate connections by default, while a connection can read
its own uncommitted writes. The shared lock and external-transaction check are
therefore necessary even when the JavaScript runtime executes one job at a time.
See [SQLite isolation](https://sqlite.org/isolation.html) and
[transaction rules](https://sqlite.org/lang_transaction.html).

## Managed file lifecycle

The internal manager associates stores selecting the same canonical file with
one connection and coordinator in one loaded Kit module and JavaScript instance.
It is not a public connection pool or a promise of sharing across workers,
processes, or duplicate package instances. Resolve paths once and verify file
and parent identity. Alias and replacement handling must not silently create a
second coordinator for the same supported target. Conflicting connection-wide
options, including durability, fail rather than reconfiguring other stores.

Keep the facade lifetime separate from the connection lifetime:

```text
Store:       accepting -> draining -> disposed
Connection: initialising -> absent or closed -> open -> idle -> closed
                                                     ^         |
                                                     +---------+
Any unrecoverable connection or initialisation failure -> faulted
```

### Initialisation and delayed creation

Initialisation is shared per file coordinator. Adding a store to an already
active coordinator does not run another startup migration or close its active
connection. All public data operations wait until initialisation completes.

| File condition | Initial action and subsequent behaviour |
| --- | --- |
| Existing database | Open in existing-only mode, validate the Kit schema, apply managed settings, migrate a supported older version if necessary, and close once. Public data I/O starts after this close. |
| Initially absent | Check the path and parent conditions without opening SQLite or creating a file. Reads return absence/default; delete, clear, empty batches, and delete-only batches do not create a database. |
| First prepared value write | Create and initialise the database, then apply the write. Validation or serialiser failure must occur before creation begins. |
| File appears after initial absence | Recognise and validate it before use. Do not cache absence indefinitely or overwrite it as an empty store. |
| Previously observed database disappears | Fail instead of recreating an empty database. |
| Denied access, invalid file, corrupt or unsupported schema | Retain an initialisation failure; never treat it as absence. |

The initial close is part of initialisation, not the idle timer. Operations
queued behind initialisation have not acquired the connection; their pending
count must not prevent this deliberate close or cause a self-wait. A failure of
this close is an initialisation failure. Once actual creation starts, a failed
write does not guarantee that no file or schema was left behind.

Existing-only opening must prohibit creation at the native open boundary, not
only through an earlier existence check. The verified native mechanism is an
encoded file URL with the fixed `mode=rw` parameter. Special path characters,
identity changes, creation races, and permissions need adapter tests; callers
cannot inject URI options through `filePath`. See
[SQLite URI modes](https://sqlite.org/uri.html).

### Schema ownership and migration

Use Kit-specific tables and version metadata. Do not occupy the database-wide
`user_version` or `application_id`; unrelated tables in a valid shared database
remain outside Kit's authority. An existing managed file must have a recognised
Kit schema. The borrowed entry permits explicit initialisation of the Kit schema
on a host-owned database when its reserved objects are absent; conflicting or
incomplete Kit objects are an error, not permission to erase or rebuild them.
New managed files initialise the same schema on their first value write.

The logical value table has non-null namespace, physical-key, and value BLOBs,
with a unique composite key on namespace and physical key. Presence is row
existence, independent of the encoded value. Kit metadata identifies the format
and schema version separately from application namespaces. SQLite clear uses
one transaction; JSON clear uses one document replacement. Neither removes
schema metadata or changes an application migration marker outside its scope.

Read and validate the schema before changing persistent connection settings.
Apply the selected managed durability before any schema mutation; the borrowed
entry uses its owner's settings. For a required migration, acquire the shared connection lock and a SQLite write
transaction, then read the version again under that transaction. Apply known
schema changes and update their version in the same transaction. Another
connection completing the migration first must not cause duplicate application.
Reject unknown newer versions, malformed metadata, and incompatible schema.
On failure, roll back only Kit's work and retain the initialisation error.

The first format needs a versioned migration entry point, not an invented
historical migration. Future migrations initially use transactional operations;
maintenance such as `VACUUM` needs a separate design if required. There is no
public arbitrary migration callback. Import of legacy application data is
independent of Kit's schema version. Normal reopen revalidates before access; a previously
absent file appearing later also enters validation before use.

### Idle close and reopen

Track every accepted operation, including serialiser preparation, lock waiting,
and read decoding. When the connection-wide count becomes zero, reserve an idle
close after an initial internal grace period of **1,000 ms**. This value is a
starting policy, not a measured optimum or a public tuning option.

New work cancels the reservation. The callback acquires the shared lock and
rechecks both the pending count and its connection generation before closing.
An old callback cannot close a newly opened connection. A normal idle close
leaves the facade accepting operations; later work reopens, validates, and
configures the connection. This is normal lifecycle management, not recovery
from a fault or reopening a disposed facade.

Use an unreferenced timer so it alone does not keep the process alive. The
process may exit before the callback runs. Successful writes have already
committed; WAL files may remain and be recovered on subsequent access. GC and
finalisers are not required for persistence or orderly shutdown. See
[Node timer references](https://nodejs.org/download/release/v24.0.0/docs/api/timers.html#timeoutunref).

### Disposal and failures

`dispose()` stops admission synchronously, before its first await. It waits for
every operation already accepted by that store to settle, including failures.
It must not hold the connection lock while waiting for those operations. A
pending serialiser can keep disposal pending; there is no implicit timeout,
forced cancellation, or reopening of admission. Lifecycle control belongs
outside the serialiser: awaiting the same store's disposal from its own
serialiser would wait on itself.

Each original operation Promise reports its own success or failure. Disposal
does not replay ordinary operation errors or certify that every write succeeded.
Repeated calls share one terminal completion. New calls after admission closes
fail with `unavailable` without touching storage.

For a managed store, disposal can close the connection immediately after its
work drains if the connection-wide count is zero, skipping the grace period.
Another idle store can reopen later. If another store is busy, disposal ends
only the caller's use and leaves that connection running. `dispose()` on a
borrowed store never closes the supplied connection. Its owner must stop all
producers and dispose all Kit users before closing the database; one store's
disposal does not drain host SQL or another store.

If an idle close fails after an operation has succeeded, preserve that operation's
result. Catch and retain a sanitised lifecycle error, fault the coordinator, and
report it on subsequent operations and disposal. Do not leak an unhandled
rejection, reuse an uncertain connection, or retry silently. A close failure
during disposal rejects disposal after accepted work has drained.

The optional `onBackgroundError` hook provides prompt notification of retained
initialisation or idle-close failures. Invoke active subscribers outside the
connection lock; a callback's throw or rejection cannot damage the coordinator
or prevent other notifications. Hook completion is not a disposal dependency,
and disposal unregisters that store's subscription. The retained failure remains
observable without a hook. Release connection resources and subscriber
references when their ownership ends; a timer must not retain disposed facades.

## Durability and errors

Managed connections request WAL and `synchronous=FULL` by default, and verify
the resulting settings. The caller can explicitly choose `normal` for a
workload whose recovery policy accepts losing recent committed updates after an
OS crash or power failure. The borrowed entry preserves the owner's journal,
synchronisation, checkpoint, and busy settings. WAL/FULL is the recommended
configuration for durable application state; it is not a hardware-independent
power-loss guarantee. See [SQLite synchronous settings](https://sqlite.org/pragma.html#pragma_synchronous).

A successful write resolves after commit, not after the idle grace period or
checkpoint. A normal final connection close usually checkpoints and removes
WAL/SHM files, but another connection, persistent-WAL settings, or abrupt exit
can leave them present. Do not treat file presence as failure, force TRUNCATE
on every batch, or manually remove a WAL to tidy the directory. Keep SQLite's
normal automatic checkpoint policy. Recovery, checkpointing, truncation, and
file removal are different events. See [SQLite WAL](https://sqlite.org/wal.html)
and [checkpoint behaviour](https://sqlite.org/pragma.html#pragma_wal_checkpoint).

The application places the database and its WAL/SHM siblings on a suitable
persistent local filesystem. General network-filesystem support is not claimed.
The first adapter uses synchronous native calls even though its public methods
return Promises. Large migrations, WAL recovery, checkpointing, and opening can
delay the event loop; startup validation also adds an open/close before the
first ordinary open. These costs need measurement.

Preserve the existing `ValueStoreError` codes and fixed messages. Do not attach
upstream messages, causes, SQL, paths, or stored values. Map only what the runtime
actually establishes: invalid schema/data to `invalid-data`, observed permission
denial to `access-denied`, observed capacity exhaustion to `quota-exceeded`, and
closed/disposed availability to `unavailable`. Busy, lock, unclassified I/O, and
uncertain completion use `operation-failed`. Preserve existing validation and
serialiser error handling. A rejection alone is not proof of no persistent
change, particularly for partial Web Storage batches or uncertain commit/rename.

## Shared implementation and alternatives

Reuse ValueStore's validation, JSON snapshots, serialiser capture, default
handling, and sanitiser. Factor batch preparation and operation tracking behind
those same contracts; avoid a second independent value engine. Reuse JSON's
existing read/replace helpers and the injected Web Storage methods. The new
SQLite adapter owns only its codec, schema, native operations, and lifecycle.

Octagonal Wheels `withLock` has suitable queued critical-section semantics, but
adding that package as a ValueStore dependency would violate ADR 0003. Keep the
small required coordination internal and dependency-free, informed by the
existing implementation. Its same-key re-entry limitation explains why batch
application needs already-locked primitives. The existing task timer helper
does not by itself supply rejection handling, unref, or generation checks.

The existing OW IndexedDB stores have different key, value, absence, and
lifecycle contracts. `PersistentMap` retains a value cache and delays whole-map
persistence. Neither substitutes for this adapter, and neither is changed.
Native `node:sqlite` avoids a new package dependency. Worker and alternative
runtime implementations can be considered after the initial boundary is
qualified, rather than expanding this design's runtime promise.

## Application integration

The application owns the selected file path and persistent directory, its
existing key scheme, migration markers, startup/reset ordering, and logging.
Kit owns the reusable storage guarantees. Integration should retain existing
keys and explicitly inject the selected store, without depending on a global
SQLite singleton in Kit.

Paths whose next action depends on persistence must await it, including setting
access, per-record updates, reset sequences, and checkpoint callbacks. Callbacks
must return the persistence Promise, and their callers must await it. A
synchronous initialisation path needs an awaited preparation step. Existing
single-key callers do not require a new batch capability.

Legacy import can use `ifAbsent` with a completion marker in a separate
namespace:

1. Stop legacy writes and establish the source snapshot before starting normal
   sync producers. Check the migration marker.
2. Import bounded batches, preserving existing SQLite entries with `ifAbsent`.
   Await every batch. A failed import prevents normal sync startup.
3. Store the completion marker only after every batch succeeds. Keep the legacy
   source. If interrupted, rerun without replacing newer destination entries.

For reset, persist a marker suppressing legacy re-import before clearing the
state scope, then start producers only after clear succeeds. Keep this marker
outside that scope; an interrupted reset can be rerun. This ordering does not
require a cross-namespace transaction. Consumer tests must cover interruptions
during import and reset. A scanned-row count must not be reported as an
inserted-row count because `ifAbsent` can skip entries.

The application retains responsibility for delivery ordering, retry policy,
and validation of the complete workflow with the selected storage backend.

## Verification and implementation sequence

The design has limited native feasibility evidence on Linux arm64 with Node
24.18.0 / SQLite 3.53.1 and Deno 2.9.7 / SQLite 3.53.2:

| Probe | Observed result | Limit |
| --- | --- | --- |
| Exact string round trip | Native TEXT altered a lone surrogate, and Deno also truncated the tested NUL-containing string; explicit UTF-16 BLOB encoding preserved the code units in both runtimes. | Not a completed adapter or schema test. |
| Normal close and reopen | WAL/SHM disappeared on final close; retained prepared statements became unusable; reopening preserved the value. | One connection and a small temporary database. |
| Abrupt process exit | After SIGKILL with one committed and one uncommitted write, reopening exposed only the committed row; later normal close removed WAL/SHM. | Not a power-loss or storage-device durability test. |
| Existing-only open | `mode=rw` read an existing database and rejected a missing path without creating it in both runtimes. | Special paths, identity changes, and creation races remain unverified. |

These probes establish feasibility, not implementation correctness or a minimum
supported runtime matrix. The design and publication status of existing
[proven-in-use evidence](../proven-in-use.md#valuestore-package-and-consumer-evidence)
remain unchanged. Do not present PR-reported load tests as Kit validation.

Implementation should proceed through these bounded steps:

1. Add neutral capability declarations and shared preparation/tracking, then
   extend memory, JSON, and Web Storage with their documented guarantees.
2. Implement the lossless SQLite format and borrowed-connection coordinator,
   followed by the managed file initialisation, migration boundary, idle policy,
   and disposal behaviour.
3. Qualify runtime exports and filesystem/native boundaries, update package
   usage and proven-in-use evidence, then exercise the consumer workflow.

| Acceptance area | Required evidence before calling the implementation complete |
| --- | --- |
| Compatibility | Existing contract cases still pass for absence, defaults, JSON snapshots, exact keys and strings, serialiser receiver/call counts, deletion, and sanitised errors. Old minimal custom backends still compile. |
| Batches | Inputs are captured before await; preparation failures perform no data writes; repeated keys and `ifAbsent` follow array order; no cross-call FIFO promise; empty batches observe lifecycle. Test SQLite rollback, JSON single replacement and whole-document limit, memory publication, and Web Storage failure after an earlier successful write. |
| Visibility and scope | A blocked serialiser does not expose queued values; separate reads can see separate generations; overlapping prefixes and empty namespace/prefix behave literally; clear preserves other scopes and schema metadata. |
| Coordination | All operations share a connection lock across stores; own batches wait normally; external transactions reject without mutation; failure continuation, confirmed rollback, poisoned state, and independent-connection busy results are tested. |
| Initialisation | Existing open/validate/migrate/close completes before public I/O; multiple stores share startup; missing reads/delete/clear/delete-only batches do not create files; first prepared write creates; later appearance is detected; known-file disappearance, unknown schema, and failed migration reject. |
| Schema and codec | Exact UTF-16 strings including NUL, BOM, lone surrogates, and prefix wildcard characters round-trip on both runtimes. Test malformed BLOBs, missing/conflicting metadata, transactional version changes, and competing migration attempts. |
| Lifecycle | Pending preparation/decoding counts as work; disposal drains successes and failures and stops admission; borrowed databases remain open; shared managed disposal never closes another store's active work; normal idle close permits reopen. |
| Timer and failure races | Use an injected clock/native boundary to test new work at timer expiry, stale generation callbacks, init/dispose overlap, unref, background hook failures, retained faults, and subscriber release. Verify selected cases against native connections. |
| Filesystem and durability | Test encoded path characters, aliases, replacement/deletion, permissions, create races, persistent volume placement, close failure, WAL recovery, and option conflicts. Separate process-exit evidence from power-loss claims. |
| Packaging | Packed consumers exercise the new subpath and both factories. Neutral/browser graphs remain Node-free and dependency-free. Qualify the declared Node/Deno versions, leaving older entries' compatibility unchanged. |
| Application integration | Awaited persistence, rerunnable partial imports, destination precedence, separate reset marker, interruption ordering, and storage errors are covered by consumer tests. Confirm the application workflow with representative state volumes. |
| Cost | Measure startup/reopen, idle churn, peak batch memory, event-loop stalls, and representative large imports. Compare durability settings under an explicit recovery policy; the 1-second grace period is still provisional. |

Use focused ValueStore and browser checks during implementation, followed by
the affected packed-consumer and workspace gates required by
[CONTRIBUTING.md](../../CONTRIBUTING.md). Native Node and Deno checks supplement
those gates. The candidate source and native tests are in `packages/value-store/src/sqlite`
and `packages/value-store/test/sqlite.test.ts`; `test/sqlite-runtime.mjs` exercises
the built entry on Node and Deno with an 11 MiB value. Application integration and
release qualification remain separate. Deno 2.9.7 managed-file checks require
`--allow-all`: scoped permissions incorrectly resolve the
existing-only URI as an ordinary path. The adapter retains existing-only opening
and reports failure instead of falling back to a create-capable open.

### Reproduce the native cost probe

After building ValueStore, run `node packages/value-store/bench/sqlite.mjs` from
the repository root. The separate benchmark writes 70,000 entries in batches of
1,000, verifies every entry after reopening, and samples startup/idle reopen,
individual commits, RSS, and event-loop delay under FULL and NORMAL. It uses
private temporary files and cleans them in `finally`. The single-process read
loop deliberately does not yield between reads, exposing the event-loop cost
of that caller pattern. RSS is sampled at batch boundaries in one process;
it is not a per-operation allocation profile. No absolute timing threshold is
part of the functional gate, and these observations do not select an optimal
idle grace period or qualify a complete application workflow.
