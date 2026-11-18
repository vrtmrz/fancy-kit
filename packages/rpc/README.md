# RPC (`@vrtmrz/rpc`)

This private, unreleased package provides P2P calls and notifications through
`@vrtmrz/rpc/p2p`, derived from Commonlib's existing `RpcRoom`/`RpcSession`
protocol. Start with the [P2P guide](docs/p2p.md) for usage, admission,
cancellation, serial handlers, and dependency injection.

The host owns connections, peer approval, and replication policy. Downstream
LiveSync still uses its Commonlib runtime. The experimental Worker adapter
supports calls, notifications, and ownership transfer. Stream methods are
reserved for a future extension.

The earlier root `createRpcEndpoint` and `@vrtmrz/rpc/worker` exports remain
experimental. The root endpoint accepts unary call and notification contracts.
Its `onDiagnostic` observer distinguishes encoding errors (`encode-failed`),
transport send errors (`send-failed`), and owned transport close errors
(`transport-close-failed`). A request send that fails after the call has
already settled reports `late-send-failure`.

The Worker adapter's non-empty transfer lists follow the
[Worker transfer profile](docs/worker-transfer-profile.md); copy-only sends use
platform structured cloning. Static rejection of shared-memory-backed views and
browser response-side detachment remain unverified. Browser-engine coverage is
incomplete; the adapter is not yet qualified for production use.

- [P2P specification](docs/specification.md): current behavioural contracts.
- [Design decisions](docs/decisions.md): implementation and responsibility boundaries.

The existing Commonlib runtime remains unchanged. The pinned reference under
`test/fixtures` supports compatibility tests and is not a production export.
