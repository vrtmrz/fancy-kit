import { promiseWithResolvers } from "octagonal-wheels/promises";
import { describe, expect, it } from "vitest";
import { call, defineContract, notify, RpcError } from "../src/index.js";
import { connectWorkerRpc, serveWorkerRpc } from "../src/worker.js";
import { createControllableScheduler } from "./facilities/controllableScheduler.js";
import { createWorkerFixture } from "./facilities/workerFixture.js";

const contract = defineContract({
  transform: call<[text: string], string>(),
  record: notify<[text: string]>(),
});

describe("Managed Worker RPC connection", () => {
  it("waits for async registration and clears the startup deadline on readiness", async () => {
    const fixture = createWorkerFixture();
    const scheduler = createControllableScheduler();
    const registration = promiseWithResolvers<void>();
    const workerRpc = connectWorkerRpc({ contract, createWorker: () => fixture.worker, scheduler });
    const server = serveWorkerRpc({
      contract,
      port: fixture.port,
      async register(endpoint) {
        await registration.promise;
        endpoint.handle("transform", (_context, text) => text.toUpperCase());
      },
    });

    try {
      let isReady = false;
      void workerRpc.ready.then(() => { isReady = true; });
      await Promise.resolve();
      expect(isReady).toBe(false);
      expect(scheduler.pendingCount).toBe(1);

      registration.resolve();
      const client = await workerRpc.ready;
      await expect(client.call.transform(["ready"])).resolves.toBe("READY");
      expect(scheduler.pendingCount).toBe(0);
    } finally {
      workerRpc.close();
      server.close();
    }
    expect(fixture.terminationCount).toBe(1);
    expect(fixture.hostListenerCount).toBe(0);
  });

  it("rejects startup after the configured deadline and stops the Worker", async () => {
    const fixture = createWorkerFixture();
    const scheduler = createControllableScheduler();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker, scheduler, startupTimeoutMs: 50 });

    scheduler.advanceBy(49);
    expect(connection.signal.aborted).toBe(false);
    scheduler.advanceBy(1);
    await expect(connection.ready).rejects.toMatchObject({ code: "timeout" });
    expect(connection.signal.aborted).toBe(true);
    expect(fixture.terminationCount).toBe(1);
    expect(fixture.hostListenerCount).toBe(0);
  });

  it("preserves a Worker crash reason for active and later calls, and stops once", async () => {
    const fixture = createWorkerFixture();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker });
    const arrived = promiseWithResolvers<void>();
    const finish = promiseWithResolvers<string>();
    const server = serveWorkerRpc({
      contract,
      port: fixture.port,
      register(endpoint) {
        endpoint.handle("transform", () => {
          arrived.resolve();
          return finish.promise;
        });
      },
    });

    try {
      const client = await connection.ready;
      const active = client.call.transform(["waiting"]);
      await arrived.promise;
      const cause = new Error("runtime crashed");
      fixture.crash("Worker failed", cause);
      const reason = connection.signal.reason;
      await expect(active).rejects.toBe(reason);
      expect(reason).toMatchObject({ code: "disconnected", message: "Worker failed", cause });
      await expect(client.call.transform(["later"])).rejects.toBe(reason);
      await expect(client.notify.record(["later"])).rejects.toBe(reason);
    } finally {
      connection.close();
      server.close();
      finish.resolve("late reply");
    }
    expect(fixture.terminationCount).toBe(1);
    expect(fixture.hostListenerCount).toBe(0);
  });

  it("reports handler registration failures on both sides", async () => {
    const fixture = createWorkerFixture();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker });
    const server = serveWorkerRpc({
      contract,
      port: fixture.port,
      async register() {
        throw new Error("Handler startup failed.");
      },
    });
    await expect(server.ready).rejects.toMatchObject({ code: "remote-error", message: "Handler startup failed." });
    await expect(connection.ready).rejects.toMatchObject({ code: "remote-error", message: "Handler startup failed." });
    expect(fixture.terminationCount).toBe(1);
  });

  it("settles ready on host shutdown before registration and ignores late startup", async () => {
    const fixture = createWorkerFixture();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker });
    const registration = promiseWithResolvers<void>();
    const server = serveWorkerRpc({ contract, port: fixture.port, register: () => registration.promise });
    const reason = new RpcError("disconnected", "Plug-in unloaded.");
    connection.close(reason);
    const ready = expect(connection.ready).rejects.toBe(reason);
    registration.resolve();
    await server.ready;
    await ready;
    server.close();
    expect(connection.signal.reason).toBe(reason);
    expect(fixture.hostListenerCount).toBe(0);
  });

  it("reports an explicit server shutdown to a connection that is already ready", async () => {
    const fixture = createWorkerFixture();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker });
    const server = serveWorkerRpc({ contract, port: fixture.port, register: () => undefined });
    await connection.ready;
    const closed = promiseWithResolvers<void>();
    connection.signal.addEventListener("abort", () => closed.resolve());
    server.close(new RpcError("disconnected", "Worker service stopped."));
    await closed.promise;
    expect(connection.signal.reason).toMatchObject({ code: "disconnected", message: "Worker service stopped." });
    expect(fixture.terminationCount).toBe(1);
  });

  it("closes on a message that cannot be deserialised", async () => {
    const fixture = createWorkerFixture();
    const connection = connectWorkerRpc({ contract, createWorker: () => fixture.worker });
    fixture.failMessage();
    await expect(connection.ready).rejects.toMatchObject({ code: "decode-failed" });
    expect(fixture.terminationCount).toBe(1);
    expect(fixture.hostListenerCount).toBe(0);
  });
});
