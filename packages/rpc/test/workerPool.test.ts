import { describe, expect, it, vi } from "vitest";
import { promiseWithResolvers } from "octagonal-wheels/promises";
import { createCancelController } from "../src/cancelSignal.js";
import { RpcError } from "../src/RpcError.js";
import {
  createWorkerPool,
  type WorkerPoolConnection,
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
