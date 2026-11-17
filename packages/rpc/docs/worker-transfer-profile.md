---
date: 2026-11-13
commonlib-version: "0.5.0"
self-hosted-livesync-version: "1.0.50"
fancy-kit-base-revision: "3efcad04abf462b3addc95b1591ace75c88063d0"
status: accepted-extension-contract-unreleased
---

# Worker transfer data profile

This specification defines the accepted data restrictions for explicit Worker
ownership transfer. It applies to the experimental Worker extension and remains
separate from the P2P profile. Acceptance of this contract does not assert that
all implementation and browser verification requirements are complete.

## Scope and compatibility

**[WD-1]** This profile applies to the complete encoded payload of a Worker send
whose transfer list is non-empty, whether transfer is optional or required.
It applies independently to requests, notifications, results, and future stream
items. Checking only values inside `withTransfer` is insufficient: another part
of the same payload could execute code during serialisation.

With an empty transfer list, the adapter delegates supported values to the
platform's structured clone operation as before. This does not bypass required
input/result transfer checks. A required method still rejects an omitted or empty
resource declaration where that method requires resources.

Previously accepted transfer-bearing payloads containing class instances or
built-ins outside this profile must be converted by a codec or application
mapping. Copy-only methods retain their existing representation. The package is
unreleased; this is an intentional profile change, not a transparent bug fix.

## Supported encoded values

**[WD-2]** The default `binary-data` profile permits the following values:

| Value                                                | Rule                                                                                                                                    |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `undefined`, `null`, boolean, number, string, bigint | Copied as platform-supported primitives; symbols and functions are excluded                                                             |
| `ArrayBuffer`                                        | Opaque binary leaf; ownership transfer requires explicit designation                                                                    |
| Typed arrays and `DataView` backed by `ArrayBuffer`  | Opaque binary leaves; designate the actual backing buffer, not the view                                                                 |
| Ordinary arrays                                      | Own data properties only; traverse enumerable string-keyed data properties, including additional properties and sparse elements         |
| Plain records                                        | Prototype is the local realm's `Object.prototype` or `null`; own data properties only; traverse enumerable string-keyed data properties |

Repeated references and cycles among supported containers are permitted. Inspect
each container once. Non-enumerable and symbol-keyed data properties do not
establish resource reachability. Accessor properties on containers are excluded,
including non-enumerable and symbol-keyed accessors, whether getter or setter.
Inspect all own container descriptors (for example, with `Reflect.ownKeys`);
only enumerable string-keyed data properties form traversal edges. Ordinary arrays use the local realm's
`Array.prototype`; array subclasses are outside the default profile.

Binary leaves must be ordinary platform binary objects with standard prototypes,
not user subclasses or custom executable behaviour. Inspect their actual backing
buffer through intrinsic operations; do not follow custom properties or overridden
`.buffer` accessors as resource edges. Codec output must not depend on those
properties being serialised. Cross-realm containers and customised binary objects
must be mapped to this profile by the producer; automatic normalisation is not
required. A normal view over an existing buffer can avoid copying its bytes.

Do not enumerate binary-leaf properties or numeric indices. Use standard local
prototype checks and intrinsic backing-buffer operations. A constant-time own
`buffer` descriptor check on views rejects an override without invoking it; do
not infer the backing buffer from an instance property. Other custom binary-leaf
properties do not form edges and are outside the producer contract; the adapter
does not enumerate them to prove their absence. This is distinct from the complete
own-descriptor check required for arrays and records.

Node `Buffer` is excluded from transfer-bearing data by the standard-prototype
rule. Node callers should produce ordinary Uint8Arrays with dedicated ArrayBuffers
when they need ownership transfer. Merely wrapping a Buffer's backing store in a
Uint8Array does not establish exclusive ownership or platform transferability.
Node pool behaviour is not a browser validation rule.

`Error`, `Date`, `RegExp`, `Map`, `Set`, `Blob`, `SharedArrayBuffer`, promises,
class instances, Proxy objects, functions, and other host objects are outside
`binary-data` when any resource is transferred. The adapter does not explore
`Error.name`, `Error.cause`, Map/Set contents, or arbitrary built-in metadata.
RPC error replies use the existing plain `RpcSerializedError` representation.

**[WD-3]** MessagePort forwarding is an explicit extension, selected with the
planned `transferProfile: "binary-data-and-ports"` transport option. The default
is `"binary-data"`. The extension adds genuine platform MessagePort objects as
opaque leaves and designated resources; it does not enable arbitrary Transferable
classes. Ports in the payload must be designated for transfer. A TypeScript
generic alone does not enable the extension at runtime. Both peers which send
ports select the extension independently. Port ownership after receipt remains
an application concern.

Additional host resources require a separately specified profile extension and
runtime tests. No generic unchecked resource predicate or validator-bypass option
is introduced in Step 3. Existing MessagePort-forwarding tests move to the explicit
extension; the feature is retained.

## Producer contract and validation boundary

**[WD-4]** Producers and codecs must supply stable data objects: no Proxy wrappers,
executable accessors, customised prototype behaviour, or mutation during validation
and posting. This is a trusted local input contract, not a sandbox for adversarial
JavaScript objects. JavaScript cannot generally identify Proxy objects without
executing their traps. The adapter therefore does not promise to detect every
out-of-contract object or preserve ownership after such a contract violation.
Remote envelope validation remains mandatory and is a separate boundary.

Host-supplied peer addresses are protocol metadata. When accepting `localPeer`
or a remote address at endpoint creation, transport creation, or binding creation,
read and validate `peerId` and `instanceId` as strings, then retain a fresh local
plain record containing only those fields. Invalid fields fail at that boundary
with `invalid-contract`. Ignore extra properties; do not spread the input object.
This snapshots the connection identity: later mutation of the caller's object
does not change an existing endpoint, transport, or binding. Apply the same
field-validation rule when accepting addresses in other host-facing operations;
retain snapshots only where the operation retains the address. Incoming wire
addresses still follow normal envelope validation. Snapshotting does not execute
or re-read host accessors during later sends.

For ordinary, non-Proxy inputs, the adapter must reject unsupported containers,
container accessor descriptors, invalid resource selections, and unreachable resources
before calling `postMessage`, with `transfer-failed`. Validation must use data
property descriptors and intrinsic binary operations rather than invoking user
getters, iterators, or conversion methods. Do not add an exhaustive emulation of
structured clone for excluded types. The validated payload is posted immediately,
without an intervening await or application callback.

The codec owns application-to-wire conversion. For example, an application may
accept a class or Map and encode it into records/arrays, or encode a domain error
into plain fields. That conversion's execution and cost belong to the codec. It
must retain each designated resource's identity in the wire data, must not detach
resources, and must not substitute copied bytes to satisfy required transfer.
The default identity codec performs no conversion: its input must already meet
this profile for transfer-bearing sends.

## Types and ownership checks

**[WD-5]** Provide a Worker-specific data type describing the primitive, binary,
array, and record shape, parameterised only by explicitly supported opaque
extensions. Use it in profile-specific helpers and examples. Keep the neutral
core's argument/result and `Wire` generics: a custom codec may accept richer
application types and produce valid Worker data.

Types describe shape, not the absence of getters, Proxies, custom prototypes, or
mutation. Do not claim that a structural assignment proves the producer contract.
A runtime cast or `unknown` input does not disable ordinary validation. Do not
constrain all RPC contracts to this Worker profile or break copy-only callers.
Implement declaration tests for supported shapes and known incompatible values,
as well as runtime tests for structural typing's limitations.

The transport factory uses profile-derived overloads rather than a freely
selectable resource generic:

- Omitted profile or `binary-data`: resource type is `ArrayBuffer`.
- Explicit `binary-data-and-ports`: resource type is
  `ArrayBuffer | WorkerTransferPort`.
- A profile variable with either possible value must not statically promise the
  extension is enabled; require narrowing or preserve that uncertainty.

`WorkerTransferPort` is a minimal DOM-free structural type compatible with genuine
browser and Node MessagePorts. It is separate from the connection-facing
`MessagePortLike`; the latter also adapts Workers and listener registration.
Structural compatibility alone does not prove a resource is a genuine MessagePort.
Keep runtime profile and host-object checks, with the final transfer performed by
the platform. Verify type compatibility using actual browser and Node port types.
The transport retains `Wire = unknown` to support mixed copy-only and transfer
methods. `WorkerTransferData<Extra = never>` is an explicit shape helper for
producers, not a constraint on all methods in the neutral core.

`assertReachableTransferables` takes an optional third argument
`{ readonly transferProfile?: WorkerTransferProfile }`. Its omitted/default
profile is `binary-data`; align its resource overloads with the factory and share
one validation implementation. A cast cannot enable ports at runtime. Update
public declarations and the historical declaration sketches together.

**[WD-6]** Retain TRANSFER-1 through TRANSFER-6: designation is explicit, required
input/result ownership is checked separately, resources are unique, supported,
and reachable by identity from the encoded graph, and detached buffers are
rejected where detectable. Sharing a backing buffer among views does not permit
duplicate resource entries. Non-designated ArrayBuffers may still be copied;
`required` applies to designated resources, not every binary value in a message.

Validation failure must not intentionally copy or post the original payload.
Representable response failures use the existing error reply path, including
asynchronous send rejection. Once posting starts, platform failures, cancellation,
and deadlines do not promise rollback or resource restoration.

## Performance and testing

**[WD-7]** The default path performs one encode and one platform post per direction,
with no preliminary structured clone, JSON conversion, byte scan, or binary copy.
Reachability validation walks supported containers and resource references only.
Target time is O(V + E + R) and auxiliary space O(V + R), where V is visited objects,
E is inspected container properties (including non-enumerable and symbol keys),
and R is designated resources. Bytes inside a
binary leaf do not contribute to traversal cost.

Avoid a chain of failing intrinsic brand probes for every ordinary record or
array. Supported container classification should take the normal path without
repeated exception-driven tests for excluded built-ins. No arbitrary latency
threshold is specified without measurement.

Measure validation separately from posting for a small binary task, a large
buffer with the same metadata, and a graph with many small records. Record runtime,
fixture, repetitions, and observed costs. Compare the large-buffer case to ensure
validation cost does not scale with byte length. Do not equate ownership transfer
with guaranteed physical zero-copy or promise an unmeasured speed-up.

A schema-specific codec may reduce the graph it emits, for example to a small
header and binary leaves. A future schema-certified fast path which skips generic
validation needs its own contract and evidence; Step 3 has no such bypass.

Use deterministic unit assertions for encode/post/clone counts and equivalent
container/property inspection work for a small versus large binary leaf with the
same metadata. Do not enumerate a large view to measure that guarantee. Keep
wall-clock measurements in a dedicated script and record the results separately;
no fragile timing thresholds are added to unit tests.

## Browser and Node verification

Browser Worker and MessageChannel behaviour define the common transport model;
Node-specific adapters and Buffer allocation rules remain separate. Standard
structured deserialisation creates values in the receiving realm. Ordinary
Worker message receipt and re-sending therefore differ from directly handing
an iframe-created object reference to an adapter in another realm. The latter
remains outside the local-container profile and requires producer conversion.
Do not add a preliminary clone to normalise every message.

Run the same small real-browser suite in Chromium, Firefox, and WebKit: dedicated
Worker and MessageChannel request/result contents and detachment, explicit port
forwarding, listener startup/cleanup, and owned versus borrowed shutdown. Include
received-data re-sending and direct foreign-realm container rejection. Node tests
and DOM declaration compilation supplement, rather than replace, these runs.
Record actual engine/version and execution results; mark unavailable runs as
unverified rather than claiming browser support. Multi-client SharedWorker and
BroadcastChannel composition remain separate extension work.

Platform references: [structured deserialisation](https://html.spec.whatwg.org/multipage/structured-data.html#structureddeserialize)
and [MessagePort](https://html.spec.whatwg.org/multipage/web-messaging.html#message-ports).

Implementation acceptance includes:

- Allowed scalar/binary/record/array graphs, repeated references, cycles, backing
  buffer aliases, omitted resources, duplicates, and post-encoding substitutions.
- Rejection of ordinary Error/Date/Map/Set/class/accessor inputs before post and
  without detachment; do not retain tests requiring their transfer-bearing support.
- Preservation of prior data-loss scenarios as rejection regressions, including
  Error metadata getters, spoofed tags, and overridden collection methods. Check
  post counts and original buffer usability, not only the error code.
- Copy-only compatibility for Blob and other platform-supported values, and
  getter evaluation only according to the platform on that copy-only path.
- Default rejection and explicit-extension success for MessagePort forwarding.
- Real MessageChannel and Worker input/result detachment, contents, cancellation,
  asynchronous failure, and fallback failure; distinguish Node from browser evidence.

The extension is complete only when these acceptance checks pass for its
claimed runtime surfaces. General built-in structured-clone support is not a
requirement for transfer-bearing payloads outside the permitted data profile.
