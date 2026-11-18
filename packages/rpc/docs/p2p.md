# P2P RPC

`@vrtmrz/rpc/p2p` provides the initial P2P implementation derived from Commonlib
0.5.0. The package remains private and unreleased. It speaks the existing JSON
RPC protocol; adopting it in LiveSync is a separate integration change.

```ts
import { RpcRoom, type TransportAdapter } from "@vrtmrz/rpc/p2p";

declare const transport: TransportAdapter;
const room = new RpcRoom({ transport });
room.register("example.echo", (_peerId, value: string) => value);
const reply = await room
  .session("peer-id")
  .call<string>("example.echo", ["hello"]);
await room.session("peer-id").notify("example.progress", [1]);
room.close();
```

The host supplies sending, incoming messages, and optional join/leave events.
The room borrows this transport; `close()` releases RPC state and subscriptions
without closing the connection. The host selects peers and owns authentication,
admission policy, reconnection, and replication scheduling.

## Calls, notifications, and handlers

Calls wait for a remote result. The default deadline is 30 seconds; pass a number
or `{ timeoutMs, signal }` as the third call argument to override it. Non-positive
timeouts disable the deadline, while leaving cancellation active. The generic
result type is a caller assertion, not a method schema or runtime validation.
Arguments and wire error details use JSON values. If registering the deadline or
abort listener throws, the call rejects before sending the request.

A handler can complete an update even if sending its result fails. The receiving
room reports that failure through `onProtocolWarning` and, while the request is
active, attempts an error reply identifying the completed method. If neither
reply reaches the caller, the caller cannot infer whether the update happened.

A call returning `void` still waits for a response. Notifications resolve after
local sending, without acknowledging remote handler completion. They create no
response wait or deadline. If the room closes or the peer leaves during a
chunked notification, the current transport send may still complete. If chunks
remain to be sent, the notification then rejects with `NOT_CONNECTED`.

Fan-out is an explicit host loop over approved peers; there is no required multicast API.

Registering the same namespaced method replaces its handler. Set
`{ serial: true }` on registration to serialise that method across callers.
`registerCancellable` supplies invocation context before the peer ID and arguments.
To retain native signal types for a host API, inject its controller:

```ts
const room = new RpcRoom({
  transport,
  createAbortController: () => new AbortController(),
});
room.registerCancellable(
  "example.read",
  async (context, _peerId, url: string) => {
    const response = await fetch(url, { signal: context.signal });
    return await response.text();
  },
);
```

The default controller is also the host's native `AbortController`, resolved
when a request arrives. Injecting its factory makes the full native signal type
available to TypeScript without requiring DOM types in the neutral package.
Cancellation is cooperative: local settlement does not prove the remote work
stopped. A cancelled handler's result is not sent as a late reply.

`canAcceptRequest(peerId, method, context)` may await a host decision. Returning
`false` intentionally sends no reply, preserving existing timeout semantics.
Do not interpret this as a negative acknowledgement. RPC continues cleanup when a diagnostic observer throws or returns a rejected
promise.

## Injection and wire compatibility

Optional `codec` replaces envelope encoding/decoding; its encoded value is a
string because this P2P profile retains JSON-style string framing. Both peers
must agree on any custom representation. The default codec and framing preserve
the old handshake, request/response/cancel envelopes, notification flag, and
legacy error code/message/details. Larger messages use the existing chunk and
acknowledgement protocol. Default chunk payload size is 32 KiB; the missing-chunk
quiet period is 350 ms.

`runtime.scheduleTimeout(callback, delayMs)` returns a cancellation function.
`runtime.createId(kind)` supplies request or chunk IDs; custom generators must
keep IDs unique within the active protocol scope. These overrides allow tests
to control deadlines and IDs without a real connection. Transport-specific
`postOptions` are typed and forwarded to each physical send in the room.

The caller sends cancellation after the request send completes. This preserves
wire-send sequencing, not a stronger guarantee that the remote side finished
reassembly before seeing cancellation. The implementation does not introduce
cancellation-history storage or automatic application retries.

This entry does not load the experimental Worker transport, transfer validation,
or stream machinery. Worker support remains an extension; its implementation
may share the exported structural session/room capabilities without sharing
this P2P protocol. A custom codec alone does not make this JSON profile a binary
Worker implementation.

## Validation scope

The package tests use the pinned Commonlib reference and an independently
controlled transport. A separate [LiveSync compatibility check](../../../docs/proven-in-use.md#p2p-rpc-compatibility)
verified a fetch and return edit between a Fancy Kit test build and a standard
LiveSync peer in two real Obsidian Vaults. A downstream integration must
verify its provider and database facade, admission policy, connection freshness,
and room lifecycle, including callbacks from retired connections.

Package validation uses `npm run check --workspace @vrtmrz/rpc`,
`npm run test --workspace @vrtmrz/rpc`, and
`npm run build --workspace @vrtmrz/rpc` from the repository root. Compatibility
tests cover old/new communication in both directions and new/new communication.
The pinned-reference baseline calibrates the harness; it is not itself evidence
for the new implementation.
