---
date: 2026-11-13
commonlib-version: "0.5.0"
self-hosted-livesync-version: "not reviewed"
fancy-kit-revision: "4aa2e1b4d003bdf6409299bbd34e1caed9dffa8a"
status: draft-unreleased
---

# Reusable RPC: codecs, transports, streams, and ownership transfer

This is the consolidated implementation specification for the proposed RPC
package in Fancy Kit. It is for implementers and reviewers, and describes future
behaviour. This package owns further design work; the earlier Commonlib draft is
historical input. Names in API sketches and the npm name remain provisional.
No implementation or package export is introduced by this document.

The [package architecture](../../../docs/architecture.md)
and [contribution rules](../../../CONTRIBUTING.md) govern dependency direction
and validation. This package does not extend the stable Commonlib API.

The source baseline is Commonlib commit
`52f65bfa6b355fc504ba3ff1bc46b0d775add490`, including its maintained LiveSync
integration. A separate Self-hosted LiveSync checkout was not reviewed, so the
frontmatter records that limit rather than borrowing a downstream version.
The existing [RPC specification](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/src/rpc/SPEC.md) remains the reference for the current
implementation. This proposal does not supersede it or the
[RPC ownership decision](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/docs/development.md#open-10-documentation-decisions).

## 1. Purpose and scope

One RPC core should support JSON-based P2P communication and lightweight Worker
communication while preserving testable call, notification, cancellation, and
lifecycle semantics. It must support multiple peers without requiring every
transport to offer native multicast.

The first implementation scope proposed here includes:

- typed codecs and transport-specific sending options;
- single-peer calls and notifications, and notifications to an explicit peer set;
- optional single-peer result streams with bounded prefetch and cancellation;
- explicit, optionally mandatory ownership transfer for selected data;
- MessagePort, SharedWorker, BroadcastChannel, and Trystero compositions;
- a compatibility composition for the existing LiveSync RPC wire protocol; and
- independent entries for the core, transport integrations, and PouchDB bridge.

Multiple-response calls (`callMany`), client-input/bidirectional streams, worker pools,
automatic peer discovery, durable delivery, automatic application retries, and
automatic reconnection are deferred. Application authentication, peer approval,
replication policy, and LiveSync settings remain host responsibilities.

In this draft, MUST and MUST NOT express proposed conformance requirements;
SHOULD expresses a recommendation. They do not assert current implementation
compliance. A **profile** is a compatible choice of codec, framing, transport,
and protocol version.

## 2. Existing behaviour and proposed boundaries

The current Room already manages multiple peers. Each `call` and `notify`
targets one peer. LiveSync's change relay loops over eligible peers to send
`onProgress` notifications; a receiving follower then pulls from that source.
Document replication remains a sequence of peer-specific exchanges.
Advertisements already use Trystero's broadcast facility.

The reviewed Commonlib installation uses Trystero 0.26.0, which supports a
single target, a target array, or all connected peers. Its underlying data channels still send to individual peers.
Using a multicast API does not make network traffic independent of peer count.

| Owner               | Responsibility                                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| RPC core            | Method dispatch, request IDs, pending calls, replies, notifications, deadlines, cooperative cancellation, and peer/session isolation. |
| Optional streams    | One invocation's ordered result items, completion, failure, cancellation, and consumer-driven flow control.                           |
| Codec               | Convert an envelope to a transport payload and validate/decode incoming data.                                                         |
| Optional framing    | Split, reassemble, acknowledge, and retransmit payload fragments when required by a profile.                                          |
| Transport adapter   | Send payloads, report the sender and connection identity, subscribe/unsubscribe, and implement local sending options.                 |
| Host                | Own or borrow connections, select approved peers, compose profiles, and apply application policy.                                     |
| Application handler | Perform the registered computation and own application resources, including their cancellation and disposal.                          |

**[BOUNDARY-1]** The core MUST NOT import LiveSync settings, connection strings,
database implementations, browser documents, or Trystero. Timer and ID generation
dependencies MUST be replaceable for tests. Existing Octagonal Wheels
`deferredAction` and `context` helpers are reusable candidates; their use does
not require importing Commonlib's environment module.

**[BOUNDARY-2]** JSON conversion, UTF-8 size calculation, and chunk state MUST
be optional composition concerns. A MessagePort profile MUST be usable without
loading JSON framing, PouchDB, or Trystero. Framing owns its buffers, timers,
peer-specific acknowledgements, and cleanup; close and peer departure MUST
reach that owner.

**[BOUNDARY-3]** Result streaming MUST be an optional entry or composition.
A unary-only Worker client MUST NOT acquire stream queues, credit tracking,
or additional per-call messages merely because another client uses streams.

An application handler is the function supplied at method registration. Its
computation can live in an independently testable module that does not import
RPC. For example, a Worker handler can call a Wasm module that owns its instance,
allocations, execution, and disposal. The RPC layer supplies invocation context
and transports values. This application wrapper is not a transport adapter or
an additional mandatory execution layer in the core.

## 3. Types and codec composition

The following is a boundary sketch, not the complete public API:

```ts
interface Codec<Envelope, Wire> {
  encode: (envelope: Envelope) => Wire;
  decode: (input: unknown) => Envelope;
}

interface PeerAddress {
  peerId: string;
  instanceId: string;
}

interface Sender<Wire, PostOptions> {
  send: (
    target: PeerAddress,
    payload: Wire,
    options?: PostOptions,
  ) => void | Promise<void>;
}
```

**[TYPE-1]** Composition MUST connect the codec's encoded type with the
transport's accepted payload type. A factory SHOULD infer these types from
the supplied implementations. Separate outgoing and incoming wire types MAY
be added when an actual asymmetric transport requires them.

**[TYPE-2]** Sending options MUST retain the selected transport's type through
the public client API. A MessagePort adapter can accept a transfer list;
BroadcastChannel cannot. An adapter MAY use a typed argument tuple internally,
but raw platform overloads need not become the public RPC call signature.
Passing options as untyped `any` does not satisfy this requirement.

**[TYPE-3]** Both client and handler registration MUST derive method names,
argument tuples, and results from a shared API contract. The contract MUST
represent a `void` result independently from notification-only invocation.
It MUST also be able to declare input and result transfer requirements.
Stream methods additionally declare their yielded item type and item transfer
requirements; invoking a stream method as an ordinary call or notification is
a contract error, checked statically where possible and at runtime otherwise.
TypeScript types do not replace runtime validation at the receive boundary.

**[CODEC-1]** The JSON profile accepts JSON-compatible values, with an explicit
representation for a successful `void` result. The Worker profile accepts its
platform's structured-clone-compatible values. The core MUST NOT constrain all
profiles to `JsonLike`, nor claim that arbitrary JavaScript values are portable.

**[CODEC-2]** The default Worker codec passes outgoing envelope objects through; the
platform performs structured serialisation in `postMessage`. It MUST NOT add
an unconditional preliminary `structuredClone` or JSON round trip. Incoming
envelope fields still require validation. Codecs MUST NOT detach resources;
ownership transfer occurs at the transport send boundary.

**[CODEC-3]** Encode failures MUST settle the local operation without leaving
a pending wait. Invalid incoming envelopes MUST be rejected before dispatch
and reported through bounded diagnostics without argument or credential dumps.
An ordinary call whose result cannot be encoded SHOULD receive a representable
RPC error. If that error cannot be sent, the receiver reports the local failure;
the caller can only observe its deadline or disconnection.

## 4. Calls, notifications, and completion

| Operation      | Success means                                                                                             | Remote handler errors                            |
| -------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `call<Result>` | A matching successful response supplied the result.                                                       | Reject the call with a normalised remote error.  |
| `call<void>`   | A matching response confirms handler completion, without a result value.                                  | Reject the call.                                 |
| `notify`       | Local encoding and transport sending completed, including required framing sends.                         | Report locally at the receiver; no RPC response. |
| `notifyMany`   | Every selected peer has a recorded local sending outcome.                                                 | As for `notify`; no remote execution result.     |
| `stream<Item>` | Ordered items are available through an iterator; normal exhaustion follows a successful terminal message. | Reject iteration and terminate that stream.      |

**[CALL-1]** A response-bearing call MUST register its wait before sending and
remove all deadline/abort resources on settlement. Response matching MUST check
the expected peer and connection instance as well as the request ID. Responses
from other peers or retired connections MUST NOT settle a live call.

**[NOTIFY-1]** Notifications MUST carry an explicit no-response indication.
They MUST NOT allocate response waits or response deadlines. Receivers MUST
suppress both success and error responses, while preserving admission,
dispatch, and lifecycle handling. Framing acknowledgements are independent
of RPC responses.

**[NOTIFY-2]** A normal handler can receive both a call and a notification.
Returning `void` MUST NOT implicitly suppress a call's response. Discarding
a call Promise with the JavaScript `void` operator MUST NOT change protocol
behaviour. A notification-only method MUST be declared in the shared API
contract; an incoming response-bearing invocation of it is rejected with a
protocol error rather than silently left waiting.

**[CANCEL-1]** Call cancellation and timeout MUST settle the local wait promptly,
including while sending is pending. A remote cancel MUST follow the request
send, and a late send failure MUST NOT replace the local cancellation outcome.
The receiver creates its cancellation context before asynchronous admission.
After accepting a matching cancel, the receiver MUST suppress any subsequent
result response for that invocation. A caller whose wait has settled MUST ignore
a response that was already sent or arrives later. Remote cancellation is
cooperative and best-effort: local settlement does not prove cancel delivery or
remote termination.

**[ORDER-1]** New profiles MUST preserve request-before-cancel logical dispatch
for the same invocation through transport and framing. The receiver must create
the request context before processing its cancel; merely posting fragments in
order is insufficient. Framing MUST NOT let an asynchronous acknowledgement send
place cancel dispatch ahead of the reassembled request. Establish this property
without waiting for the application handler to finish or serialising unrelated
invocations. A composition that cannot establish it MUST reject the affected
profile before application dispatch.

The legacy compatibility profile preserves its existing wire and sending order,
but does not gain this stronger receiving guarantee. A cancel arriving before
request reassembly/context creation may not affect the later request. The local
wait still settles promptly and ignores late results. No cancellation tombstone,
automatic retry, or persistent recovery state is added by this proposal.

**[CANCEL-2]** Handler cancellation is cooperative. It does not pre-empt a
synchronous CPU-bound Worker handler, roll back completed side effects, or
restore transferred ownership. Notifications expose no remote-operation
cancellation handle in this scope. Callers requiring that control use a call.

**[DELIVERY-1]** A successful transport send MUST NOT be presented as remote
receipt or execution. A timeout or send failure MUST NOT be presented as proof
that no remote effect occurred. The core MUST NOT automatically retry calls or
promise exactly-once execution. Duplicate request delivery can repeat an effect;
application idempotency is outside this draft's guarantees.

The compatibility profile retains the current 30-second default call deadline,
non-positive no-deadline option, namespaced method validation, and per-method
serial execution. Serial execution is per registration in one Room, across its
peers. Creating a separate Room per port changes that sharing boundary.

## 5. Explicit and mandatory ownership transfer

**[TRANSFER-1]** Ownership transfer MUST be explicit. A local descriptor such
as `withTransfer(value, resources)` MAY express it; the exact helper spelling
is provisional. Creating the descriptor MUST NOT transfer anything. The receiver
gets the value, without the local descriptor or sending options.

**[TRANSFER-2]** A shared method contract MAY require transfer of designated
input resources, result resources, or both. This requirement means that a
copying fallback is forbidden. It does not require a non-empty transfer list
on control messages or on unrelated values. Result requirements apply only to
response-bearing calls; ignored notification results MUST NOT be transferred.

**[TRANSFER-3]** Binding a transfer-required API to an incapable transport MUST
be rejected statically where types are known and dynamically otherwise. The
sender MUST validate the required resource selection before posting. An omitted
resource, duplicate resource, unsupported resource, or unavailable capability
MUST fail without an intentional copying fallback. Transferable resources
MUST be reachable from the actual encoded payload; transferring an unrelated
buffer while sending a copy does not satisfy the requirement.

The initial resource scope is platform-transferable objects, particularly
`ArrayBuffer`. A typed-array view designates its backing buffer. `Blob` cloning
and `SharedArrayBuffer` sharing are not ownership transfer. Resource selection
MUST be explicit or defined by the method's schema; automatic traversal of
every object is not required. Transferring a backing buffer affects all its
local views, including views outside the argument object.

**[TRANSFER-4]** Input and response sending MUST enforce their own requirements.
A caller-side option alone cannot guarantee response transfer. If a handler
cannot satisfy a required result transfer, the server MUST fail the call using
a representable RPC error rather than silently copy the result.

**[TRANSFER-5]** The transport MUST document when it invokes the platform post
operation. Once a resource has transferred, abort, timeout, or a later failure
does not restore ownership. A rejected operation alone does not establish
whether resources remain usable. Validation SHOULD precede posting, but the
library MUST NOT promise transactional rollback of platform transfer failures.

**[TRANSFER-6]** Framing MUST NOT retain detached resources for retransmission.
A profile requiring retransmission of those resources is incompatible with
transfer-required sending unless it separately defines a valid ownership model.
The initial Worker profile performs direct posting without RPC chunk retries.

Transfer specifies ownership, not guaranteed physical zero-copy or a numerical
performance improvement. Platform behaviour and end-to-end costs require
measurement.

## 6. Notifications to multiple peers

**[MANY-1]** `notifyMany` accepts an explicit peer set. It MUST snapshot and
deduplicate peer/instance addresses at invocation. Later joins do not become
recipients. An empty set returns an empty outcome list. A departed target
produces a failed outcome rather than being silently omitted.

**[MANY-2]** The host selects approved peers and exclusions. A multicast
optimisation MUST preserve this exact set and any host validity checks before
sending. It MUST NOT replace the selection with 'everyone currently connected'.

**[MANY-3]** Valid invocations return one outcome per selected target, in target
order: either local send completed or local send failed with an error. They
settle after all those sending attempts settle, without waiting for handlers.
One failure MUST NOT discard successes or prevent attempts to other selected
peers. Common preflight errors reject before any sending; a shared batch failure
without per-peer evidence MUST be reported as failed for each affected target,
without claiming that none received it.

**[MANY-4]** An adapter MAY provide native multicast; otherwise the composition
fans out individual sends. Encoding MAY be shared when the payload is identical
and the codec and transport preserve it for all recipients. Per-peer errors,
framing acknowledgements, and cancellation state MUST remain isolated.

**[MANY-5]** The initial API MUST reject a request to transfer the same owned
resource to more than one recipient before posting to any of them. It MUST NOT
silently copy, transfer only to the first peer, or downgrade a transfer-required
method. Applications can make separate sends with separately owned resources.
A future per-recipient payload factory or shared-memory profile is a separate
extension.

`callMany` is deferred because it additionally requires a recipient snapshot,
response collection rules, deadlines, partial results, and cancellation rules.
`notifyMany` does not imply that API.

## 7. Optional result streams

The initial stream API invokes one method on one peer and exposes an
`AsyncIterableIterator<Item>`. It is suitable for one Split request yielding
many pieces. It is not multicast, an ordinary call returning a collected array,
or a separate response-bearing RPC for every item. Public helper and wire-field
names below are provisional; their observable behaviour is specified here.

### 7.1 Invocation and message model

**[STREAM-1]** Creating the iterator MUST NOT dispatch work. Its first `next()`
validates options, binds the selected peer/instance, allocates a stream ID, and
sends one open request. One iterator has one consumer; the initial API permits
one outstanding `next()` and rejects overlapping `next()` calls locally without
advancing or cancelling the existing operation. Returning before the first
`next()` closes the iterator without sending or transferring resources.

**[STREAM-2]** A registered stream handler receives the request context and
returns an `AsyncIterable<Item>`, directly or asynchronously. Admission and
cancellation context setup follow the call contract. The producer's iterator
MUST be advanced only when item credit permits it. Synchronous handler work
remains cooperative; the library cannot pre-empt it.

Each message is associated with a stream ID and both endpoint instances:

| Message | Direction            | Meaning                                                                 |
| ------- | -------------------- | ----------------------------------------------------------------------- |
| open    | Consumer to producer | Method, arguments, stream limits, and initial cumulative item credit.   |
| credit  | Consumer to producer | Increased cumulative number of items the producer may send.             |
| data    | Producer to consumer | One or more items and the zero-based sequence number of the first item. |
| end     | Producer to consumer | Successful production has ended; includes the final item count.         |
| error   | Producer to consumer | Admission, handler, item encoding/transfer, or stream protocol failure. |
| cancel  | Consumer to producer | Stop this invocation and release its producer resources.                |

**[STREAM-3]** Streams MUST use a profile which delivers logical messages in
order without duplication within each direction of a stream, or a framing
adapter which establishes that property. An unsupported profile MUST be refused
before application dispatch. The stream layer MUST NOT silently add item retries.
Sequence/count validation rejects gaps, duplicate data, and inconsistent terminal
counts without yielding the same item twice. It does not establish recovery
after transport failure. Other streams may interleave independently.

**[STREAM-4]** A producer attempts to send at most one terminal outcome, `end` or
`error`, unless cancellation or disconnection prevents sending it. Once a
terminal send is attempted, its failure MUST NOT trigger another terminal send:
failure does not prove non-delivery. Empty streams end
with count zero. `end` carries no additional application return value. There is
no ordinary RPC success response after the terminal message, and no RPC response
to individual data or credit messages. Late messages for a closed stream are
ignored. They MUST NOT reopen it or create retained state.

### 7.2 Bounded prefetch and batching

**[FLOW-1]** The stream profile MUST supply a finite positive integer prefetch window
`W` in items and a finite positive maximum logical item cost `B`. It MUST define
a non-negative, conservative cost function for its supported item types and the
unit used. For binary data this can be byte length; a string profile can use a
conservative code-unit cost without an extra UTF-8 encoding pass. Unsupported
value types cannot bypass accounting. These bounds describe logical payload,
not exact JavaScript heap use or memory allocated inside an application producer.

**[FLOW-2]** Initial credit permits at most `W` items. Subsequent credit is a
monotonically increasing cumulative limit, replenished only as items are handed
to the consumer's pending `next()`. At most `W` authorised items may remain
undelivered to the consumer, including buffered and in-flight items. Repeated
credit limits grant nothing extra. The producer MUST wait at zero credit rather
than continuing to drain an iterator into an internal unbounded queue.

**[FLOW-3]** Each produced item MUST be checked against `B` before sending or
transferring it. An oversized or unaccountable item terminates the stream with
an error; it MUST NOT trigger silent aggregation, copying, or automatic splitting
of the application's item. Receiver validation MUST enforce the same limits and
credit window. A malformed or over-credit data message fails the affected stream.

**[FLOW-4]** Data and credit MAY be batched. A data batch consumes one credit
per item and preserves item boundaries and order. Batch formation MUST NOT wait
for a full window when a consumer is waiting and data is available. A terminal
message or cancellation MUST NOT wait for item credit; the producer may still
need credit to advance an iterator far enough to discover its natural end.
Credit updates are flow control, not per-item handler-completion acknowledgements.

This bounds the stream layer's logical outstanding payload by its configured
window and item bound, with only bounded batch/accounting overhead. Transport
and framing queues must honour the same sending discipline and their own limits;
a consumer cannot constrain memory already retained inside an application handler.

### 7.3 Completion, cancellation, and ownership

**[STREAM-5]** A valid `end` irrevocably completes remote production. The consumer
stops granting credit and detaches its deadline, abort, and peer-lifecycle hooks,
then drains already received ordered items before returning `done: true`.
Subsequent remote messages, disconnection, abort, or late send rejection cannot
replace that success or discard unread items; send rejections are still observed
and diagnosed. Explicit iterator `return()` or `throw()` may discard unread items
locally as described below, without cancelling completed remote production.
Before valid `end`, on `error`, protocol failure, abort, deadline,
or disconnection, it discards buffered items, rejects a pending `next()`, and
retains the terminal error for later `next()` calls. Previously yielded items
remain valid observations; they are not rolled back. This is a fail-fast error
policy rather than a promise to deliver buffered items after failure.

**[STREAM-6]** Iterator `return()` (including a `for await` loop's early break)
discards buffered items, finishes pending iteration with `done: true`, and
requests remote cancellation if opened and remote production has not ended.
Iterator `throw(error)` terminates locally with that error and requests
cancellation under the same condition. Local iterator termination
MUST NOT wait for a remote acknowledgement or a blocked producer to finish.
Cancellation during an outstanding open send preserves open-before-cancel order.
An already-aborted signal fails before opening or transferring input. An explicit
return after failure releases resources but does not erase the recorded failure
for subsequent `next()` calls.

**[STREAM-7]** Cancellation or terminal producer failure aborts the context and requests its
iterator's `return()` when available, observing any rejection. In-progress
iterator work may finish, but MUST NOT send additional items after cancellation.
If asynchronous handler initialisation supplies an iterator after cancellation,
it MUST be disposed without being advanced. Application adapters own resources
allocated before an iterator starts; merely calling `return()` on an unstarted
generator does not guarantee that its body or `finally` block will execute.
The stream owner removes listeners, timers, credits, and buffers on termination.
After successful `end`, unread receiver items remain owned by the iterator until
consumed or explicitly discarded by iterator `return()` or `throw()`. Closing a
peer binding fails only its unfinished streams; closing the Room fails all
unfinished streams. Neither invalidates items retained after valid `end`.

**[STREAM-8]** Stream options may specify an overall `timeoutMs`, measured from
first dispatch until a terminal message is received, including time waiting for
credit. The default is no overall stream deadline; non-positive values also
disable it. There is no implicit inactivity timeout for a paused consumer.
Abort, iterator return, peer departure, and explicit close remain available.
This differs intentionally from the legacy unary-call deadline. Hosts must close
bindings or set a deadline when their transport cannot report abrupt departure.

**[STREAM-9]** Input transfer follows the ordinary invocation contract. A
stream method can separately require ownership transfer for designated resources
in each yielded item. Transfer occurs only when that item is sent under credit;
neither credit exhaustion nor cancellation permits a copying fallback. Once
transferred, a resource cannot be reused in a later item without reacquiring
ownership. Discarding a buffered transferred item does not return its ownership
to the producer. Batching MUST preserve transfer-list validity and per-item
requirements. The initial stream profile provides no replay of transferred data.

**[STREAM-10]** Open, credit, data, or terminal sending failures MUST terminate
the affected local stream and release its resources, except that valid `end`
already received by a consumer retains precedence under [STREAM-5]. A consumer
sends a best-effort cancel when it can still reach an unfinished producer; a
producer sends a representable stream error when possible and no terminal send
has been attempted. Failure of that follow-up send MUST
be consumed and diagnosed, not retried automatically. The other endpoint may
only learn of failure through its configured deadline or connection lifecycle.
Local protocol failures likewise request cancellation rather than leaving an
unbounded producer running. Cleanup MUST NOT depend on successful follow-up
sending.

### 7.4 Existing Background processing and compatibility

Encrypt/Decrypt remain unary methods. Split can yield its existing strings from
its existing Blob input; this does not require converting either to transferable
buffers. `null` is an application value if allowed by the item type, not the
stream protocol's end marker. A compatibility wrapper converts the current
Split end-of-data marker to iterator exhaustion and preserves the current empty
input behaviour where an empty string is emitted.

The host's round-robin scheduler selects one Worker when the stream first
dispatches. All items, credits, cancellation, and cleanup remain bound to that
Worker instance. Scheduling does not occur per item. A failed Worker fails its
assigned unary calls and streams without terminating other Workers. Pool
management remains outside the RPC core.

The current foreground Split wrapper dispatches work when its function is
called, before its returned generator is consumed. The new stream API dispatches
on the first `next()`, including Worker selection and any input transfer. This
is an intentional start-timing difference. A migration must test callers which
create jobs before consuming them and explicitly decide whether an eager legacy
facade is needed; it must not silently claim identical scheduling.

The current Split sender emits without waiting for downstream consumption.
Consumer-driven credit is a new behaviour and must be tested with a slow consumer;
the current foreground `TransformStream` alone does not provide remote flow
control. Legacy JSON RPC peers do not acquire stream support automatically.
Both endpoints must explicitly select a stream-capable profile/version before
opening a stream; new stream frames MUST NOT be sent to an unmodified legacy peer.

## 8. Profiles and connection lifetime

| Profile                        | Payload and ownership                                  | Peer handling                                                                                      |
| ------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Dedicated Worker / MessagePort | Structured serialisation; explicit transfer supported. | One remote endpoint per port; host binds the connection identity.                                  |
| SharedWorker                   | The same MessagePort profile.                          | Worker receives ports through `onconnect`; an adapter can aggregate them into one multi-peer Room. |
| BroadcastChannel               | Structured serialisation; no transfer list.            | Adapter adds routing and instance identifiers and filters recipients.                              |
| Trystero                       | Existing JSON/framing profile initially.               | Adapter maps peer IDs and may use explicit target arrays for eligible notifications.               |

**[LIFE-1]** Subscription setup MUST complete before the endpoint is advertised
as ready. MessagePort adapters using event listeners MUST start message delivery.
Readiness and discovery belong to the host/adapter; construction MUST NOT
silently start application database or replication work.

**[LIFE-2]** Disposing a session or port binding MUST affect only that binding.
Closing a Room rejects its waits, aborts its inbound contexts, disposes framing
state, and removes its subscriptions. Transport ownership MUST be explicit:
unsubscribing from a borrowed transport does not terminate a shared Worker or
close a connection owned by another component. Async owned shutdown must have
an awaitable completion path; legacy `RpcRoom.close()` remains a compatibility
facade with its current synchronous local cleanup.

**[LIFE-3]** The adapter MUST associate each received message with a current
peer/connection instance. A retired connection's delayed callback MUST NOT
act as its replacement. Normal application exit MAY signal departure; sudden
termination need not deliver that signal. Deadlines remain available. Heartbeats
and reconnection policy MUST NOT be mandatory core dependencies.

**[BC-1]** BroadcastChannel routing MUST identify the sender instance and
intended recipient instance in addition to the request ID. A response or cancel
targets its original counterpart. A broadcast request MUST NOT accidentally
become multiple responses to a single-peer `call`.

**[BC-2]** Routing fields provide selection, not authentication or confidentiality
between channel participants. The host must choose a suitable trust boundary.
Channel membership is limited by the platform's storage partition and channel
name; this profile MUST NOT claim cross-origin or cross-partition discovery.
No reliable peer-presence service is implied.

## 9. Compatibility and extraction

**[COMPAT-1]** The existing LiveSync profile MUST retain its `rpc2` action,
JSON envelope shapes, raw/chunk/chunk-ack framing, namespaces, and current
version behaviour until an explicit protocol migration is designed. Codec
selection MUST NOT silently change an established peer's wire representation.
New instance identifiers or capability negotiation MUST NOT be injected into
legacy messages under an unchanged compatibility claim. Legacy connection
generations can be tracked locally; stronger remote incarnation guarantees
require a versioned extension.

**[COMPAT-2]** LiveSync retains peer approval, configuration exchange, change
feed selection, follow policy, and database replication. Its existing
notification flow remains: announce to approved peers, then let followers pull
individually. Using native multicast MUST preserve approval, exclusions, and
captured room validity across asynchronous work.

**[COMPAT-3]** The PouchDB bridge is a separate optional entry. Its one-shot
changes feed and error reconstruction remain DB-specific contracts. The core
entry MUST NOT re-export it in a way that pulls its EventEmitter implementation
into a core-only browser bundle. LiveSync-specific error conversion and room
configuration MUST be supplied by the host or moved out of the generic entries.

Existing numeric timeout overloads, `register`, `registerCancellable`, sessions,
and proxies can be retained by a compatibility facade. The new shared API typing
must not be presented as already provided by the current `call<T>` casts.

Errors MUST distinguish local encode/post/transfer failures, remote handler
errors, timeout, cancellation, and disconnection without parsing prose. Exact
new error-code names and their mapping to the existing `RpcError` codes remain
an API design decision. Diagnostic callbacks MUST NOT prevent cleanup.

## 10. Verification and performance criteria

The following are acceptance tests for a future implementation, not completed
verification of this draft:

| Contract                        | Required evidence                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typed composition               | Compile-time examples accept matching codec/transport types and reject mismatched wire types, unknown methods, wrong arguments/results, and transfer-required bindings to BroadcastChannel.                                 |
| Core lifetime                   | Fake-transport tests cover calls, void responses, notifications, encode/send failures, timeout, abort during send/admission, late responses, and cleanup.                                                                   |
| Peer isolation                  | At least three peers; wrong-peer and old-instance responses cannot settle another call. Closing one port leaves other peers operational.                                                                                    |
| Transfer                        | Real MessageChannel/Worker tests observe receiver values and sender detachment in both directions; cover required-transfer refusal, codec/resource mismatch, and cancellation before/after posting.                         |
| Fan-out                         | Three or more peers; exact eligible snapshot, duplicate/empty targets, partial send failure, later join/departure, and equivalent native/fallback outcome semantics. Transfer fan-out refusal occurs before any detachment. |
| SharedWorker / BroadcastChannel | Real browser tests cover multiple clients, readiness, routing, instance replacement, subscription disposal, and copy-only BroadcastChannel behaviour.                                                                       |
| LiveSync compatibility          | Existing RPC tests plus paired old/new profile tests cover call, notify, cancellation, chunk retransmission, and PouchDB replication. Host tests retain peer approval and follow-triggered pull behaviour.                  |
| Dependencies                    | Browser core and Worker bundles contain no PouchDB, Trystero, LiveSync environment module, or mandatory JSON framing.                                                                                                       |

Cancellation acceptance must include request/open-before-cancel dispatch with
delayed framing acknowledgements. Contrast the new-profile dispatch guarantee
with the legacy unary cancellation limitation; legacy peers do not support streams.

In-process identity transports cannot prove cloning, ownership transfer, or
cross-realm lifecycle semantics. Real transport tests complement pure tests.

Stream acceptance additionally requires:

- Lazy opening, no work before iteration, empty input, ordered items, and normal
  exhaustion; overlapping `next()` is rejected without corrupting the first wait.
- Handler/admission/encoding errors, invalid sequence/count/credit, errors with
  buffered items, early `return()`/`throw()`, and abort during open or production.
- Terminal sends which deliver before rejecting: no second terminal attempt.
  A valid `end` with unread items survives later abort, peer/Room close, and
  credit-send rejection; explicit iterator disposal still releases those items.
- A slow consumer with a small configured window: producer advancement and
  receiver buffering remain bounded, oversized items fail, duplicate credit
  grants nothing, and batched/unbatched delivery yields identical items.
- Explicit deadlines while waiting for credit, default no-deadline pauses,
  Worker crash, old-instance messages, and cleanup independent of a blocked
  cooperative producer.
- Per-item transfer and required-transfer refusal, cancellation before/after
  posting, batched transfer-list validity, and no reuse of detached resources.
- A real Worker pool running concurrent Encrypt and Split jobs: task affinity,
  existing empty-input results, incremental consumption, and failure isolation.
  Compare eager legacy job creation with lazy first-iteration dispatch.
- Refusal of stream methods by incompatible profiles and no stream machinery in
  unary-only bundles.

Performance comparison MUST report the baseline, payload type/size, peer count,
runtime, codec, and framing choices. Measure small-call latency, large-payload
copy versus transfer, allocation/retained memory after settlement, and fan-out
encoding work separately from transmitted bytes. Type parameters have no
runtime representation; codec dispatch still has a runtime cost. Worker profiles
SHOULD avoid preliminary copies, UTF-8 sizing, and chunk bookkeeping.
For streams, compare the existing Background Split path with small and large
inputs, many small pieces, slow consumers, and concurrent Encrypt jobs. Report
time to first item, throughput, peak outstanding payload, batching settings,
and credit traffic. Do not substitute full-result array timing for incremental
consumption or infer stream overhead from unary-call measurements.

The previous source experiment demonstrated JSON RPC over a Node Worker and
MessagePort; it did not implement this proposal. Existing unit tests and bundle
sizes do not establish browser, new-profile, or performance conformance.

## 11. Decisions still open before implementation

- Final package names, public factory/helper names, and the API-contract syntax.
- How transfer requirements designate resources within typed inputs/results,
  and how adapter capabilities propagate through the public factory types.
- Exact new-profile routing/version envelopes, readiness negotiation where
  required, and mappings to the legacy profile.
- Error-code names and the public representation of per-peer sending outcomes.
- Framing resource bounds and expiry under incomplete streams, and optional
  non-stream queue limits/backpressure. These must be specified before claiming support
  for sustained unreliable traffic; the legacy profile retains its current
  policy until a separately reviewed change.
- Measured performance budgets and the browser/runtime validation matrix.
- Stream profile defaults for the finite prefetch window and maximum item cost,
  profile-specific cost functions, batching thresholds, and exact frame encoding.
  The bounded-credit and iterator semantics above are the proposed contract;
  default values must be justified by the Background processing measurements.

These are review decisions, not permission to implement additional persistent
state, recovery machinery, or protocol changes. Input/bidirectional streaming,
pooled Workers, multi-response calls, and shared-memory delivery remain separate
extensions. Wasm-specific memory allocation and execution belong to application
modules called by registered handlers, not to this stream extension.

## Future Wasm composition

A Wasm-backed splitter can receive a complete binary input through one invocation
and yield its results through the optional stream layer. Pure binary packing and
unpacking can be factored into a codec where it is part of the RPC representation;
Wasm ABI memory access, execution, and allocation lifetime belong to the application
module called by the handler. A codec is not an invocation engine.

The inspected [rabin_karp_wasm wrapper](https://github.com/vrtmrz/rabin_karp_wasm/blob/931c5d5148e549630f4d3017b79f65d293b91d22/src/main.ts)
copies a complete `Uint8Array` into Wasm memory, advances a handle with
`yield_next`, and yields independent `buf.slice()` results. Transferring ordinary
input/output buffers across the Worker boundary does not remove those internal
copies. Its normal-exhaustion cleanup must be extended in a future integration
to cover early return, exceptions, and never-started iteration. Prefer lazy
resource acquisition and explicit disposal; do not rely on `return()` entering
an unstarted generator body. This is a source assessment, not runtime or
performance verification. The generated Wasm glue was not reviewed.

No Wasm integration, input stream, shared-memory ABI, or zero-copy guarantee is
part of the initial implementation scope.

## References

- [Current RPC specification](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/src/rpc/SPEC.md) and [implementation guide](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/docs/development.md#p2p-and-rpc-implementation).
- [Current P2P lifecycle](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/docs/p2p-transport-lifecycle.md).
- [Change notification fan-out](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/src/replication/trystero/TrysteroReplicator/changeRelay.ts) and [host composition](https://github.com/vrtmrz/livesync-commonlib/blob/52f65bfa6b355fc504ba3ff1bc46b0d775add490/src/replication/trystero/TrysteroReplicator.ts).
- [HTML Standard: Message ports](https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports).
- [HTML Standard: structured serialisation with transfer](https://html.spec.whatwg.org/multipage/structured-data.html#structuredserializewithtransfer).
- [HTML Standard: SharedWorker](https://html.spec.whatwg.org/multipage/workers.html#shared-workers-and-the-sharedworker-interface).
- [HTML Standard: BroadcastChannel](https://html.spec.whatwg.org/multipage/web-messaging.html#broadcasting-to-other-browsing-contexts).
