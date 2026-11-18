---
date: 2026-11-13
commonlib-version: "0.5.0"
self-hosted-livesync-version: "1.0.50"
status: accepted-unreleased
---

# P2P RPC specification

The initial package delivers the existing LiveSync P2P RPC contract through
`@vrtmrz/rpc/p2p`. The implementation is derived from Commonlib 0.5.0 at
`52f65bfa6b355fc504ba3ff1bc46b0d775add490`. The package remains private and
unreleased; the downstream LiveSync runtime has not been migrated.

This specification defines the current P2P contract. The [design decisions](decisions.md)
explain its boundaries, and the [P2P guide](p2p.md) describes consumption and
verification limits.

## Scope and ownership

P2P supports multiple peers, with one destination per call or notification.
The host owns peer discovery, authentication, approval, connection freshness,
reconnection, and replication policy. Approved-peer fan-out remains a host loop;
RPC does not add native multicast, automatic application retries, or durable
message delivery. Advertisements remain outside the RPC protocol.

`RpcRoom` composes a borrowed transport, codec, runtime, and three state owners:
outbound pending calls, inbound execution, and framing. Owners receive narrow
dependencies. `RpcSession` binds a peer without owning a connection. Shared
structural capabilities live in `src/service/contracts.ts`; they do not require
Worker, transfer, stream, Trystero, PouchDB, or Commonlib imports.

## Caller and handler contract

- `session(peerId).call(method, args?, timeoutOrOptions?)` resolves a remote
  result or rejects with an error. A numeric timeout and `{ timeoutMs, signal }`
  are accepted. The default is 30 seconds; a non-positive timeout disables the
  deadline without disabling cancellation. A `void` result still requires a reply.
  Failure to register a deadline or abort listener rejects the call before sending.
- `notify(method, args?)` resolves when local sending completes. It creates no
  response wait or response deadline, and does not acknowledge remote execution.
  Large notifications still participate in framing acknowledgements.
- Methods must contain `.` or `/`. Registration replaces an existing handler
  with the same name. Ordinary handlers receive `(peerId, ...args)`;
  cancellation-aware handlers receive `(context, peerId, ...args)`.
- `serial: true` serialises that registered method until each invocation settles.
  Pending serial work observes cancellation and room closure before executing.
- Arguments use JSON values. Caller-selected result generics and legacy proxy
  methods are convenience types, not schema validation.
- The host may resolve the current room for each operation. RPC does not cache
  the application's provider or impose a database facade. Method-specific
  deadlines, such as LiveSync's 40-second `bulkGet` timeout, remain caller policy.

`canAcceptRequest` may await an approval decision. RPC creates the invocation
context before awaiting it. A `false` decision intentionally sends no reply;
this preserves timeout behaviour for denied callers. Admission failures follow
request/notification error handling. Authentication bypass rules remain host policy.

## Cancellation and lifetime

Local abort or timeout settles a pending call promptly, even while sending is
held. After a successful request send, RPC sends any outstanding cancellation.
A late send failure does not replace an already settled result. Cancellation
is cooperative; it does not guarantee remote termination. Results from locally
aborted inbound work are suppressed.

The protocol promises request-before-cancel send sequencing. It does not
promise that remote reassembly and invocation-context creation precede cancel
arrival. No cancellation-history store is added to strengthen this legacy limit.

Responses must match the expected peer and request ID. Inbound contexts are
scoped to peer and request ID. Peer departure rejects that peer's pending calls,
aborts its active contexts, releases its incomplete framing state and waits,
and removes its cached session/version state. Other peers remain independent.
After departure or room closure, framing stops sending remaining chunks, including
retransmissions. A notification interrupted between chunk sends rejects with
`NOT_CONNECTED`. A completed payload awaiting its acknowledgement send is
discarded if the peer leaves or the room closes before dispatch.
Transport adapters remain responsible for excluding callbacks from obsolete
connections; the legacy wire contains no connection-instance identifier.

`close()` is idempotent. It rejects local waits, aborts inbound contexts,
clears framing buffers/waits, and removes subscriptions. It does not close the
borrowed connection. `cancel(peerId, requestId)` retains explicit cancellation,
including forwarding an unknown request ID as the existing API does.

## Wire and errors

The host sends the existing physical wire through its `rpc2` action or an
equivalent adapter. Logical envelopes are:

- `handshake`: major/minor version announcement, currently 1.0;
- `request`: request ID, method, argument tuple, and optional `expectsResponse: false`;
- `response`: request ID and either `ok: true, data` or `ok: false, error`;
- `cancel`: request ID.

The handshake does not add a mandatory readiness round trip. Known major-version
mismatches reject response-bearing requests; minor mismatches warn and continue.
Notifications do not receive RPC error replies.

Legacy errors preserve `code`, `message`, and optional JSON `details`. Categories
remain `TIMEOUT`, `NOT_CONNECTED`, `REMOTE_ERROR`, `CANCELLED`, and `PROTOCOL_ERROR`.
Local send failures remain observable. Unexpected handler exceptions are converted
without serialising arbitrary exception properties. If sending a successful result fails,
the receiver reports the completed method and send failure through
`onProtocolWarning`. While the request is active it attempts one error reply
with the original error code and details and a message identifying the completed
method. An undelivered reply leaves the outcome unknown to the caller.
Synchronous exceptions and rejected promises from diagnostic observers must
not interrupt settlement or cleanup.

Physical messages use `raw`, `chunk`, and `chunk-ack`. Default chunk payload size
is 32 KiB. A 350 ms quiet-period wait requests missing indices; new partial
fragments restart the wait. Reassembly cancels the wait before acknowledging
completion. Only the owning peer may acknowledge an outgoing stream. An empty
missing list acknowledges completion.
This is framing recovery, not an automatic retry of application operations.

## Injected boundaries

`Codec<Envelope, Encoded>` separates logical representation. The P2P composition
uses `Codec<RpcEnvelope, string>` because its framing processes strings. Default
JSON decoding checks the envelope shape. A custom codec is responsible for its
decoding contract, and both peers must agree on any custom representation.

`Transport<Wire, PostOptions>` separates physical sending and subscriptions.
P2P uses the legacy wire union and forwards room-level typed `postOptions` on
each physical send. Encoding happens once per logical envelope, before framing.

`Runtime` supplies timeout scheduling/cancellation and request/chunk ID generation.
A timer cancellation failure is reported as a warning. The cancelled callback
remains inactive and the room continues releasing other waits. Custom ID
generators must maintain uniqueness within the active protocol scope.
Native `AbortController` is the default at request time. Its factory can be injected
for host-specific signal typing and deterministic tests. Importing the package
must not establish connections or schedule work.

## Extensions

BGWorker support is an extension, and may use an interface-compatible independent
implementation. Common call/notify semantics and testable dependencies must remain
reusable. The P2P implementation need not carry Worker state, transfer validation,
stream queues, or multicast capability flags to admit that extension.

Mandatory transfer remains an explicit extension contract when selected; it must
not silently degrade to copying. The [Worker transfer profile](worker-transfer-profile.md)
governs that extension, not ordinary P2P calls. Streams, Worker-pool scheduling,
SharedWorker, BroadcastChannel, port forwarding expansion, and Wasm integration
are separate work. A codec handles representation; it does not own Wasm execution
or Worker scheduling.
