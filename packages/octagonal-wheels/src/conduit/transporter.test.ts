import { describe, it, expect, vi } from "vitest";
import { _createTransporter, GlobalTransporters, Transporters } from "./transporter.ts";
import { defaultLogger, setGlobalLogFunction } from "../common/logger.ts";
import { PostMessageBackbone, transporterKey } from "./transporterAdapter.ts";
import { delay } from "../promises.ts";

function createEmitter(channel?: MessageChannel) {
    const x = channel || new MessageChannel();
    // const r = x.port1;
    // const t = x.port2;
    // r.start();
    // t.start();
    return new PostMessageBackbone(x) as PostMessageBackbone<any>;
}

describe("_createTransporter", () => {
    it("should send and receive a message", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number, number], number>(adapter, "add");
        onInvoked(async (a, b) => a + b);

        const result = await send(2, 3);
        expect(result).toBe(5);
    });

    it("can be defined in separate places", async () => {
        const adapter = createEmitter();
        const [, onInvoked] = _createTransporter<[number, number], number>(adapter, "add");
        onInvoked(async (a, b) => a + b);

        const [send] = _createTransporter<[number, number], number>(adapter, "add");
        const result = await send(2, 3);
        expect(result).toBe(5);
    });

    it("should propagate errors from the handler", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[string], string>(adapter, "fail");
        onInvoked(async () => {
            throw new Error("fail!");
        });

        await expect(send("x")).rejects.toThrow("fail!");
    });

    it("should allow removing the handler", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "inc");
        const dispose = onInvoked(async (x) => x + 1);

        expect(await send(1)).toBe(2);
        dispose(); // remove handler

        // Removing the handler means the Promise will not resolve, so we test with a timeout
        const p = send(1);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });
    it("should handle multiple concurrent requests", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "double");
        onInvoked(async (x) => x * 2);

        const results = await Promise.all([send(1), send(2), send(3)]);
        expect(results).toEqual([2, 4, 6]);
    });
    it("should handle multiple onInvoked calls", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "triple");
        const sameFunc = async (x: number) => x * 3;

        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        // First handler
        onInvoked(sameFunc);
        onInvoked(sameFunc); // Adding the same handler again
        expect(logs.filter((e) => e.match(/is already set to the same function/i))).toHaveLength(1);
        const anotherFunc = async (x: number) => x * 3;
        onInvoked(anotherFunc); // Adding a different handler
        expect(logs.filter((e) => e.match(/overriding existing/i))).toHaveLength(1);
        // Second handler
        onInvoked(async (x) => x * 4);

        const result1 = await send(2); // Should use the latest handler
        expect(result1).toBe(8);
        setGlobalLogFunction(defaultLogger);
    });
    it("should handle incompatible event data", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "incompatible");
        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        onInvoked(async (x) => x * 2);
        adapter.dispatchMessage("incompatible", {
            callback: "some-callback",
            args: ["not a number"], // Sending a string instead of a number
        });
        // Expecting nothing has been logged
        await delay(10);
        expect(logs.filter((e) => e.match(/invalid event/i))).toHaveLength(0); // No error should be logged yet
        adapter.dispatchMessage("incompatible.invoke", {});
        await delay(10);
        expect(logs.filter((e) => e.match(/invalid event/i))).toHaveLength(1);
        adapter.dispatchMessage("incompatible.invoke", {});
        await delay(10);
        expect(logs.filter((e) => e.match(/Invalid event/i))).toHaveLength(2);
        await delay(10);

        setGlobalLogFunction(defaultLogger);
    });
    it("should handle no handler case gracefully", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "noHandler");

        // No handler is set
        const p = send(1);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });
});

describe("Transporters", () => {
    it("should send and receive a message via Transporters.of", async () => {
        const [send, onInvoked] = Transporters.of<[number, number], number>("sum");
        onInvoked(async (a, b) => a + b);

        const result = await send(10, 20);
        expect(result).toBe(30);
    });

    it("should allow removing the handler via Transporters.of", async () => {
        const [send, onInvoked] = Transporters.of<[number], number>("inc2");
        const dispose = onInvoked(async (x) => x + 2);

        dispose();

        const p = send(1);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });
});

describe("GlobalTransporters", () => {
    it("should send and receive a message via GlobalTransporters.of", async () => {
        const [send, onInvoked] = GlobalTransporters.of<[number, number], number>("sum");
        onInvoked(async (a, b) => a + b);

        const result = await send(10, 20);
        expect(result).toBe(30);
    });

    it("should allow removing the handler via GlobalTransporters.of", async () => {
        const [send, onInvoked] = GlobalTransporters.of<[number], number>("inc2");
        const dispose = onInvoked(async (x) => x + 2);

        dispose();

        const p = send(1);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });
});

describe("Multiple callee", () => {
    it("should handle multiple callee functions", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "multiCallee");

        const [, onCallee1] = _createTransporter<[number], number>(adapter, "multiCallee");

        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        onInvoked(async (x) => x * 2);
        onInvoked(async (x) => x * 3);

        const result1 = await send(2); // Should use the latest handler
        expect(result1).toBe(6); // Last handler should be used
        console.log(logs);
        expect(logs.filter((e) => e.match(/overriding existing/i))).toHaveLength(1);

        setGlobalLogFunction(defaultLogger);
    });
});

describe("Supplemental tests", () => {
    it("should be able to ignore unknown notifications", async () => {
        const chan = new MessageChannel();
        const adapter = createEmitter(chan);
        const adapter2 = createEmitter(chan);
        const [send, onInvoked, controller] = _createTransporter<[number], number>(adapter, "ignoreNotification", 100);
        const [send2, onInvoked2, controller2] = _createTransporter<[number], number>(
            adapter2,
            "ignoreNotification",
            100
        );
        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        onInvoked(async (x) => x * 2);
        // This will override the previous handler
        onInvoked2(async (x) => x * 3);
        await delay(10);

        // Activate the first controller
        controller.dispatchCommand("activate", controller.instanceName);
        await delay(100);

        const result = await send(2); // Should use the latest handler
        expect(result).toBe(4); // Last handler should be used

        // Activate the second controller
        controller2.dispatchCommand("activate", controller2.instanceName);
        await delay(100);
        const result2 = await send2(2); // Should use the latest handler
        expect(result2).toBe(6); // Last handler should be used

        controller2.deactivate();
        const result3 = send2(2); // No handler is active, so it should throw an error
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        // No handler is active, so it should throw an error
        await expect(Promise.race([result3, timeout])).rejects.toThrow("Failed to dispatch event");

        // Expecting nothing has been logged
        await delay(10);

        controller.activate();
        await delay(10);
        // Sending a notification that is not handled
        controller.dispatchCommand("dummy" as unknown as any, "foobar");
        await delay(10);
        console.log(logs);
        expect(logs.filter((e) => e.match(/invalid event/i))).toHaveLength(0); // No error should be logged yet

        setGlobalLogFunction(defaultLogger);
    });

    it("should not handle the void function", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], void>(adapter, "voidFunction");

        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        onInvoked(async (num) => {
            /* do nothing */
        });

        const result = await send(1);
        expect(result).toBeUndefined(); // Void function should return undefined
        console.log(logs);
        // expect(logs.filter(e => e.match(/invalid event/i))).toHaveLength(0); // No error should be logged

        setGlobalLogFunction(defaultLogger);
    });

    it("TransportAdapter can be closed", async () => {
        const adapter = createEmitter();
        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "closeTest");

        onInvoked(async (x) => x * 2);

        const result = await send(2);
        expect(result).toBe(4);

        // Close the adapter
        adapter.close();

        // After closing, it should not accept any more messages
        const p = send(3);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });
    it("TransportAdapter handles other messages", async () => {
        const chan = new MessageChannel();
        const adapter = createEmitter(chan);

        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "otherTest2");

        onInvoked(async (x) => x * 2);

        const logs = [] as string[];
        const logger = (e: any) => logs.push(e) && console.log(e);
        setGlobalLogFunction(logger);

        const result = await send(2);
        expect(result).toBe(4);

        await delay(10);
        // Dispatch a message that is not handled
        chan.port1.postMessage({
            type: "unhandledMessage",
            payload: { data: "some data" },
        });
        chan.port2.postMessage({
            type: "unhandledMessage",
            payload: { data: "some other data" },
        });
        chan.port1.postMessage({
            type: "anotherUnhandledMessage",
            payload: { data: "yet another data" },
            key: "unknownKey",
        });
        chan.port1.postMessage({
            type: "anotherUnhandledMessage",
            // payload: { data: "yet another data" },
            key: "unknownKey",
        });
        await delay(10);

        // Expecting nothing has been logged
        const release = adapter.setListener("unknown", (noo) => {}, { once: true });
        release();

        const func = vi.fn(() => {});
        adapter.setListener("unknown2", func, { once: true });
        adapter.removeListener("unknown2", () => {
            return 1;
        });
        adapter.removeListener("unknown2", func);
        const ac = new AbortController();
        adapter.setListener("unknown3", func, { signal: ac.signal });
        ac.abort();
        adapter.dispatchMessage("unknown3", { data: "some data" });
        expect(func).toHaveBeenCalledTimes(0);

        console.log(logs);
        setGlobalLogFunction(defaultLogger);
    });
    it("TransportAdapter Errors can be handled", async () => {
        const chan = new MessageChannel();
        const adapter = createEmitter(chan);

        const [send, onInvoked] = _createTransporter<[number], number>(adapter, "closeTest");

        onInvoked(async (x) => x * 2);

        const result = await send(2);
        expect(result).toBe(4);

        onInvoked(async (x) => {
            throw new Error("Test error");
        });
        const result2 = send(3);
        await expect(result2).rejects.toThrow("Test error");

        // Close ports of the channel
        chan.port1.close();
        chan.port2.close();

        // After closing, it should not accept any more messages
        const p = send(3);
        const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Failed to dispatch event")), 100)
        );
        await expect(Promise.race([p, timeout])).rejects.toThrow("Failed to dispatch event");
    });

    it("TransportAdapter internal errors correctly handled", async () => {
        const chan = new MessageChannel();
        const adapter = new PostMessageBackbone(chan);
        const type = "testType";
        const payload = { data: "testData" };
        const logs = [] as string[];
        const logger = (e: any) => logs.push(`${e}`) && console.log(e);
        setGlobalLogFunction(logger);

        const errorHandler = vi.fn();
        adapter.setListener(
            type,
            () => {
                throw new Error("Test error");
            },
            { once: true }
        );

        const p = adapter._tx.postMessage({ type, payload, key: transporterKey } as any);
        // await expect(p).rejects.toThrow("Test error");
        await delay(50); // Wait for the error to propagate
        expect(logs.filter((e) => e.indexOf("Error handling message of type testType") !== -1).length).toBe(1);
    });
    it("TransportAdapter internal errors correctly handled", async () => {
        const chan = new MessageChannel();
        const adapter = new PostMessageBackbone(chan);
        const type = "testType";
        const payload = { data: "testData" };
        const logs = [] as string[];
        const logger = (e: any) => logs.push(`${e}`) && console.log(e);
        setGlobalLogFunction(logger);

        adapter.setListener(
            type,
            () => {
                throw new Error("Test error");
            },
            { once: true }
        );

        adapter._abortController.abort(); // Abort the controller to simulate an error

        const p = adapter._tx.postMessage({ type, payload, key: transporterKey } as any);
        // await expect(p).rejects.toThrow("Test error");
        await delay(50); // Wait for the error to propagate
    });
});
