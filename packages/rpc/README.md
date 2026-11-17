# RPC (`@vrtmrz/rpc`)

This private, unreleased package provides P2P calls and notifications through
`@vrtmrz/rpc/p2p`, derived from Commonlib's existing `RpcRoom`/`RpcSession`
protocol. Start with the [P2P guide](docs/p2p.md) for usage, admission,
cancellation, serial handlers, and dependency injection.

The host owns connections, peer approval, and replication policy. The package
has not been adopted by downstream LiveSync automatically. Worker communication,
transfer, and streams are extensions and may use an interface-compatible engine.

The earlier root `createRpcEndpoint` and `@vrtmrz/rpc/worker` exports remain
experimental. P2P does not import their Worker, transfer, or stream machinery.
The Worker adapter's non-empty transfer lists follow the
[Worker transfer profile](docs/worker-transfer-profile.md); copy-only sends use
platform structured cloning. Static rejection of shared-memory-backed views and
browser response-side detachment remain unverified. Browser-engine coverage is
incomplete; the adapter is not yet qualified for production use.

- [P2P specification](docs/specification.md): current behavioural contracts.
- [Design decisions](docs/decisions.md): implementation and responsibility boundaries.

The existing Commonlib runtime remains unchanged. The pinned reference under
`test/fixtures` supports compatibility tests and is not a production export.
