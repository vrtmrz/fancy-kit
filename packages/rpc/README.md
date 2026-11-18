# RPC (`@vrtmrz/rpc`)

This private, unreleased package offers the Commonlib P2P `RpcRoom` and
`RpcSession` protocol and an experimental profile for dedicated Workers. Build
the workspace and pack `@vrtmrz/rpc` to try it as a local tarball.

- [`@vrtmrz/rpc/p2p`](docs/p2p.md) provides P2P calls and notifications. The host
  supplies the transport and owns peer admission and replication policy.
- [`@vrtmrz/rpc/worker`](docs/worker.md) connects an application Worker factory
  to typed handlers. It provides readiness, shutdown, optional pooling, and
  pull-based streams over dedicated message ports.

The experimental root `createRpcEndpoint` accepts unary call and notification
contracts. Worker streams start with a unary call that transfers a reading
port.
Its `onDiagnostic` observer distinguishes encoding errors (`encode-failed`),
transport send errors (`send-failed`), and owned transport close errors
(`transport-close-failed`). A request send that fails after the call has
already settled reports `late-send-failure`.

Copy-only Worker sends use platform structured cloning. Sends with a non-empty
transfer list follow the [Worker transfer profile](docs/worker-transfer-profile.md).
The `WorkerTransferData` type excludes shared-memory-backed views. Dedicated
Worker and MessageChannel transfers have been verified in Chromium and Firefox,
including detachment at both ends. The Harness also verified managed Worker
transfer, streaming, and replacement after a controlled shutdown on an iPhone
running iOS 18.7 and Obsidian 1.15.1. The standalone WebKit browser suite
remains unverified.

- [P2P specification](docs/specification.md)
- [Design decisions](docs/decisions.md)
