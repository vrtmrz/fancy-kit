import { describe, it, expect, vi } from "vitest";
import { EventHub } from "./EventHub.ts";
import { promiseWithResolvers } from "../promises.ts";

declare global {
    interface TestEvents {
        hello_test: string;
        world_test: undefined;
        test_event: string;
    }
}

function createEventHub(emitter?: EventTarget) {
    const hub = new EventHub<TestEvents>(emitter);
    return hub;
}
describe("EventHub-high-level", () => {
    it("should emit and listen to events without data", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.onEvent("world_test", callback);
        hub.emitEvent("world_test");
        expect(callback).toHaveBeenCalled();
    });

    it("should emit and listen to events with data", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.onEvent("hello_test", (data) => {
            callback(data);
        });
        hub.emitEvent("hello_test", "world_test");

        expect(callback).toHaveBeenCalledWith("world_test");
    });

    it("should remove event listener", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        const off = hub.onEvent("hello_test", callback);
        off();
        hub.emitEvent("world_test");

        expect(callback).not.toHaveBeenCalled();
    });

    it("should listen to an event only once", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.once("world_test", callback);
        hub.emitEvent("world_test");
        hub.emitEvent("world_test");

        expect(callback).toHaveBeenCalledTimes(1);
    });

    it("should wait for an event", async () => {
        const hub = createEventHub();

        setTimeout(() => {
            hub.emitEvent("world_test");
        }, 100);

        await expect(hub.waitFor("world_test")).resolves.toBe(null);
    });

    it("should wait for an event with data", async () => {
        const hub = createEventHub();

        setTimeout(() => {
            hub.emitEvent("hello_test", "world_test");
        }, 100);

        await expect(hub.waitFor("hello_test")).resolves.toBe("world_test");
    });
});

describe("EventHub-low-level", () => {
    it("should emit and listen to events without data", async () => {
        const hub = createEventHub();
        const p = promiseWithResolvers<string>();

        hub.on("world_test", (e) => {
            p.resolve(e.type);
        });
        hub.emitEvent("world_test");
        await expect(p.promise).resolves.toBe("world_test");
        // expect(callback).toHaveBeenCalled();
    });

    it("should emit and listen to events with data", async () => {
        const hub = createEventHub();
        const p = promiseWithResolvers<{
            type: string;
            data: string;
        }>();
        const p2 = promiseWithResolvers<{
            type: string;
            data: string;
        }>();
        hub.on("hello_test", (e) => {
            p.resolve({
                type: e.type,
                data: (e as CustomEvent).detail,
            });
        });
        hub.on("hello_test", (e) => {
            p2.resolve({
                type: e.type,
                data: (e as CustomEvent).detail,
            });
        });
        hub.emitEvent("hello_test", "world_test");

        await expect(p.promise).resolves.toEqual({
            type: "hello_test",
            data: "world_test",
        });
        await expect(p2.promise).resolves.toEqual({
            type: "hello_test",
            data: "world_test",
        });
    });

    it("should respond as all emitted events", () => {
        const hub = createEventHub();
        let totalCalled = 0;
        hub.on("world_test", (e) => {
            totalCalled++;
        });

        hub.emitEvent("world_test");
        hub.emitEvent("world_test");

        expect(totalCalled).toBe(2);
    });

    it("should listen to an event only once", () => {
        const hub = createEventHub();
        let totalCalled = 0;
        hub.once("world_test", (e) => {
            totalCalled++;
        });

        hub.emitEvent("world_test");
        hub.emitEvent("world_test");

        expect(totalCalled).toBe(1);
    });

    it("should listen to an event only once (By handlers stopImmediatePropagation)", () => {
        const hub = createEventHub();
        let totalCalled = 0;
        hub.on("world_test", (e) => {
            e.stopImmediatePropagation();
            totalCalled++;
        });
        hub.on("world_test", (e) => {
            e.stopImmediatePropagation();
            totalCalled++;
        });

        hub.emitEvent("world_test");

        expect(totalCalled).toBe(1);
    });
});
describe("EventHub-off", () => {
    it("should handle onceEvent correctly", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.onceEvent("hello_test", callback);
        hub.emitEvent("hello_test", "test1");
        hub.emitEvent("hello_test", "test2");

        expect(callback).toHaveBeenCalledTimes(1);
        expect(callback).toHaveBeenCalledWith("test1");
    });

    it("should remove specific event listener with off", () => {
        const hub = createEventHub();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        hub.on("world_test", callback1);
        hub.on("world_test", callback2);

        hub.off("world_test", callback1);
        hub.emitEvent("world_test");

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
    });

    it("should handle multiple events with same callback", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.onEvent("world_test", callback);
        hub.onEvent("hello_test", callback);

        hub.emitEvent("world_test");
        hub.emitEvent("hello_test", "test");

        expect(callback).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple events with same callback and off one of them", () => {
        const hub = createEventHub();
        const callback = vi.fn();

        hub.onEvent("world_test", callback);
        hub.onEvent("hello_test", callback);
        hub.off("world_test", callback);
        hub.emitEvent("world_test");
        hub.emitEvent("hello_test", "test");

        expect(callback).toHaveBeenCalledTimes(1);
    });
    it("should remove specific event listener with off by return-callback", () => {
        const hub = createEventHub();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        const off1 = hub.on("world_test", callback1);
        hub.on("world_test", callback2);

        off1();
        hub.emitEvent("world_test");

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).toHaveBeenCalled();
    });
});
describe("event-off-all", () => {
    it("should remove all event listeners with offAll", () => {
        const hub = createEventHub();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        hub.onEvent("world_test", callback1);
        hub.onEvent("hello_test", callback2);

        hub.offAll();

        hub.emitEvent("world_test");
        hub.emitEvent("hello_test", "test");

        expect(callback1).not.toHaveBeenCalled();
        expect(callback2).not.toHaveBeenCalled();
    });
});

describe("multiple-hubs", () => {
    it("should handle multiple hubs independently", () => {
        const hub1 = createEventHub();
        const hub2 = createEventHub();
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        hub1.onEvent("test_event", callback1);
        hub2.onEvent("test_event", callback2);

        hub1.emitEvent("test_event", "data1");
        hub2.emitEvent("test_event", "data2");

        expect(callback1).toHaveBeenCalledWith("data1");
        expect(callback1).not.toHaveBeenCalledWith("data2");
        expect(callback2).not.toHaveBeenCalledWith("data1");
        expect(callback2).toHaveBeenCalledWith("data2");
    });
    it("should share events between hubs", () => {
        const hub1 = createEventHub(window);
        const hub2 = createEventHub(window);
        const callback1 = vi.fn();
        const callback2 = vi.fn();

        hub1.onEvent("test_event", callback1);
        hub2.onEvent("test_event", callback2);

        hub1.emitEvent("test_event", "data1");
        hub2.emitEvent("test_event", "data2");

        expect(callback1).toHaveBeenCalledWith("data1");
        expect(callback1).toHaveBeenCalledWith("data2");
        expect(callback2).toHaveBeenCalledWith("data1");
        expect(callback2).toHaveBeenCalledWith("data2");
    });
});
