import { setImmediate } from "node:timers/promises";
import { describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "octagonal-wheels/promises";
import { createCancelController } from "../src/cancelSignal.js";
import { RpcError } from "../src/RpcError.js";
import {
  createWorkerPool,
  type WorkerPoolConnection,
  type WorkerPoolLease,
} from "../src/worker/pool.js";

function makeConnection<Client>(
  client: Client,
  ready: Promise<Client> = Promise.resolve(client),
) {
  const controller = createCancelController();
  const close = vi.fn((_reason?: RpcError) => {
    controller.abort(_reason);
  });
  const connection: WorkerPoolConnection<Client> = {
    ready,
    signal: controller.signal,
    close,
  };
  return { connection, controller, close };
}

describe("createWorkerPool", () => {
  it("requires a positive integer size and defers connection creation until demand", async () => {
    const createConnection = vi.fn(() => makeConnection("client").connection);
    expect(() => createWorkerPool({ size: 0, createConnection })).toThrow(RangeError);
    expect(() => createWorkerPool({ size: 1.5, createConnection })).toThrow(RangeError);
    expect(createConnection).not.toHaveBeenCalled();

    const pool = createWorkerPool({ size: 2, createConnection });
    expect(createConnection).not.toHaveBeenCalled();
    await expect(pool.start()).resolves.toHaveLength(2);
    expect(createConnection).toHaveBeenCalledTimes(2);
    pool.close();
  });

  it("preserves the concrete connection and ready client types", async () => {
    const connection = {
      ready: Promise.resolve({ id: "client" as const }),
      signal: createCancelController().signal,
      close(_reason?: RpcError) {},
      identity: "worker" as const,
    };
    const pool = createWorkerPool({ size: 1, createConnection: () => connection });
    const lease = await pool.acquire();

    const client: { readonly id: "client" } = lease.client;
    const identity: "worker" = lease.connection.identity;
    expect(client.id).toBe("client");
    expect(identity).toBe("worker");
    pool.close();
  });

  it("places concurrent leases on the least-leased ready slot and rotates ties", async () => {
    const connections: Array<ReturnType<typeof makeConnection<string>>> = [];
    const pool = createWorkerPool({
      size: 2,
      createConnection() {
        const created = makeConnection(`client-${connections.length + 1}`);
        connections.push(created);
        return created.connection;
      },
    });
    const ready = await pool.start();
    expect(ready).toEqual(connections.map(({ connection }) => connection));

    const leases = await Promise.all([
      pool.acquire(),
      pool.acquire(),
      pool.acquire(),
      pool.acquire(),
    ]);
    expect(leases.map(({ connection }) => connection)).toEqual([
      connections[0]!.connection,
      connections[1]!.connection,
      connections[0]!.connection,
      connections[1]!.connection,
    ]);

    for (const lease of leases) {
      lease.release();
      lease.release();
    }
    const afterRelease = await Promise.all([pool.acquire(), pool.acquire()]);
    expect(afterRelease.map(({ connection }) => connection)).toEqual([
      connections[0]!.connection,
      connections[1]!.connection,
    ]);
    pool.close();
  });

  it("uses a ready slot while another slot is still starting", async () => {
    const delayed = promiseWithResolvers<string>();
    const first = makeConnection("ready-client");
    const second = makeConnection("late-client", delayed.promise);
    const created = [first.connection, second.connection];
    const pool = createWorkerPool({ size: 2, createConnection: () => created.shift()! });

    let startupSettled = false;
    const starting = pool.start().then((connections) => {
      startupSettled = true;
      return connections;
    });
    await Promise.resolve();

    const lease = await pool.acquire();
    expect(lease.connection).toBe(first.connection);
    expect(startupSettled).toBe(false);

    delayed.resolve("late-client");
    await expect(starting).resolves.toEqual([first.connection, second.connection]);
    lease.release();
    pool.close();
  });

  it("removes temporary startup listeners after readiness settles", async () => {
    const created = makeConnection("ready-client");
    const addListener = vi.spyOn(created.controller.signal, "addEventListener");
    const removeListener = vi.spyOn(created.controller.signal, "removeEventListener");
    const pool = createWorkerPool({ size: 1, createConnection: () => created.connection });

    await pool.start();
    expect(addListener).toHaveBeenCalledTimes(2);
    expect(removeListener).toHaveBeenCalledTimes(1);

    pool.close();
    expect(removeListener).toHaveBeenCalledTimes(2);
  });

  it("shares slot creation with start and acquire calls made inside the factory", async () => {
    const first = makeConnection("first");
    const duplicate = makeConnection("duplicate");
    type Connection = typeof first.connection;
    let nestedStart: Promise<Connection[]> | undefined;
    let nestedAcquire: Promise<WorkerPoolLease<Connection, string>> | undefined;
    let calls = 0;
    const pool = createWorkerPool({
      size: 1,
      createConnection(): Connection {
        calls += 1;
        if (calls === 1) {
          nestedStart = pool.start();
          nestedAcquire = pool.acquire();
          return first.connection;
        }
        return duplicate.connection;
      },
    });

    try {
      const starting = pool.start();
      const all = Promise.all([starting, nestedStart!, nestedAcquire!]);
      void all.catch(() => undefined);
      expect(calls).toBe(1);
      const [outer, inner, lease] = await all;
      expect(outer).toEqual([first.connection]);
      expect(inner).toEqual([first.connection]);
      expect(lease.connection).toBe(first.connection);
      lease.release();
    } finally {
      pool.close();
    }
    expect(first.close).toHaveBeenCalledTimes(1);
    expect(duplicate.close).not.toHaveBeenCalled();
  });

  it("preserves a re-entrant start's factory failure across later demand", async () => {
    const replacement = makeConnection("replacement");
    const creationError = new Error("worker factory failed");
    type Connection = typeof replacement.connection;
    let nested: Promise<Connection[]> | undefined;
    let calls = 0;
    const pool = createWorkerPool({
      size: 1,
      createConnection(): Connection {
        calls += 1;
        if (calls === 1) {
          nested = pool.start();
          throw creationError;
        }
        return replacement.connection;
      },
    });

    try {
      const failed = pool.start();
      const retry = pool.start();
      const outcomes = await Promise.allSettled([failed, nested!, retry]);
      expect(outcomes).toEqual([
        { status: "rejected", reason: creationError },
        { status: "rejected", reason: creationError },
        { status: "fulfilled", value: [replacement.connection] },
      ]);
      expect(calls).toBe(2);
    } finally {
      pool.close();
    }
  });

  it("rejects a re-entrant acquire with its own factory failure while a later start waits", async () => {
    const retryReady = promiseWithResolvers<string>();
    const replacement = makeConnection("replacement", retryReady.promise);
    const failed = new Error("original factory failed");
    const pending = Symbol("acquire is still pending");
    type Connection = typeof replacement.connection;
    let nestedOutcome: Promise<unknown> | undefined;
    let calls = 0;
    const pool = createWorkerPool({
      size: 1,
      createConnection(): Connection {
        calls += 1;
        if (calls === 1) {
          nestedOutcome = pool.acquire().then(
            (lease) => {
              lease.release();
              return lease.client;
            },
            (error: unknown) => error,
          );
          throw failed;
        }
        return replacement.connection;
      },
    });

    try {
      const original = pool.start();
      const retry = pool.start();
      void retry.catch(() => undefined);
      await expect(original).rejects.toBe(failed);
      await expect(Promise.race([nestedOutcome!, setImmediate(pending)])).resolves.toBe(failed);
      expect(calls).toBe(2);
      retryReady.resolve("replacement");
      await expect(retry).resolves.toEqual([replacement.connection]);
    } finally {
      pool.close();
    }
  });

  it("retains the latest failure among the initial acquire's slots when later demand fails", async () => {
    const firstReady = promiseWithResolvers<string>();
    const secondReady = promiseWithResolvers<string>();
    const first = makeConnection("first", firstReady.promise);
    const second = makeConnection("second", secondReady.promise);
    const laterFailure = new Error("later factory failed");
    const latestOriginalFailure = new RpcError("disconnected", "first slot ended last");
    const initialConnections = [first.connection, second.connection];
    const pool = createWorkerPool({
      size: 2,
      createConnection() {
        const initial = initialConnections.shift();
        if (initial === undefined) {
          throw laterFailure;
        }
        return initial;
      },
    });

    try {
      const acquiring = pool.acquire();
      second.controller.abort(new RpcError("disconnected", "second slot ended first"));
      first.controller.abort(latestOriginalFailure);
      const retry = pool.start();
      await expect(Promise.allSettled([acquiring, retry])).resolves.toEqual([
        { status: "rejected", reason: latestOriginalFailure },
        { status: "rejected", reason: laterFailure },
      ]);
    } finally {
      pool.close();
    }
  });

  it("leases a healthy slot from the same pass after a different factory throws", async () => {
    const readiness = promiseWithResolvers<string>();
    const healthy = makeConnection("healthy", readiness.promise);
    const failed = new Error("sibling factory failed");
    type Connection = typeof healthy.connection;
    let nestedAcquire: Promise<WorkerPoolLease<Connection, string>> | undefined;
    let calls = 0;
    const pool = createWorkerPool({
      size: 2,
      createConnection(): Connection {
        calls += 1;
        if (calls === 1) {
          nestedAcquire = pool.acquire();
          void nestedAcquire.catch(() => undefined);
          throw failed;
        }
        return healthy.connection;
      },
    });

    try {
      await expect(pool.start()).rejects.toBe(failed);
      readiness.resolve("healthy");
      const lease = await nestedAcquire!;
      expect(lease.connection).toBe(healthy.connection);
      expect(lease.client).toBe("healthy");
      expect(calls).toBe(2);
      lease.release();
    } finally {
      pool.close();
    }
  });

  it("settles re-entrant demand when the factory synchronously closes the pool", async () => {
    const created = makeConnection("closed before ready");
    const reason = new RpcError("disconnected", "pool shut down in factory");
    type Connection = typeof created.connection;
    let nestedAcquire: Promise<WorkerPoolLease<Connection, string>> | undefined;
    let nestedStart: Promise<Connection[]> | undefined;
    const pool = createWorkerPool({
      size: 1,
      createConnection(): Connection {
        nestedAcquire = pool.acquire();
        nestedStart = pool.start();
        pool.close(reason);
        return created.connection;
      },
    });

    const start = pool.start();
    await expect(Promise.allSettled([start, nestedStart!, nestedAcquire!])).resolves.toEqual([
      { status: "rejected", reason },
      { status: "rejected", reason },
      { status: "rejected", reason },
    ]);
    expect(created.close).toHaveBeenCalledExactlyOnceWith(reason);
  });

  it("replaces an aborted slot when an earlier abort listener acquires again", async () => {
    const first = makeConnection("first");
    const replacement = makeConnection("replacement");
    type Connection = typeof first.connection;
    let reacquiring: Promise<WorkerPoolLease<Connection, string>> | undefined;
    let calls = 0;
    const pool = createWorkerPool({
      size: 1,
      createConnection(): Connection {
        calls += 1;
        if (calls === 1) {
          first.connection.signal.addEventListener("abort", () => {
            reacquiring = pool.acquire();
          }, { once: true });
          return first.connection;
        }
        return replacement.connection;
      },
    });

    try {
      const initial = await pool.acquire();
      initial.release();
      first.controller.abort(new RpcError("disconnected", "worker stopped"));
      const lease = await reacquiring!;
      expect(lease.connection).toBe(replacement.connection);
      expect(lease.client).toBe("replacement");
      expect(calls).toBe(2);
      lease.release();
    } finally {
      pool.close();
    }
  });

  it("rejects prewarming if a ready slot ends while another is still starting", async () => {
    const delayed = promiseWithResolvers<string>();
    const first = makeConnection("ready-client");
    const second = makeConnection("late-client", delayed.promise);
    const connections = [first.connection, second.connection];
    const pool = createWorkerPool({ size: 2, createConnection: () => connections.shift()! });
    const starting = pool.start();
    await Promise.resolve();

    const endReason = new RpcError("disconnected", "ready worker ended");
    first.controller.abort(endReason);
    await expect(starting).rejects.toBe(endReason);
    pool.close();
  });

  it("rejects startup on a failed slot while keeping healthy slots reusable", async () => {
    const startupError = new RpcError("disconnected", "registration failed");
    const healthy = makeConnection("healthy");
    let calls = 0;
    const pool = createWorkerPool({
      size: 2,
      createConnection() {
        calls += 1;
        if (calls === 1) {
          return makeConnection("failed", Promise.reject(startupError)).connection;
        }
        if (calls === 2) {
          return healthy.connection;
        }
        return makeConnection(`replacement-${calls}`).connection;
      },
    });

    await expect(pool.start()).rejects.toBe(startupError);
    const lease = await pool.acquire();
    expect(lease.connection).toBe(healthy.connection);
    lease.release();
    pool.close();
  });

  it("does not let a synchronous factory failure hide another ready slot", async () => {
    const creationError = new Error("factory failed");
    const healthy = makeConnection("healthy");
    let calls = 0;
    const pool = createWorkerPool({
      size: 2,
      createConnection() {
        calls += 1;
        if (calls % 2 === 1) {
          throw creationError;
        }
        return healthy.connection;
      },
    });

    await expect(pool.start()).rejects.toBe(creationError);
    const lease = await pool.acquire();
    expect(lease.connection).toBe(healthy.connection);
    expect(calls).toBe(3);
    lease.release();
    pool.close();
  });

  it("replaces an ended slot on later demand without retrying within an acquisition", async () => {
    const firstReady = promiseWithResolvers<string>();
    const replacementReady = promiseWithResolvers<string>();
    const first = makeConnection("late-first", firstReady.promise);
    const replacement = makeConnection("replacement", replacementReady.promise);
    let calls = 0;
    const pool = createWorkerPool({
      size: 1,
      createConnection() {
        calls += 1;
        return calls === 1 ? first.connection : replacement.connection;
      },
    });

    const firstAcquire = pool.acquire();
    const endReason = new RpcError("disconnected", "worker ended");
    first.controller.abort(endReason);
    await expect(firstAcquire).rejects.toBe(endReason);
    expect(calls).toBe(1);

    const nextAcquire = pool.acquire();
    expect(calls).toBe(2);
    firstReady.resolve("late-first");
    replacementReady.resolve("replacement");
    const lease = await nextAcquire;
    expect(lease.connection).toBe(replacement.connection);
    const reused = await pool.acquire();
    expect(reused.connection).toBe(replacement.connection);
    expect(calls).toBe(2);
    lease.release();
    reused.release();
    pool.close();
  });

  it("settles pending start and acquire operations on first close and ignores late readiness", async () => {
    const readiness = promiseWithResolvers<string>();
    const created = makeConnection("late", readiness.promise);
    const pool = createWorkerPool({
      size: 1,
      createConnection: () => created.connection,
    });
    const starting = pool.start();
    const acquiring = pool.acquire();
    const closeReason = new RpcError("aborted", "pool shutdown");
    const laterReason = new RpcError("disconnected", "second close");

    pool.close(closeReason);
    pool.close(laterReason);
    await expect(starting).rejects.toBe(closeReason);
    await expect(acquiring).rejects.toBe(closeReason);
    expect(created.close).toHaveBeenCalledTimes(1);
    expect(created.close).toHaveBeenCalledWith(closeReason);

    readiness.resolve("late");
    await Promise.resolve();
    await expect(pool.acquire()).rejects.toBe(closeReason);
    expect(created.close).toHaveBeenCalledTimes(1);
  });
});
