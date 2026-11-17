---
date: 2026-11-13
commonlib-version: "0.5.0"
self-hosted-livesync-version: "1.0.50"
status: accepted-unreleased
---

# RPC design decisions

## Use the existing P2P implementation lineage

The initial implementation derives from Commonlib `RpcRoom`/`RpcSession`.
It already contains the current caller model, admission behaviour, serial
execution, error details, handshake, and framing. Adapting the experimental
endpoint would require changes to dispatch and lifetime management in addition
to wire translation. Preserving current P2P behaviour is the immediate objective.

## Separate state ownership and inject external dependencies

`RpcRoom` composes outbound waits, inbound execution, and framing owners.
Substantial operations receive state and narrow capabilities explicitly.
Codec, transport, timer, ID, and controller boundaries support deterministic
tests. Reuse Octagonal Wheels `bindContext` and `createDeferredAction` for their
existing responsibilities rather than creating replacement infrastructure.

## Keep compatibility at the P2P boundary

The focused `@vrtmrz/rpc/p2p` entry retains the legacy wire and caller API.
A JSON codec alone cannot translate admission, readiness, cancellation ordering,
or error metadata between different engines. The P2P codec therefore remains
string-based, with the existing framing protocol as its composition.

Peer/request correlation and peer-owned framing cleanup are correctness
requirements. Incidental ID-only lookup or retention after departure is not a
compatibility promise. Behavioural corrections require regression evidence
against the original implementation.

## Keep host policy in the host

The transport is borrowed. The host owns authentication, approval, connection
freshness, reconnection, fan-out selection, database facades, and replication.
No generic PouchDB bridge, native multicast API, or Worker pool is required to
move the actual P2P caller.

## Admit extensions without forcing one engine

Worker implementations may share structural caller/server capabilities while
using a different wire and state engine. A real composition and shared contract
tests must demonstrate that boundary before adoption; type compatibility alone
is insufficient. Transfer and streams remain explicit extensions. Their safety
requirements apply when used, without becoming prerequisites for P2P migration.

## Use focused verification

Keep an immutable, pinned Commonlib reference separate from production source.
Run the same cases in both old/new directions and between new peers. Test state
owners through narrow dependencies and retain composition tests. Distinguish
Node transport simulations, actual browser transport checks, downstream adoption,
and performance evidence. None substitutes automatically for the others.

The package remains private and unreleased. Existing experimental root/Worker
exports are retained separately while the P2P implementation is validated;
they are not the recommended P2P integration.
