import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Port, Broadcaster, Pipeline, Switch, Survey, type ChannelBase } from "./channels.ts";
import { ITransport, DirectTransport, BroadcastChannelTransport } from "./transport.ts";

// Set a short timeout for faster test execution
const TEST_TIMEOUT = 100;

// Override timeout for easier testing
class TestPipeline<T extends any[]> extends Pipeline<T> {
    get _name() {
        return this.channelName;
    }
    override timeoutMs = TEST_TIMEOUT;
    public override knownSubscribers: Set<string> = new Set();
}
class TestSwitch<T extends any[], U> extends Switch<T, U> {
    get _name() {
        return this.channelName;
    }
    override timeoutMs = TEST_TIMEOUT;
    public override knownSubscribers: Set<string> = new Set();
}

class TestSurvey<T extends any[], U> extends Survey<T, U> {
    get _name() {
        return this.channelName;
    }
    override timeoutMs = TEST_TIMEOUT;
    public override knownSubscribers: Set<string> = new Set();
}
class VeryBadError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "VeryBadError";
    }
    override get message(): string {
        throw new Error("Can't get message");
    }
}
async function testChannelClose(channel: ChannelBase) {
    const fn = vi.fn();
    channel.register(fn);
    expect(fn).toHaveBeenCalledTimes(0);
    channel.invoke();
    expect(fn).toHaveBeenCalledTimes(1);
    channel.close();
    channel.invoke();
    expect(fn).toHaveBeenCalledTimes(1);
}
async function testChannelAbort(channel: ChannelBase) {
    const fn = vi.fn();
    expect(fn).toHaveBeenCalledTimes(0);
    const ac = new AbortController();
    channel.register(fn, { signal: ac.signal });
    channel.invoke();
    expect(fn).toHaveBeenCalledTimes(1);
    ac.abort();
    channel.invoke();
    expect(fn).toHaveBeenCalledTimes(1);
}

// Common test suite
function runChannelTests(transportFactory: () => ITransport) {
    let transport: ITransport;

    beforeEach(() => {
        transport = transportFactory();
    });

    afterEach(() => {
        transport.close();
        vi.useRealTimers(); // Reset timers after each test
    });

    // --- 1. Port (1-to-1) ---
    describe("Port", () => {
        let port: Port<[string], string>;

        beforeEach(() => {
            port = new Port("test-port", transport);
        });

        afterEach(() => {
            port.close();
        });

        it("should invoke the registered function and return its result", async () => {
            port.register(async (name) => `Hello, ${name}`);
            const result = await port.invoke("World");
            expect(result).toBe("Hello, World");
        });

        it("should pass arguments correctly", async () => {
            const handler = vi.fn();
            port.register(handler);
            await port.invoke("test-arg");
            expect(handler).toHaveBeenCalledWith("test-arg");
        });

        it("should handle rejected promises from the handler", async () => {
            port.register(async () => {
                throw new Error("Handler Error");
            });
            await expect(port.invoke("test")).rejects.toThrow("Handler Error");
        });

        it("should not throw an error if a function is already registered", () => {
            port.register(async () => "first");
            expect(() => port.register(async () => "second")).not.toThrow();
        });

        it("should allow re-registering after deregistering", async () => {
            const deregister = port.register(async (name) => `Hello, ${name}`);
            deregister();

            // Second registration should succeed
            port.register(async (name) => `Goodbye, ${name}`);
            const result = await port.invoke("World");
            expect(result).toBe("Goodbye, World");
        });
        it("should handle re-registering functions", async () => {
            port.register(async (name) => `Hello, ${name}`);
            port.register(async (name) => `Hi, ${name}`);
            const result = await port.invoke("Alice");
            expect(result).toBe("Hi, Alice"); // The second registration should take effect
        });

        it("should deregister when AbortSignal is aborted", async () => {
            await testChannelAbort(port);
        });
        it("should close properly", async () => {
            await testChannelClose(port);
        });
    });

    // --- 2. Broadcaster (1-to-many) ---
    describe("Broadcaster", () => {
        let broadcaster: Broadcaster<[string, number]>;

        beforeEach(() => {
            broadcaster = new Broadcaster("test-broadcaster", transport);
        });

        afterEach(() => broadcaster.close());

        it("should invoke all registered listeners", async () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            broadcaster.register(listener1);
            broadcaster.register(listener2);

            await broadcaster.invoke("data", 123);

            expect(listener1).toHaveBeenCalledWith("data", 123);
            expect(listener2).toHaveBeenCalledWith("data", 123);
        });

        it("should not throw even if a listener fails", async () => {
            const listener1 = vi.fn().mockImplementation(() => {
                throw new Error("fail");
            });
            const listener2 = vi.fn();
            broadcaster.register(listener1);
            broadcaster.register(listener2);

            await expect(broadcaster.invoke("data", 123)).resolves.toBeUndefined();
            expect(listener2).toHaveBeenCalled();
        });

        it("should stop invoking a listener after it is deregistered", async () => {
            const listener1 = vi.fn();
            const listener2 = vi.fn();
            const deregister1 = broadcaster.register(listener1);
            broadcaster.register(listener2);

            deregister1();
            await broadcaster.invoke("data", 123);

            expect(listener1).not.toHaveBeenCalled();
            expect(listener2).toHaveBeenCalledWith("data", 123);
        });

        it("should deregister when AbortSignal is aborted", async () => {
            await testChannelAbort(broadcaster);
        });
        it("should close properly", async () => {
            await testChannelClose(broadcaster);
        });
    });

    // --- 3. Pipeline (many-to-1, all true) ---
    describe("Pipeline", () => {
        let pipeline: TestPipeline<[]>;

        let idx = 0;
        beforeEach(() => {
            vi.useFakeTimers();
            pipeline = new TestPipeline(`test-pipeline${idx++}`, transport);
        });

        afterEach(() => pipeline.close());

        it("should return true if all handlers return true", async () => {
            pipeline.register(async () => {
                // console.log('Handler 1 executed');
                return true;
            });
            pipeline.register(async () => {
                // console.log('Handler 2 executed');
                return true;
            });

            const resultPromise = pipeline.invoke();
            await vi.advanceTimersByTimeAsync(TEST_TIMEOUT);

            expect(await resultPromise).toBe(true);
        });

        it("should return false if any handler returns false", async () => {
            pipeline.register(async () => true);
            pipeline.register(async () => false); // This returns false
            pipeline.register(async () => true);

            const result = await pipeline.invoke();
            expect(result).toBe(false);
        });

        it("should return false if any handler throws an error", async () => {
            pipeline.register(async () => true);
            pipeline.register(async () => {
                throw new Error("fail");
            });

            const result = await pipeline.invoke();
            expect(result).toBe(false);
        });

        it("should return true if no handlers are registered", async () => {
            const resultPromise = pipeline.invoke();
            await vi.advanceTimersByTimeAsync(TEST_TIMEOUT);
            expect(await resultPromise).toBe(true);
        });
        it("should return false if a handler times out", async () => {
            pipeline.register(async () => {
                await new Promise((res) => setTimeout(res, TEST_TIMEOUT + 50));
                return true;
            });
            pipeline.register(async () => true);
            const resultPromise = pipeline.invoke();
            await vi.advanceTimersByTimeAsync(TEST_TIMEOUT);
            expect(await resultPromise).toBe(false);
        });
        it("should disconnect properly", async () => {
            const r = pipeline.register(async () => false);
            pipeline.register(async () => true);
            const result1 = await pipeline.invoke();
            expect(pipeline.knownSubscribers.size).toBe(2);
            expect(result1).toBe(false);
            r();
            expect(pipeline.knownSubscribers.size).toBe(1);
            const result2 = await pipeline.invoke();
            expect(result2).toBe(true);
        });
        it("should deregister when AbortSignal is aborted", () => {
            const controller = new AbortController();
            const listener = vi.fn();
            pipeline.register(listener, { signal: controller.signal });
            pipeline.invoke();
            expect(listener).toHaveBeenCalledTimes(1);
            controller.abort();
            pipeline.invoke();
            expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
        });
        it("should accept subsequent registrations", async () => {
            pipeline.register(async () => true);
            const result1 = await pipeline.invoke();
            expect(result1).toBe(true);
            const secondPipeline = new TestPipeline(pipeline._name, transport);
            await secondPipeline.waitForAnyAdvertisement();
            const result2 = await secondPipeline.invoke();
            expect(result2).toBe(true);
        });
    });

    // --- 4. Switch (many-to-1, first truthy) ---
    describe("Switch", () => {
        let switcher: TestSwitch<[string], string>;

        beforeEach(() => {
            vi.useFakeTimers();
            switcher = new TestSwitch("test-switch", transport);
        });

        afterEach(() => switcher.close());

        it("should return the result of the first handler that returns a truthy value", async () => {
            switcher.register(async () => Promise.resolve(false));
            switcher.register(async (file) => `handled by B: ${file}`);
            switcher.register(async () => "handled by C");

            const result = await switcher.invoke("test.txt");
            expect(result).toBe("handled by B: test.txt");
        });

        it("should short-circuit and not call subsequent handlers", async () => {
            const handlerA = vi.fn(async () => Promise.resolve(false) as Promise<false>);
            const handlerB = vi.fn(async () => "result B");
            const handlerC = vi.fn(async () => "result C");

            switcher.register(handlerA);
            switcher.register(handlerB);
            switcher.register(handlerC);

            await switcher.invoke("test");

            expect(handlerA).toHaveBeenCalled();
            expect(handlerB).toHaveBeenCalled();
            expect(handlerC).not.toHaveBeenCalled();
        });

        it("should reject if no handler returns a truthy value", async () => {
            switcher.register(async () => false);
            switcher.register(async () => false);

            const resultPromise = switcher.invoke("test");
            await vi.advanceTimersByTimeAsync(TEST_TIMEOUT);

            expect(await resultPromise).toBe(false);
        });

        it("should continue if a handler throws an error", async () => {
            switcher.register(async () => {
                throw new Error("fail");
            });
            switcher.register(async () => "success");

            const result = await switcher.invoke("test");
            expect(result).toBe("success");
        });

        it("should disconnect properly", async () => {
            const r = switcher.register(async () => "2");
            switcher.register(async () => "1");
            const result1 = await switcher.invoke("");
            expect(switcher.knownSubscribers.size).toBe(2);
            expect(result1).toBe("2");
            r();
            expect(switcher.knownSubscribers.size).toBe(1);
            const result2 = await switcher.invoke("");
            expect(result2).toBe("1");
        });
        it("should abort when AbortSignal is aborted", () => {
            const controller = new AbortController();
            const listener = vi.fn();
            switcher.register(listener, { signal: controller.signal });
            switcher.invoke("test");
            expect(listener).toHaveBeenCalledTimes(1);
            controller.abort();
            switcher.invoke("test");
            expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
        });

        it("should accept subsequent instances", async () => {
            switcher.register(async (msg: string) => false);
            const result1 = await switcher.invoke("!");
            expect(result1).toBe(false);
            const secondSwitcher = new TestSwitch(switcher._name, transport) as typeof switcher;
            await secondSwitcher.waitForAnyAdvertisement();
            const result2 = await secondSwitcher.invoke("!!");
            expect(result2).toBe(false);
            secondSwitcher.register(async (msg: string) => msg + "!!");
            const result3 = await secondSwitcher.invoke("hi");
            expect(result3).toBe("hi!!");
            const result4 = await switcher.invoke("hi");
            expect(result4).toBe("hi!!");
        });
    });

    describe("Survey", () => {
        let survey: TestSurvey<[string], string>;

        beforeEach(() => {
            vi.useFakeTimers();
            survey = new TestSurvey("test-survey", transport);
        });
        afterEach(() => survey.close());

        it("should collect results from all handlers", async () => {
            survey.register(async (q) => Promise.resolve(`response from A to ${q}`));
            survey.register(async (q) => Promise.resolve(`response from B to ${q}`));

            const resultPromise = Promise.all(survey.invoke("question"));
            const results = (await resultPromise).sort();

            expect(results).toEqual(["response from A to question", "response from B to question"]);
        });

        it("should handle if a handler disconnects", async () => {
            const r = survey.register(async (q) => `response from A to ${q}`);
            survey.register(async (q) => `response from B to ${q}`);
            const result1 = (await Promise.all(survey.invoke("question"))).sort();
            expect(survey.knownSubscribers.size).toBe(2);
            expect(result1).toEqual(["response from A to question", "response from B to question"]);
            r();
            expect(survey.knownSubscribers.size).toBe(1);
            const result2 = (await Promise.all(survey.invoke("question"))).sort();
            expect(result2).toEqual(["response from B to question"]);
        });

        it("should timeout if handlers do not respond in time", async () => {
            survey.register(async () => {
                await new Promise((res) => setTimeout(res, TEST_TIMEOUT + 50));
                return "late response";
            });
            survey.register(async () => "quick response");
            const resultPromise = survey.invoke("question").map((p) => p.catch(() => undefined));
            await vi.advanceTimersByTimeAsync(TEST_TIMEOUT);
            const results = (await Promise.all(resultPromise)).filter((r) => r !== undefined);

            expect(results).toEqual(["quick response"]); // Only the quick response should be included
        });

        it("should handle if a handler throws an error", async () => {
            survey.register(async () => {
                throw new Error("fail");
            });
            survey.register(async () => "success");

            const resultPromise = survey.invoke("question").map((p) => p.catch(() => undefined));
            const results = (await Promise.all(resultPromise)).filter((r) => r !== undefined);
            expect(results).toEqual(["success"]);
        });
        it("should abort when AbortSignal is aborted", () => {
            const controller = new AbortController();
            const listener = vi.fn();
            survey.register(listener, { signal: controller.signal });
            survey.invoke("test");
            expect(listener).toHaveBeenCalledTimes(1);
            controller.abort();
            survey.invoke("test");
            expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
        });

        it("should accept subsequent instances", async () => {
            survey.register(async (msg: string) => msg + "a");
            const result1 = (await Promise.all(survey.invoke("1"))).sort();
            expect(result1).toStrictEqual(["1a"]);
            const secondSurvey = new TestSurvey(survey._name, transport) as typeof survey;
            await secondSurvey.waitForAnyAdvertisement();
            const result2 = (await Promise.all(secondSurvey.invoke("2"))).sort();
            expect(result2).toStrictEqual(["2a"]);
            secondSurvey.register(async (msg: string) => msg + "b");
            const result3 = (await Promise.all(secondSurvey.invoke("3"))).sort();
            expect(result3).toStrictEqual(["3a", "3b"]);
            const result4 = (await Promise.all(survey.invoke("4"))).sort();
            expect(result4).toStrictEqual(["4a", "4b"]);
            await secondSurvey.waitForAnyAdvertisement();
            // Ensure not blocked
        });
        it("should accept subsequent instances multiple", async () => {
            const secondSurvey = new TestSurvey(survey._name, transport) as typeof survey;
            const promises = [secondSurvey.waitForAnyAdvertisement(), secondSurvey.waitForAnyAdvertisement()];
            survey.register(async (msg: string) => msg + "a");
            const result1 = (await Promise.all(survey.invoke("1"))).sort();
            expect(result1).toStrictEqual(["1a"]);
            await Promise.all(promises);
            const result2 = (await Promise.all(secondSurvey.invoke("2"))).sort();
            expect(result2).toStrictEqual(["2a"]);
        });
    });
    describe("Error Handling", () => {
        it("should accept invalid messages gracefully", async () => {
            const port = new Port("error-handling-port", transport);
            port.register(async (name) => {
                return `Hello, ${name}`;
            });
            transport.publish(port.prefixedChannelName, { type: "invalid", id: "123", args: [] });
            transport.publish(port.prefixedChannelName, { foo: "bar" });
            transport.publish(port.prefixedChannelName, null);
            const resultPromise = port.invoke("World");
            await expect(resultPromise).resolves.toEqual("Hello, World");
            const pipeline = new TestPipeline("error-handling-pipeline", transport);
            pipeline.register(async () => {
                return true;
            });
            transport.publish(pipeline.prefixedChannelName, { type: "invalid", id: "123", args: [] });
            transport.publish(pipeline.prefixedChannelName, { foo: "bar" });
            transport.publish(pipeline.prefixedChannelName, null);
            const resultPromise2 = pipeline.invoke();
            await expect(resultPromise2).resolves.toEqual(true);
            const broadcast = new Broadcaster("error-handling-broadcast", transport);
            broadcast.register(async (msg) => {
                return true;
            });
            transport.publish(broadcast.prefixedChannelName, { type: "invalid", id: "123", args: [] });
            transport.publish(broadcast.prefixedChannelName, { foo: "bar" });
            transport.publish(broadcast.prefixedChannelName, null);
            broadcast.invoke("test");
            const survey = new TestSurvey("error-handling-survey", transport);
            survey.register(async (msg) => {
                return "response";
            });
            transport.publish(survey.prefixedChannelName, { type: "invalid", id: "123", args: [] });
            transport.publish(survey.prefixedChannelName, { foo: "bar" });
            transport.publish(survey.prefixedChannelName, null);
            const resultPromise3 = Promise.all(survey.invoke("question"));
            await expect(resultPromise3).resolves.toEqual(["response"]);
            const switcher = new TestSwitch("error-handling-switch", transport);
            switcher.register(async (msg) => {
                return "x";
            });
            transport.publish(switcher.prefixedChannelName, { type: "invalid", id: "123", args: [] });
            transport.publish(switcher.prefixedChannelName, { foo: "bar" });
            transport.publish(switcher.prefixedChannelName, null);
            const resultPromise4 = switcher.invoke("question");
            await expect(resultPromise4).resolves.toEqual("x");
        });
        it("should handle transport errors gracefully", async () => {
            class FailingTransport extends DirectTransport {
                override publish(channelName: string, data: any): void {
                    throw new Error("Transport failure");
                }
            }
            const transport = new FailingTransport();
            const port = new Port("error-handling-port", transport);
            port.register(async (name) => `Hello, ${name}`);
            const resultPromise = port.invoke("World");
            await expect(resultPromise).rejects.toThrow("Transport failure");
        });
        it("should handle error causing handlers gracefully", async () => {
            const port = new Port("error-causing-port", transport);

            port.register(async (name) => {
                throw new VeryBadError("Handler failure");
            });
            const resultPromise = port.invoke("World");
            // console.log(await resultPromise);
            await expect(resultPromise).rejects.toThrow("Handler failure");
        });
    });
}

// --- Run tests ---

describe("DirectTransport Channels", () => {
    runChannelTests(() => new DirectTransport());
});

describe("BroadcastChannelTransport Channels", () => {
    runChannelTests(() => new BroadcastChannelTransport());
});

describe("BroadcastChannelTransport with iframes in iframe", () => {
    if (typeof document === "undefined" || typeof window === "undefined" || typeof HTMLIFrameElement === "undefined") {
        console.warn("Skipping iframe tests as document or window is not available.");
        return;
    }
    let iframe: HTMLIFrameElement;

    afterEach(() => {
        // Clean up created iframe
        //@ts-ignore
        iframe?.remove();
    });

    it("should communicate between main window and an iframe", async () => {
        //  const tab1 = await browser.newPage();
        const channelName = `iframe-channel-${Math.random()}`;
        // const page = await context.newPage();
        // 1. Create iframe and append to DOM
        const iframe = document.createElement("iframe");
        document.body.appendChild(iframe);

        // 2. Get iframe window context
        const iframeWindow = iframe.contentWindow;
        if (!iframeWindow) throw new Error("Could not get iframe contentWindow");

        // 3. Wait for message in main window
        const messagePromise = new Promise((resolve) => {
            const transport = new BroadcastChannelTransport(false);
            const broadcaster = new Broadcaster<[string]>(channelName, transport);
            broadcaster.register((msg) => resolve(msg)!);
        });

        // 4. Instantiate BroadcastChannel in iframe context and send message
        // `iframeWindow` is a global object, so attach classes there
        (iframeWindow as any).BroadcastChannelTransport = BroadcastChannelTransport;
        (iframeWindow as any).Broadcaster = Broadcaster;

        // Code to execute in iframe context
        const script = `
        const transport = new BroadcastChannelTransport(false);
        const broadcaster = new Broadcaster('${channelName}', transport);
        broadcaster.invoke('Hello from iframe!');
    `;

        const scriptEl = iframe.contentDocument!.createElement("script");
        scriptEl.textContent = script;
        iframe.contentDocument!.body.appendChild(scriptEl);

        // 5. Confirm main window received the message
        await expect(messagePromise).resolves.toBe("Hello from iframe!");
    });
});
