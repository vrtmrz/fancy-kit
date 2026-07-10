import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import { Actor, LogActorBase, type ActorLogMessage } from "./actor";
import { delay, promiseWithResolver, type PromiseWithResolvers } from "./promises";

export class TestActor extends Actor<string> {
    constructor() {
        super();
    }

    process(message: string): void {
        this.dispatch(TestActor2, { org: message, new: message.toLowerCase() });
    }
}

export class TestActor2 extends Actor<{ org: string; new: string }> {
    constructor() {
        super();
    }

    process(arg: { org: string; new: string }): void {
        this.dispatch(TestActorYieldingResult, `${arg.org}/${arg.new}`);
    }
}

export class TestActorYieldingResult extends Actor<string> {
    constructor() {
        super();
    }

    result = [] as string[];

    async process(message: string): Promise<void> {
        this.result.push(message);
        this.dispatch(LogActor, { message: `Message2:  ${message}` });
    }
}

export class LogActor extends LogActorBase {
    constructor() {
        super();
    }

    process(message: ActorLogMessage): void {
        if (message.message === "notassigned") {
            this.destroy();
            this.dispatch(NotAssignedActor, "message");
        }
        console.log(`${message.message}`);
    }
}
export class AsyncActor extends Actor<string> {
    override multiInstance = true;
    static count = 0;
    instanceCount = AsyncActor.count++;

    constructor() {
        super({ multiInstance: true });
    }

    static concurrency = 0;
    async process(message: string) {
        AsyncActor.concurrency++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        const currentConcurrency = AsyncActor.concurrency;
        const result = `Async:${message}:${currentConcurrency}`;
        await new Promise((resolve) => setTimeout(resolve, 200));
        this.dispatch(TestActorYieldingResult, result);
        AsyncActor.concurrency--;
    }
}
export class NonConcurrentActor extends Actor<string> {
    // override multiInstance = true;
    static count = 0;
    instanceCount = NonConcurrentActor.count++;

    constructor() {
        super();
    }

    static concurrency = 0;
    async process(message: string) {
        NonConcurrentActor.concurrency++;
        await new Promise((resolve) => setTimeout(resolve, 10));
        const currentConcurrency = NonConcurrentActor.concurrency;
        const result = `NonAsync:${message}:${currentConcurrency}`;
        await new Promise((resolve) => setTimeout(resolve, 200));
        this.dispatch(TestActorYieldingResult, result);
        NonConcurrentActor.concurrency--;
    }
}

class NotAssignedActor extends Actor<string> {
    constructor() {
        super();
    }

    process(message: string) {
        // NO OP
    }
}

class DestroyedActor extends Actor<string> {
    constructor() {
        super();
    }

    process(message: string) {
        // NO OP
    }
}

describe.sequential("actor", () => {
    const m = vi.spyOn(console, "log");
    const mx = vi.spyOn(console, "error");
    afterAll(() => {
        m.mockRestore();
        mx.mockRestore();
    });
    test("total", async () => {
        new LogActor();
        const a = new TestActor();
        new TestActor2();
        const z = new AsyncActor();
        // new AsyncActor().destroy();
        new AsyncActor();
        const results = new TestActorYieldingResult();
        const nonConcurrentActor = new NonConcurrentActor();
        new NonConcurrentActor();
        new NonConcurrentActor();
        nonConcurrentActor.post("sync");
        nonConcurrentActor.post("sync");
        nonConcurrentActor.post("sync");
        a.post("helloWorld");
        z.post("async!");
        z.post("async!");
        z.post("async!");

        await delay(2000);
        const result = results.result.sort();
        expect(result).toEqual(
            [
                "helloWorld/helloworld",
                "Async:async!:1",
                "Async:async!:2",
                "Async:async!:2",
                "NonAsync:sync:1",
                "NonAsync:sync:1",
                "NonAsync:sync:1",
            ].sort()
        );
    });

    test.sequential("NotAssigned", async () => {
        const a = new TestActor();
        // const m = vi.spyOn(console, 'log');
        a.dispatch(NotAssignedActor, "helloWorld");

        await delay(200);

        expect(m).toBeCalledWith("The instance of Actor NotAssignedActor is not assigned to the hub");
    });

    test.sequential("Destroyed", async () => {
        // const m = vi.spyOn(console, 'log');
        const z = new DestroyedActor();
        z.destroy();
        await expect(async () => z.postToThisInstance("hurray")).rejects.toThrow("The actor has been destroyed");
        // z.postToThisInstance("hurray");
    });
    // const m = vi.spyOn(console, 'log');
    // befo(() => {
    //     m.mockRestore();
    // });
    test.sequential("Destroyed (Not assigned)", async () => {
        const z = new DestroyedActor();
        z.destroy();
        z.post("hurray");

        await delay(200);

        expect(m).toBeCalledWith("The instance of Actor DestroyedActor is not assigned to the hub");
        // m.mockRestore();
    });
    test.sequential("LogActor's Error", async () => {
        await delay(10);

        // class LogActorError extends LogActorBase {
        //     constructor() {
        //         super();
        //     }

        //     process(message: ActorLogMessage): void {
        //         this.dispatch(NotAssignedActor, "message");
        //     }
        // };
        // new LogActorError();
        // LogActor.hub.dispatch("LogActor", { message: "notassigned" });
        LogActor.hub.dispatch("LogActor", { message: "notassigned" });
        await delay(10);

        expect(mx).toBeCalledWith("LogActor is not assigned but dispatched to itself");
    });
});
