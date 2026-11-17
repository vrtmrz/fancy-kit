// pinned:timer-host
var compatGlobal = globalThis;

// pinned:octagonal-wheels/concurrency/deferredAction
var scheduleGlobalTimeout = (callback, delayMs) => {
  const handle = globalThis.setTimeout(callback, delayMs);
  return () => globalThis.clearTimeout(handle);
};
function createDeferredAction(callback, scheduleTimeout = scheduleGlobalTimeout) {
  let pending;
  let disposed = false;
  const cancel = () => {
    const current = pending;
    pending = void 0;
    current?.cancel?.();
  };
  return {
    schedule(delayMs) {
      if (disposed)
        return;
      cancel();
      const current = {};
      pending = current;
      try {
        const cancelRegistration = scheduleTimeout(() => {
          if (pending !== current)
            return;
          pending = void 0;
          callback();
        }, delayMs);
        if (pending === current)
          current.cancel = cancelRegistration;
        else
          cancelRegistration();
      } catch (error) {
        if (pending === current)
          pending = void 0;
        throw error;
      }
    },
    cancel,
    dispose() {
      if (disposed)
        return;
      disposed = true;
      cancel();
    }
  };
}

// pinned:src/rpc/chunking.ts
var encoder = new TextEncoder();
function estimateBytes(text) {
  return encoder.encode(text).byteLength;
}
function splitIntoChunks(payload, maxBytes) {
  if (maxBytes <= 0) return [payload];
  if (estimateBytes(payload) <= maxBytes) return [payload];
  const chunks = [];
  let cursor = 0;
  while (cursor < payload.length) {
    let end = Math.min(payload.length, cursor + Math.max(16, Math.floor(maxBytes / 2)));
    let part = payload.slice(cursor, end);
    while (part.length > 1 && estimateBytes(part) > maxBytes) {
      end = Math.max(cursor + 1, end - 1);
      part = payload.slice(cursor, end);
    }
    chunks.push(part);
    cursor = end;
  }
  return chunks;
}
var IncomingChunkBuffer = class {
  total;
  parts = /* @__PURE__ */ new Map();
  constructor(total) {
    this.total = total;
  }
  add(index, payload) {
    if (index < 0 || index >= this.total) return;
    this.parts.set(index, payload);
  }
  missingIndices() {
    const missing = [];
    for (let i = 0; i < this.total; i++) {
      if (!this.parts.has(i)) missing.push(i);
    }
    return missing;
  }
  isComplete() {
    return this.parts.size === this.total;
  }
  toPayload() {
    let acc = "";
    for (let i = 0; i < this.total; i++) {
      const part = this.parts.get(i);
      if (part === void 0) {
        throw new Error(`Missing chunk ${i}`);
      }
      acc += part;
    }
    return acc;
  }
};

// pinned:octagonal-wheels/context
function bindContext(ctx, func) {
  const context = ctx;
  return (...args) => func(context, ...args);
}

// pinned:src/rpc/errors.ts
var RpcError = class extends Error {
  code;
  details;
  constructor(code, message, details) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.details = details;
  }
  toShape() {
    return { code: this.code, message: this.message, details: this.details };
  }
};
function asRpcErrorShape(ex) {
  if (ex instanceof RpcError) {
    return ex.toShape();
  }
  if (ex instanceof Error) {
    return { code: "REMOTE_ERROR", message: ex.message };
  }
  return { code: "REMOTE_ERROR", message: "Unknown remote error" };
}

// pinned:src/rpc/RpcRoom/pendingInvocations.ts
function removePending(context, requestId) {
  const { pending } = context;
  const invocation = pending.get(requestId);
  if (!invocation) {
    return void 0;
  }
  pending.delete(requestId);
  invocation.releaseWait();
  return invocation;
}
function notifyRemoteCancellation(context, peerId, requestId) {
  const { sendEnvelope, onProtocolWarning } = context;
  void sendEnvelope(peerId, { kind: "cancel", requestId }).catch((error) => {
    onProtocolWarning?.("Failed to send RPC cancellation: " + String(error), peerId);
  });
}
function rejectPending(context, requestId, error, notifyRemote = false) {
  const { pending, removePending: removePending2, notifyRemoteCancellation: notifyRemoteCancellation2 } = context;
  const invocation = pending.get(requestId);
  if (!invocation) {
    return;
  }
  if (notifyRemote) {
    invocation.cancelRequested = true;
  }
  const removed = removePending2(requestId);
  if (!removed) {
    return;
  }
  removed.reject(error);
  if (notifyRemote && removed.requestSent) {
    notifyRemoteCancellation2(removed.peerId, requestId);
  }
}
function registerPendingWait(context, requestId, peerId, method, options, timeoutMs, onInvocationCreated, resolve, reject) {
  const { pending, scheduleTimeout, rejectPending: rejectPending2 } = context;
  const signal = options.signal;
  const onAbort = () => {
    const current = pending.get(requestId);
    if (!current) {
      return;
    }
    rejectPending2(requestId, new RpcError("CANCELLED", "RPC cancelled: " + method), true);
  };
  const deadline = timeoutMs > 0 ? createDeferredAction(() => {
    rejectPending2(requestId, new RpcError("TIMEOUT", "RPC timed out: " + method), true);
  }, scheduleTimeout) : void 0;
  const invocation = {
    peerId,
    resolve,
    reject,
    releaseWait: () => {
      deadline?.dispose();
      signal?.removeEventListener("abort", onAbort);
    },
    requestSent: false,
    cancelRequested: false
  };
  onInvocationCreated(invocation);
  deadline?.schedule(timeoutMs);
  pending.set(requestId, invocation);
  if (signal) {
    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
    }
  }
}
async function invokePendingInvocation(context, peerId, method, args, timeoutOrOptions = 3e4) {
  const { pending, sendEnvelope, createRequestId, registerPendingWait: registerPendingWait2, removePending: removePending2, notifyRemoteCancellation: notifyRemoteCancellation2 } = context;
  const options = typeof timeoutOrOptions === "number" ? { timeoutMs: timeoutOrOptions } : timeoutOrOptions ?? {};
  const timeoutMs = options.timeoutMs ?? 3e4;
  if (options.signal?.aborted) {
    throw new RpcError("CANCELLED", "RPC cancelled: " + method);
  }
  const requestId = createRequestId();
  let invocation;
  const result = new Promise((resolve, reject) => {
    registerPendingWait2(
      requestId,
      peerId,
      method,
      options,
      timeoutMs,
      (created) => {
        invocation = created;
      },
      resolve,
      reject
    );
  });
  const sendTask = sendEnvelope(peerId, {
    kind: "request",
    requestId,
    method,
    args
  });
  void sendTask.then(
    () => {
      const current = pending.get(requestId);
      invocation.requestSent = true;
      if (!current && invocation.cancelRequested) {
        notifyRemoteCancellation2(peerId, requestId);
      }
    },
    (error) => {
      const current = pending.get(requestId);
      if (!current) {
        return;
      }
      const failed = removePending2(requestId);
      if (failed) {
        failed.reject(error);
      }
    }
  );
  return await result;
}
async function cancelPendingInvocation(context, peerId, requestId) {
  const { pending, sendEnvelope, rejectPending: rejectPending2 } = context;
  const invocation = pending.get(requestId);
  if (invocation?.peerId === peerId) {
    const requestSent = invocation.requestSent;
    invocation.cancelRequested = true;
    rejectPending2(requestId, new RpcError("CANCELLED", "Invocation cancelled"));
    if (!requestSent) {
      return;
    }
  }
  await sendEnvelope(peerId, {
    kind: "cancel",
    requestId
  });
}
function receivePendingResponse(context, envelope) {
  const { removePending: removePending2 } = context;
  const settled = removePending2(envelope.requestId);
  if (!settled) {
    return;
  }
  if (envelope.ok === true) {
    settled.resolve(envelope.data);
  } else {
    settled.reject(new RpcError(envelope.error.code, envelope.error.message, envelope.error.details));
  }
}
function rejectPendingForPeerDeparture(context, peerId) {
  const { pending, rejectPending: rejectPending2 } = context;
  pending.forEach((invocation, requestId) => {
    if (invocation.peerId !== peerId) {
      return;
    }
    rejectPending2(requestId, new RpcError("NOT_CONNECTED", "Peer disconnected"));
  });
}
function closePendingInvocations(context) {
  const { pending, rejectPending: rejectPending2 } = context;
  pending.forEach((_invocation, requestId) => {
    rejectPending2(requestId, new RpcError("NOT_CONNECTED", "Room closed"), true);
  });
}
function createPendingInvocations({
  sendEnvelope,
  createRequestId,
  scheduleTimeout,
  onProtocolWarning
}) {
  const state = {
    pending: /* @__PURE__ */ new Map()
  };
  const removeOperation = bindContext(state, removePending);
  const notifyRemoteCancellationOperation = bindContext(
    { sendEnvelope, onProtocolWarning },
    notifyRemoteCancellation
  );
  const rejectOperation = bindContext(
    {
      pending: state.pending,
      removePending: removeOperation,
      notifyRemoteCancellation: notifyRemoteCancellationOperation
    },
    rejectPending
  );
  const registerPendingWaitOperation = bindContext(
    { pending: state.pending, scheduleTimeout, rejectPending: rejectOperation },
    registerPendingWait
  );
  const invoke = bindContext(
    {
      pending: state.pending,
      sendEnvelope,
      createRequestId,
      registerPendingWait: registerPendingWaitOperation,
      removePending: removeOperation,
      notifyRemoteCancellation: notifyRemoteCancellationOperation
    },
    invokePendingInvocation
  );
  const cancel = bindContext(
    { pending: state.pending, sendEnvelope, rejectPending: rejectOperation },
    cancelPendingInvocation
  );
  const receiveResponse = bindContext({ removePending: removeOperation }, receivePendingResponse);
  const peerLeft = bindContext(
    { pending: state.pending, rejectPending: rejectOperation },
    rejectPendingForPeerDeparture
  );
  const close = bindContext({ pending: state.pending, rejectPending: rejectOperation }, closePendingInvocations);
  return { invoke, cancel, receiveResponse, peerLeft, close };
}

// pinned:src/rpc/RpcSession.ts
var RpcSession = class {
  peerId;
  room;
  constructor(room, peerId) {
    this.room = room;
    this.peerId = peerId;
  }
  async call(method, args = [], timeoutOrOptions) {
    if (!this.peerId) {
      throw new RpcError("NOT_CONNECTED", "Peer is not connected");
    }
    return await this.room.invoke(this.peerId, method, args, timeoutOrOptions);
  }
  /**
   * Send a notification to the bound peer without creating an RPC response
   * wait. Resolves when the local transport send completes, not when remote
   * processing finishes.
   */
  async notify(method, args = []) {
    if (!this.peerId) {
      throw new RpcError("NOT_CONNECTED", "Peer is not connected");
    }
    await this.room.notify(this.peerId, method, args);
  }
  createProxy(namespace) {
    const session = this;
    return new Proxy(
      {},
      {
        get(_target, propKey) {
          if (typeof propKey !== "string") return void 0;
          return async (...args) => {
            return await session.call(`${namespace}.${propKey}`, args);
          };
        }
      }
    );
  }
};

// pinned:src/rpc/types.ts
var RPC_VERSION_MAJOR = 1;
var RPC_VERSION_MINOR = 0;

// pinned:src/rpc/RpcRoom.ts
function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
function validNamespacedMethod(method) {
  return method.includes(".") || method.includes("/");
}
var scheduleRpcTimeout = (callback, delayMs) => {
  const handle = compatGlobal.setTimeout(callback, delayMs);
  return () => compatGlobal.clearTimeout(handle);
};
var RpcRoom = class {
  options;
  pendingInvocations;
  inboundCalls = /* @__PURE__ */ new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- This is a generic type for method handlers, so we can't be more specific about the types here.
  methods = /* @__PURE__ */ new Map();
  sessions = /* @__PURE__ */ new Map();
  outgoingChunkMap = /* @__PURE__ */ new Map();
  incomingChunkMap = /* @__PURE__ */ new Map();
  incomingChunkWaits = /* @__PURE__ */ new Map();
  peerVersion = /* @__PURE__ */ new Map();
  disposers = [];
  closed = false;
  constructor(options) {
    this.options = {
      maxWirePayloadBytes: options.maxWirePayloadBytes ?? 32 * 1024,
      chunkMissingRetryMs: options.chunkMissingRetryMs ?? 350,
      ...options
    };
    this.pendingInvocations = createPendingInvocations({
      sendEnvelope: (peerId, envelope) => this.sendEnvelope(peerId, envelope),
      createRequestId: () => newId("req"),
      scheduleTimeout: scheduleRpcTimeout,
      onProtocolWarning: (message, peerId) => this.options.onProtocolWarning?.(message, peerId)
    });
    this.disposers.push(
      this.options.transport.onMessage((msg, peerId) => {
        void this.onWireMessage(msg, peerId);
      })
    );
    if (this.options.transport.onPeerJoin) {
      this.disposers.push(
        this.options.transport.onPeerJoin((peerId) => {
          void this.sendEnvelope(peerId, {
            kind: "handshake",
            versionMajor: RPC_VERSION_MAJOR,
            versionMinor: RPC_VERSION_MINOR
          });
        })
      );
    }
    if (this.options.transport.onPeerLeave) {
      this.disposers.push(
        this.options.transport.onPeerLeave((peerId) => {
          this.pendingInvocations.peerLeft(peerId);
          this.inboundCalls.forEach((context, requestId) => {
            if (context.peerId !== peerId) return;
            this.abortInboundCall(requestId, context);
            this.inboundCalls.delete(requestId);
          });
          this.outgoingChunkMap.forEach((state, streamId) => {
            if (state.peerId === peerId) this.outgoingChunkMap.delete(streamId);
          });
          this.sessions.delete(peerId);
          this.peerVersion.delete(peerId);
        })
      );
    }
  }
  close() {
    if (this.closed) return;
    this.closed = true;
    this.disposers.splice(0).forEach((dispose) => dispose());
    this.pendingInvocations.close();
    this.inboundCalls.forEach((context, requestId) => {
      this.abortInboundCall(requestId, context);
    });
    this.inboundCalls.clear();
    this.methods.clear();
    this.sessions.clear();
    this.outgoingChunkMap.clear();
    this.incomingChunkMap.clear();
    this.incomingChunkWaits.forEach((wait) => wait.dispose());
    this.incomingChunkWaits.clear();
  }
  session(peerId) {
    const existing = this.sessions.get(peerId);
    if (existing) return existing;
    const s = new RpcSession(this, peerId);
    this.sessions.set(peerId, s);
    return s;
  }
  register(method, handler, options = {}) {
    this.registerMethod(method, handler, false, options);
  }
  registerCancellable(method, handler, options = {}) {
    this.registerMethod(method, handler, true, options);
  }
  registerMethod(method, handler, cancellationAware, options) {
    if (!validNamespacedMethod(method)) {
      throw new RpcError("PROTOCOL_ERROR", `Method must be namespaced: ${method}`);
    }
    this.methods.set(method, {
      handler,
      cancellationAware,
      serial: options.serial ?? false,
      queue: Promise.resolve()
    });
  }
  async invoke(peerId, method, args, timeoutOrOptions = 3e4) {
    if (!validNamespacedMethod(method)) {
      throw new RpcError("PROTOCOL_ERROR", `Method must be namespaced: ${method}`);
    }
    if (this.closed) {
      throw new RpcError("NOT_CONNECTED", "Room is closed");
    }
    return await this.pendingInvocations.invoke(peerId, method, args, timeoutOrOptions);
  }
  /**
   * Send a notification to a peer without creating an RPC response wait.
   * Resolves when the local transport send completes; it does not report
   * whether the peer accepted or completed the handler.
   */
  async notify(peerId, method, args) {
    if (!validNamespacedMethod(method)) {
      throw new RpcError("PROTOCOL_ERROR", `Method must be namespaced: ${method}`);
    }
    if (this.closed) {
      throw new RpcError("NOT_CONNECTED", "Room is closed");
    }
    await this.sendEnvelope(peerId, {
      kind: "request",
      requestId: newId("req"),
      method,
      args,
      expectsResponse: false
    });
  }
  async cancel(peerId, requestId) {
    return await this.pendingInvocations.cancel(peerId, requestId);
  }
  abortInboundCall(requestId, context) {
    if (this.inboundCalls.get(requestId) !== context) return;
    if (!context.signal.aborted) {
      context.controller.abort(new RpcError("CANCELLED", "Invocation cancelled"));
    }
  }
  async sendEnvelope(peerId, envelope) {
    const serialized = JSON.stringify(envelope);
    if (estimateBytes(serialized) <= this.options.maxWirePayloadBytes) {
      await this.options.transport.send({ wire: "raw", payload: serialized }, peerId);
      return;
    }
    const streamId = newId("stream");
    const chunks = splitIntoChunks(serialized, this.options.maxWirePayloadBytes);
    this.outgoingChunkMap.set(streamId, { peerId, chunks });
    for (let i = 0; i < chunks.length; i++) {
      await this.sendChunk(peerId, streamId, chunks.length, i, chunks[i]);
    }
  }
  sendChunk(peerId, streamId, total, index, payload) {
    return this.options.transport.send({ wire: "chunk", streamId, index, total, payload }, peerId);
  }
  sendErrorResponse(peerId, requestId, error) {
    return this.sendEnvelope(peerId, { kind: "response", requestId, ok: false, error });
  }
  async reportRequestFailure(envelope, peerId, error, notificationReason) {
    if (envelope.expectsResponse === false) {
      this.warnNotificationIssue(envelope, notificationReason, peerId);
      return;
    }
    await this.sendErrorResponse(peerId, envelope.requestId, error);
  }
  warnNotificationIssue(envelope, reason, peerId) {
    try {
      this.options.onProtocolWarning?.(`RPC notification ${envelope.method}: ${reason}`, peerId);
    } catch {
    }
  }
  scheduleMissingAck(streamId, peerId) {
    this.incomingChunkWaits.get(streamId)?.dispose();
    const wait = createDeferredAction(() => {
      const state = this.incomingChunkMap.get(streamId);
      if (!state || state.isComplete()) return;
      const missing = state.missingIndices();
      void this.options.transport.send({ wire: "chunk-ack", streamId, missing }, peerId);
    }, scheduleRpcTimeout);
    wait.schedule(this.options.chunkMissingRetryMs);
    this.incomingChunkWaits.set(streamId, wait);
  }
  async onWireMessage(message, peerId) {
    if (message.wire === "raw") {
      await this.onEnvelopePayload(message.payload, peerId);
      return;
    }
    if (message.wire === "chunk") {
      let state2 = this.incomingChunkMap.get(message.streamId);
      if (!state2) {
        state2 = new IncomingChunkBuffer(message.total);
        this.incomingChunkMap.set(message.streamId, state2);
      }
      state2.add(message.index, message.payload);
      this.scheduleMissingAck(message.streamId, peerId);
      if (state2.isComplete()) {
        this.incomingChunkWaits.get(message.streamId)?.dispose();
        this.incomingChunkWaits.delete(message.streamId);
        this.incomingChunkMap.delete(message.streamId);
        await this.options.transport.send(
          { wire: "chunk-ack", streamId: message.streamId, missing: [] },
          peerId
        );
        await this.onEnvelopePayload(state2.toPayload(), peerId);
      }
      return;
    }
    const state = this.outgoingChunkMap.get(message.streamId);
    if (!state) return;
    if (message.missing.length === 0) {
      this.outgoingChunkMap.delete(message.streamId);
      return;
    }
    for (const index of message.missing) {
      const payload = state.chunks[index];
      if (payload === void 0) continue;
      await this.sendChunk(state.peerId, message.streamId, state.chunks.length, index, payload);
    }
  }
  async onEnvelopePayload(payload, peerId) {
    let envelope;
    try {
      envelope = JSON.parse(payload);
    } catch (ex) {
      this.options.onProtocolWarning?.("Invalid payload", peerId);
      this.options.onProtocolWarning?.(String(ex), peerId);
      return;
    }
    if (envelope.kind === "handshake") {
      this.peerVersion.set(peerId, { major: envelope.versionMajor, minor: envelope.versionMinor });
      if (envelope.versionMajor !== RPC_VERSION_MAJOR) {
        this.options.onProtocolWarning?.(
          `RPC major mismatch: local=${RPC_VERSION_MAJOR}, remote=${envelope.versionMajor}`,
          peerId
        );
      }
      return;
    }
    if (envelope.kind === "cancel") {
      const ctx = this.inboundCalls.get(envelope.requestId);
      if (ctx && ctx.peerId === peerId) this.abortInboundCall(envelope.requestId, ctx);
      return;
    }
    if (envelope.kind === "response") {
      this.pendingInvocations.receiveResponse(envelope);
      return;
    }
    return this.onRequest(envelope, peerId);
  }
  async onRequest(envelope, peerId) {
    const controller = new AbortController();
    const ctx = { controller, signal: controller.signal, peerId };
    this.inboundCalls.set(envelope.requestId, ctx);
    let accepted;
    try {
      accepted = await this.options.canAcceptRequest?.(peerId, envelope.method, ctx);
    } catch (ex) {
      this.inboundCalls.delete(envelope.requestId);
      if (!ctx.signal.aborted && !this.closed) {
        await this.reportRequestFailure(envelope, peerId, asRpcErrorShape(ex), "admission check failed");
      }
      return;
    }
    if (accepted === false) {
      this.inboundCalls.delete(envelope.requestId);
      return;
    }
    if (ctx.signal.aborted || this.closed) {
      this.inboundCalls.delete(envelope.requestId);
      return;
    }
    const version = this.peerVersion.get(peerId);
    if (version && version.major !== RPC_VERSION_MAJOR) {
      if (!ctx.signal.aborted && !this.closed) {
        await this.reportRequestFailure(
          envelope,
          peerId,
          {
            code: "REMOTE_ERROR",
            message: `RPC major mismatch: local=${RPC_VERSION_MAJOR}, remote=${version.major}`
          },
          "protocol major version mismatch"
        );
      }
      this.inboundCalls.delete(envelope.requestId);
      return;
    }
    if (version && version.minor !== RPC_VERSION_MINOR) {
      if (envelope.expectsResponse === false) {
        this.warnNotificationIssue(envelope, "protocol minor version mismatch", peerId);
      } else {
        this.options.onProtocolWarning?.(
          `RPC minor mismatch: local=${RPC_VERSION_MINOR}, remote=${version.minor}`,
          peerId
        );
      }
    }
    const method = this.methods.get(envelope.method);
    if (!method) {
      if (!ctx.signal.aborted && !this.closed) {
        await this.reportRequestFailure(
          envelope,
          peerId,
          {
            code: "REMOTE_ERROR",
            message: `Method not found: ${envelope.method}`
          },
          "method not found"
        );
      }
      this.inboundCalls.delete(envelope.requestId);
      return;
    }
    const runner = () => this.runMethod(method, envelope, peerId, ctx);
    if (method.serial) {
      method.queue = method.queue.then(runner, runner);
      await method.queue;
    } else {
      await runner();
    }
  }
  async runMethod(method, envelope, peerId, ctx) {
    try {
      if (ctx.signal.aborted || this.closed) return;
      const data = method.cancellationAware ? await method.handler(
        ctx,
        peerId,
        ...envelope.args
      ) : await method.handler(peerId, ...envelope.args);
      if (ctx.signal.aborted || this.closed || envelope.expectsResponse === false) {
        return;
      }
      await this.sendEnvelope(peerId, {
        kind: "response",
        requestId: envelope.requestId,
        ok: true,
        data
      });
    } catch (ex) {
      if (ctx.signal.aborted || this.closed) return;
      await this.reportRequestFailure(envelope, peerId, asRpcErrorShape(ex), "handler failed");
    } finally {
      if (this.inboundCalls.get(envelope.requestId) === ctx) {
        this.inboundCalls.delete(envelope.requestId);
      }
    }
  }
};
export {
  RpcError,
  RpcRoom
};
