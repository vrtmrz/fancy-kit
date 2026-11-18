import { notifyMany as sendNotificationsToPeers } from "./endpoint.notifyMany.js";
import { RpcError } from "./RpcError.js";
import type { ContractShape, RpcMethodDescriptor } from "./contracts.js";
import {
  isPromiseLike,
  isValidEnvelope,
  peerAddressKey,
  prepareOutboundArgs,
  snapshotPeerAddress,
  toRpcError,
  type UnwrappedPayload,
} from "./endpoint/envelopes.js";
import {
  createInboundOperationRegistry,
  type InboundOperationHandler,
} from "./endpoint/inboundOperations.js";
import { createPendingCallRegistry } from "./endpoint/pendingCalls.js";
import { createEndpointSender } from "./endpoint/sending.js";
import { createDefaultScheduler } from "./scheduler.js";
import type {
  CreateRpcEndpointOptions,
  PeerAddress,
  RpcCallOptions,
  RpcCodec,
  RpcDiagnosticEvent,
  RpcEndpoint,
  RpcEnvelope,
  RpcIdGenerator,
  RpcMethodHandler,
  RpcNotifyOptions,
  RpcPeerClient,
  RpcTransport,
  ValidateEndpointCapabilities,
} from "./types.js";

function createDefaultIdGenerator(): RpcIdGenerator {
  let sequence = 0;
  return () => {
    sequence += 1;
    return `rpc-${sequence}`;
  };
}

function validateEndpointSetup<
  C extends ContractShape,
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
  StreamExt,
>(
  options: CreateRpcEndpointOptions<
    C,
    Wire,
    PostOptions,
    TransferResource,
    SupportsTransfer,
    StreamExt
  >,
): PeerAddress {
  const localPeer = snapshotPeerAddress(
    options.localPeer,
    "Endpoint requires a valid localPeer address.",
  );
  if (!options.transport.capabilities.guaranteesRequestBeforeCancel) {
    throw new RpcError(
      "unsupported-profile",
      "Transport profile does not guarantee request-before-cancel logical dispatch.",
    );
  }
  for (const key of Object.keys(options.contract)) {
    const descriptor = options.contract[key]!;
    if (descriptor.kind === "stream") {
      throw new RpcError(
        "unsupported-profile",
        `Stream method "${key}" is unsupported by this RPC endpoint.`,
      );
    }
    if (
      (descriptor.inputTransfer === "required" ||
        descriptor.outputTransfer === "required") &&
      !options.transport.capabilities.supportsTransfer
    ) {
      throw new RpcError(
        "unsupported-profile",
        `Contract method "${key}" requires ownership transfer, which this transport does not support.`,
      );
    }
  }
  if (options.streams !== undefined) {
    throw new RpcError("unsupported-profile", "Stream extensions are unsupported by this RPC endpoint.");
  }
  return localPeer;
}

/**
 * Creates a typed RPC endpoint connecting a contract, codec, and transport.
 *
 * Rejects capability mismatches (such as required transfer on BroadcastChannel,
 * stream methods, or transports lacking request-before-cancel order)
 * at compile time and runtime.
 */
export function createRpcEndpoint<
  C extends ContractShape,
  Wire,
  PostOptions,
  TransferResource,
  SupportsTransfer extends boolean,
  StreamExt = never,
>(
  options: CreateRpcEndpointOptions<
    C,
    Wire,
    PostOptions,
    TransferResource,
    SupportsTransfer,
    StreamExt
  > &
    ValidateEndpointCapabilities<C, SupportsTransfer, StreamExt>,
): RpcEndpoint<C, PostOptions, TransferResource> {
  const localPeer = validateEndpointSetup(options);

  const contract = options.contract;
  const codec: RpcCodec<RpcEnvelope, Wire> = options.codec;
  const transport: RpcTransport<
    Wire,
    PostOptions,
    TransferResource,
    SupportsTransfer
  > = options.transport;
  const transportOwnership = options.transportOwnership ?? "borrowed";
  const scheduler = options.scheduler ?? createDefaultScheduler();
  const generateId = options.generateId ?? createDefaultIdGenerator();
  const supportsTransfer = transport.capabilities.supportsTransfer;

  let endpointClosed = false;
  let endpointCloseReason: RpcError | undefined;
  let transportClosePromise: Promise<void> | undefined;
  const handlers = new Map<
    string,
    RpcMethodHandler<RpcMethodDescriptor, TransferResource>
  >();

  async function emitDiagnostic(event: RpcDiagnosticEvent): Promise<void> {
    try {
      await options.onDiagnostic?.(event);
    } catch {
      // Observer failures must not interrupt cleanup or settlement.
    }
  }

  function getDescriptor(method: string): RpcMethodDescriptor | undefined {
    if (!Object.prototype.hasOwnProperty.call(contract, method)) {
      return undefined;
    }
    return contract[method];
  }

  const sender = createEndpointSender({
    codec,
    transport,
    localPeer,
    emitDiagnostic,
  });

  const pendingRegistry = createPendingCallRegistry({
    localPeer,
    codec,
    transport,
    scheduler,
    generateId,
    sender,
    emitDiagnostic,
    isEndpointClosed: () => endpointClosed,
    getCloseReason: () => endpointCloseReason,
  });

  const inboundRegistry = createInboundOperationRegistry({
    getDescriptor,
    getHandler: (method) =>
      handlers.get(method) as InboundOperationHandler | undefined,
    sender,
    emitDiagnostic,
    isEndpointClosed: () => endpointClosed,
  });

  const unsubscribeTransport = transport.subscribe(
    (from: PeerAddress, rawPayload: unknown) => {
      if (endpointClosed) return;
      let decoded: RpcEnvelope;
      try {
        decoded = codec.decode(rawPayload);
      } catch (error) {
        void emitDiagnostic({
          type: "invalid-envelope",
          peer: from,
          error: toRpcError("decode-failed", error, from),
        });
        return;
      }

      if (!isValidEnvelope(decoded, from, localPeer)) {
        void emitDiagnostic({
          type: "invalid-envelope",
          peer: from,
          error: new RpcError(
            "invalid-envelope",
            "Received invalid RPC envelope.",
            {
              peer: from,
            },
          ),
        });
        return;
      }

      switch (decoded.kind) {
        case "request":
          inboundRegistry.handleRequest(from, decoded);
          return;
        case "notify":
          inboundRegistry.handleNotify(from, decoded);
          return;
        case "response":
          pendingRegistry.handleResponse(from, decoded);
          return;
        case "cancel":
          inboundRegistry.handleCancel(from, decoded);
          return;
      }
    },
  );

  function invokeNotify(
    target: PeerAddress,
    isBindingDisposed: () => boolean,
    method: string,
    rawArgs: readonly unknown[],
    notifyOptions?: RpcNotifyOptions<PostOptions>,
  ): Promise<void> {
    if (endpointClosed || isBindingDisposed()) {
      return Promise.reject(
        endpointCloseReason ??
          new RpcError(
            "disconnected",
            "RPC peer binding or endpoint is closed.",
            { peer: target },
          ),
      );
    }
    const descriptor = getDescriptor(method);
    if (
      !descriptor ||
      (descriptor.kind !== "call" && descriptor.kind !== "notify")
    ) {
      return Promise.reject(
        new RpcError(
          "invalid-contract",
          `Method "${method}" does not accept notifications.`,
          {
            peer: target,
          },
        ),
      );
    }
    if (!Array.isArray(rawArgs)) {
      return Promise.reject(
        new RpcError(
          "invalid-contract",
          `Arguments for "${method}" must be passed as an array.`,
          {
            peer: target,
          },
        ),
      );
    }
    if (notifyOptions?.signal?.aborted) {
      return Promise.reject(
        new RpcError("aborted", "Notification aborted before sending.", {
          peer: target,
          cause: notifyOptions.signal.reason,
        }),
      );
    }

    let prepared: UnwrappedPayload;
    try {
      prepared = prepareOutboundArgs(
        rawArgs,
        descriptor.inputTransfer,
        supportsTransfer,
        target,
      );
    } catch (error) {
      return Promise.reject(toRpcError("transfer-failed", error, target));
    }

    let encoded: Wire;
    try {
      encoded = sender.encodeNotify(method, prepared.values, target);
    } catch (error) {
      return Promise.reject(error);
    }

    try {
      const sendOutcome = transport.send(
        target,
        encoded,
        notifyOptions?.postOptions,
        prepared.transfer.length > 0
          ? (prepared.transfer as TransferResource[])
          : undefined,
      );
      if (isPromiseLike(sendOutcome)) {
        return Promise.resolve(sendOutcome).then(
          () => undefined,
          (error: unknown) =>
            Promise.reject(toRpcError("send-failed", error, target)),
        );
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(toRpcError("send-failed", error, target));
    }
  }

  function createProxyHandler(
    invoke: (
      method: string,
      args: readonly unknown[],
      options: unknown,
    ) => Promise<unknown>,
  ): Record<string, unknown> {
    return new Proxy(Object.create(null) as Record<string, unknown>, {
      get(_target, property) {
        if (typeof property !== "string") return undefined;
        const descriptor = getDescriptor(property);
        if (!descriptor) return undefined;
        return (args?: readonly unknown[], proxyOptions?: unknown) =>
          invoke(property, args ?? [], proxyOptions);
      },
      has(_target, property) {
        return (
          typeof property === "string" && getDescriptor(property) !== undefined
        );
      },
    });
  }

  function bindPeer(
    peer: PeerAddress,
  ): RpcPeerClient<C, PostOptions, TransferResource> {
    const targetPeer = snapshotPeerAddress(
      peer,
      "bindPeer requires a valid PeerAddress.",
    );
    const bindingToken = Symbol("peer-binding");
    let disposed = false;

    const callProxy = createProxyHandler((method, args, callOpts) =>
      pendingRegistry.invokeCall(
        targetPeer,
        bindingToken,
        () => disposed,
        method,
        getDescriptor(method),
        args,
        callOpts as RpcCallOptions<PostOptions> | undefined,
      ),
    );
    const notifyProxy = createProxyHandler((method, args, notifyOpts) =>
      invokeNotify(
        targetPeer,
        () => disposed,
        method,
        args,
        notifyOpts as RpcNotifyOptions<PostOptions> | undefined,
      ),
    );

    return {
      peer: targetPeer,
      call: callProxy as RpcPeerClient<
        C,
        PostOptions,
        TransferResource
      >["call"],
      notify: notifyProxy as RpcPeerClient<
        C,
        PostOptions,
        TransferResource
      >["notify"],
      dispose(): void {
        if (disposed) return;
        disposed = true;
        pendingRegistry.disposeBinding(bindingToken, targetPeer);
      },
    };
  }

  const notifyManyContext = {
    isEndpointClosed: () => endpointClosed,
    getDescriptor,
    supportsTransfer,
    encodeNotify: sender.encodeNotify,
    transport,
    invokeNotify,
  };
  const notifyMany = (
    targets: readonly PeerAddress[],
    method: string,
    args: readonly unknown[],
    notifyOptions?: RpcNotifyOptions<PostOptions>,
  ) =>
    sendNotificationsToPeers(
      notifyManyContext,
      targets,
      method,
      args,
      notifyOptions,
    );

  function handle(
    method: string,
    handler: RpcMethodHandler<RpcMethodDescriptor, TransferResource>,
  ): () => void {
    const descriptor = getDescriptor(method);
    if (
      !descriptor ||
      (descriptor.kind !== "call" && descriptor.kind !== "notify")
    ) {
      throw new RpcError(
        "invalid-contract",
        `Method "${method}" is not registered as a unary or notification method.`,
      );
    }
    handlers.set(method, handler);
    return () => {
      if (handlers.get(method) === handler) {
        handlers.delete(method);
      }
    };
  }

  function retirePeer(peer: PeerAddress): void {
    const targetPeer = snapshotPeerAddress(
      peer,
      "retirePeer requires a valid PeerAddress.",
    );
    const key = peerAddressKey(targetPeer);
    const disconnectError = new RpcError(
      "disconnected",
      "Remote peer retired.",
      {
        peer: targetPeer,
      },
    );
    pendingRegistry.retirePeer(key, disconnectError);
    inboundRegistry.retirePeer(key, disconnectError);
  }

  function teardownLocal(reason?: RpcError): void {
    if (endpointClosed) return;
    endpointClosed = true;
    endpointCloseReason = reason;
    try {
      unsubscribeTransport();
    } catch {
      // Unsubscribe failure must not leave pending calls or inbound handlers dangling.
    }
    const closeError = reason ?? new RpcError("disconnected", "RPC endpoint closed.");
    pendingRegistry.closeAll(closeError);
    inboundRegistry.closeAll(closeError);
    handlers.clear();
  }

  function closeOwnedTransport(): Promise<void> {
    if (transportOwnership !== "owned" || !transport.close) {
      return Promise.resolve();
    }
    if (!transportClosePromise) {
      try {
        transportClosePromise = Promise.resolve(transport.close());
      } catch (error) {
        transportClosePromise = Promise.reject(error);
      }
    }
    return transportClosePromise;
  }

  function close(reason?: RpcError): void {
    teardownLocal(reason);
    void closeOwnedTransport().catch((error: unknown) => {
      void emitDiagnostic({
        type: "transport-close-failed",
        operation: "transport-close",
        error: toRpcError("internal-error", error),
      });
    });
  }

  async function closeAsync(reason?: RpcError): Promise<void> {
    teardownLocal(reason);
    await closeOwnedTransport();
  }

  return {
    bindPeer,
    notifyMany: notifyMany as RpcEndpoint<C, PostOptions, TransferResource>["notifyMany"],
    handle: handle as RpcEndpoint<C, PostOptions, TransferResource>["handle"],
    retirePeer,
    close,
    closeAsync,
  };
}
