# Managed Worker execution

The experimental `@vrtmrz/rpc/worker` entry provides a standard composition for
one dedicated Worker, a pool that assigns work to connections, and an optional
stream over a dedicated message port. Applications supply the Worker factory
and the handlers, and choose pool size, admission limits, and which work to
prepare in advance. The [Worker guide](worker.md) shows application composition.

## Worker connection

Call `connectWorkerRpc({ contract, createWorker })` on the host. Call
`serveWorkerRpc({ contract, port, register })` in the Worker. The Worker script
invokes `register` with the typed handler registrar and the server lifetime
signal. Registration may finish asynchronously. A private versioned message
confirms that registration finished and makes the typed client available through
the host connection's `ready` promise. An application can start connections early
and run a domain operation after `ready` to fill its own caches.

The composition uses the existing identity codec and Worker transport with
`binary-data-and-ports` selected on both sides. Each dedicated channel uses its
own fixed pair of peer addresses. The ordinary transport entry still defaults
to `binary-data`. Worker creation and port capabilities are structural, so the
same composition can run against a real Worker or an injected test double.

The host owns the Worker from successful creation through `terminate()`. The
host closes on explicit `close(reason?)`, a Worker `error` or `messageerror`, a
registration failure, or a startup deadline. The default startup deadline is
10 seconds and can be overridden using `startupTimeoutMs` and an injectable
`RpcScheduler`. The first terminal reason rejects startup or active RPC calls,
aborts the connection's `signal`, detaches listeners, and terminates the Worker
once. The endpoint's `close` and `closeAsync` accept an optional `RpcError` for
reason propagation. Closing the server explicitly reports shutdown to the host.
Unexpected external termination without a Worker error event requires the
owner to close the connection. Per-call deadlines still govern individual waits.
Disposing a managed client closes its owned connection.

## Worker pool

`createWorkerPool({ size, createConnection })` accepts any owned connection
with a `ready` promise, lifetime `signal`, and `close()`. It starts its fixed
number of slots on `start()` or `acquire()`. `start()` waits for all slots and
returns their ready connections so the application can prepare each one. If a
slot fails during startup, `start()` rejects and the ready slots remain owned by
the pool. Close the pool if the host abandons it after that failure.
`acquire()` uses a ready slot with the fewest outstanding leases, rotating
ties in slot order, and waits for startup only when no slot is ready. The pool
replaces an ended connection on subsequent demand and leaves interrupted work
to the caller. Closing the pool closes every current connection once and
prevents new acquisition.
Demand made synchronously by a connection factory shares the current slot
creation pass. Acquisition checks whether an existing connection has already
ended before placing work.

A lease exposes the connection, its ready client, and an idempotent `release()`.
The placement count tracks the leases held by the caller. An application can
hold a lease for Worker execution and release it when execution ends or the
connection terminates. A local RPC timeout only ends the caller's wait. The
application can also limit concurrently open splits independently of placement.
Each opened stream stays with its producing Worker, which can receive other RPC
calls between pulls.

## Streams over dedicated ports

Use an ordinary RPC method to start a stream. The method takes copied arguments,
such as a `Blob`, and declares a required result transfer. Its handler returns
`serveWorkerStream(...)`, which creates a channel and transfers the reading port
in the reply. The client passes the received port to `readWorkerStream(...)`.
Only setup uses RPC envelopes. Subsequent pulls, chunks, completion, errors, and
cancellation travel on the dedicated port. Both ends can use the lifetime signal
of their Worker RPC connection. This keeps the existing transfer rules for
whole envelopes, including the exclusion of a `Blob` in an envelope carrying a
non-empty transfer list.

The producing side receives an injected channel factory and a source factory.
It opens the iterator on the first pull and sends one chunk for that pull. The
reader exposes one `AsyncIterableIterator` and permits one outstanding `next()`.
Pass `maxChunkBytes` to both ends. A string is charged two bytes per UTF-16 code
unit and a `Uint8Array` is charged the size of its backing `ArrayBuffer`. The
producer checks the charge before sending and the reader checks it on receipt.
When `transferChunks` is enabled, a binary chunk moves its backing buffer. The
source must supply an exclusively owned buffer that is fully covered by the
view. Strings continue to be copied.

Pass the same `createWorkerStreamBudget(maxBytes)` result to readers that share
a receiving memory budget. Before sending a pull, a reader reserves its maximum
chunk charge. Reservations wait in order when the budget is full. Delivery to
the iterator, cancellation, and failure release the reservation. This bounds
the payload capacity reserved for outstanding reads, including messages in
flight. Source input, transport overhead, and chunks retained by an application
after delivery have separate lifetimes.

The reader claims the port when it is opened. The producer expires an unclaimed
port after 30 seconds by default. The deadline can be overridden using
`claimTimeoutMs` and an injected scheduler. This bounds unused resources after
a failed or abandoned RPC result before any source work begins. Normal
completion closes both ports. Returning the reader sends cancellation, abandons
the local read, and closes the reading port. The producer signals cancellation
to the source and calls its iterator's `return()` on early termination. A source
that awaits or performs lengthy work must observe the supplied signal for prompt
cooperative cancellation. Closing a connection rejects a pending read with its
termination reason and releases the reader's budget and port. Cooperative
source cleanup runs while the Worker is live. Host termination stops the Worker
directly.

The repository fixture `packages/rpc/scripts/browserWorkerVerify.mjs` exercises
the full composition. Its Worker receives a copied `Blob`, registers a producer,
and returns a transferable reading port. Its host reads the result while using
the same Worker for a unary call between pulls.

## Verification

Test the connection against a controllable Worker with delayed registration,
startup failure, and errors after readiness. Exercise assignment and replacement
through the pool's public acquisition API. Use actual message ports to verify
that generation waits for a pull, ownership moves on transfer, and cancellation
releases a byte reservation while another reader is waiting. A real Worker
composition should cover both a unary call and a streamed result. These checks
exercise the adapter contract; a consumer still owns its handler behaviour and
runtime-specific integration tests.
