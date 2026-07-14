import { describe, expect, it, vi } from "vitest";
import {
    createScreenWakeLockManager,
    ScreenWakeLockManagerDisposedError,
    type ScreenWakeLockDocument,
    type ScreenWakeLockEvent,
    type ScreenWakeLockProvider,
    type ScreenWakeLockSentinel,
} from "./wakeLock.ts";

class FakeSentinel implements ScreenWakeLockSentinel {
    readonly listeners = new Set<() => void>();
    released = false;
    releaseCalls = 0;

    addEventListener(_type: "release", listener: () => void): void {
        this.listeners.add(listener);
    }

    removeEventListener(_type: "release", listener: () => void): void {
        this.listeners.delete(listener);
    }

    async release(): Promise<void> {
        this.releaseCalls += 1;
        this.forceRelease();
    }

    forceRelease(): void {
        if (this.released) return;
        this.released = true;
        for (const listener of [...this.listeners]) listener();
    }
}

class FakeDocument implements ScreenWakeLockDocument {
    readonly listeners = new Set<() => void>();
    visibilityState = "visible";

    addEventListener(_type: "visibilitychange", listener: () => void): void {
        this.listeners.add(listener);
    }

    removeEventListener(_type: "visibilitychange", listener: () => void): void {
        this.listeners.delete(listener);
    }

    setVisibility(visibilityState: string): void {
        this.visibilityState = visibilityState;
        for (const listener of [...this.listeners]) listener();
    }
}

function createProvider(): ScreenWakeLockProvider & {
    readonly sentinels: FakeSentinel[];
    readonly requestCount: number;
} {
    const sentinels: FakeSentinel[] = [];
    let requestCount = 0;
    return {
        sentinels,
        get requestCount(): number {
            return requestCount;
        },
        async request(): Promise<FakeSentinel> {
            requestCount += 1;
            const sentinel = new FakeSentinel();
            sentinels.push(sentinel);
            return sentinel;
        },
    };
}

function deferred<T>(): {
    promise: Promise<T>;
    resolve(value: T): void;
} {
    let resolvePromise: ((value: T) => void) | undefined;
    const promise = new Promise<T>((resolve) => {
        resolvePromise = resolve;
    });
    return {
        promise,
        resolve(value: T): void {
            resolvePromise?.(value);
        },
    };
}

describe("createScreenWakeLockManager", () => {
    it("resolves browser globals when dependencies are omitted", async () => {
        const manager = createScreenWakeLockManager();
        const browserWakeLock = (navigator as Navigator & { wakeLock?: unknown }).wakeLock;

        expect(manager.supported).toBe(browserWakeLock !== undefined && browserWakeLock !== null);
        await manager.dispose();
    });

    it("runs the task when the platform API is unavailable", async () => {
        const events: ScreenWakeLockEvent[] = [];
        const manager = createScreenWakeLockManager({
            provider: null,
            document: null,
            onEvent: (event) => events.push(event),
        });

        await expect(manager.run(() => "done", { label: "backup" })).resolves.toBe("done");

        expect(manager.supported).toBe(false);
        expect(manager.activeLeaseCount).toBe(0);
        expect(events.map(({ type }) => type)).toEqual(["lease-acquired", "unsupported", "lease-released"]);
    });

    it("acquires before a task and releases it afterwards", async () => {
        const provider = createProvider();
        const manager = createScreenWakeLockManager({ provider, document: null });

        const result = await manager.run(async () => {
            expect(manager.held).toBe(true);
            expect(manager.activeLeaseCount).toBe(1);
            return 42;
        });

        expect(result).toBe(42);
        expect(provider.requestCount).toBe(1);
        expect(provider.sentinels[0]?.releaseCalls).toBe(1);
        expect(manager.held).toBe(false);
    });

    it("releases the lease and preserves a task error", async () => {
        const provider = createProvider();
        const manager = createScreenWakeLockManager({ provider, document: null });
        const failure = new Error("backup failed");

        await expect(
            manager.run(() => {
                throw failure;
            })
        ).rejects.toBe(failure);

        expect(provider.sentinels[0]?.releaseCalls).toBe(1);
        expect(manager.activeLeaseCount).toBe(0);
    });

    it.each(["rejected", "thrown"] as const)("continues when a platform request is %s", async (failureKind) => {
        const error = new Error("not allowed");
        const events: ScreenWakeLockEvent[] = [];
        const provider: ScreenWakeLockProvider = {
            request(): Promise<ScreenWakeLockSentinel> {
                if (failureKind === "thrown") throw error;
                return Promise.reject(error);
            },
        };
        const manager = createScreenWakeLockManager({
            provider,
            document: null,
            onEvent: (event) => events.push(event),
        });

        await expect(manager.run(() => "continued")).resolves.toBe("continued");

        expect(events).toContainEqual({
            type: "wake-lock-error",
            operation: "request",
            error,
            activeLeaseCount: 1,
        });
    });

    it("shares one platform request across overlapping leases", async () => {
        const pending = deferred<ScreenWakeLockSentinel>();
        const sentinel = new FakeSentinel();
        const request = vi.fn(() => pending.promise);
        const manager = createScreenWakeLockManager({
            provider: { request },
            document: null,
        });

        const firstPromise = manager.acquire({ label: "first" });
        const secondPromise = manager.acquire({ label: "second" });
        expect(request).toHaveBeenCalledTimes(1);
        pending.resolve(sentinel);
        const [first, second] = await Promise.all([firstPromise, secondPromise]);

        await first.dispose();
        expect(manager.held).toBe(true);
        expect(sentinel.releaseCalls).toBe(0);
        await second.dispose();
        await second.dispose();
        expect(sentinel.releaseCalls).toBe(1);
    });

    it("treats platform release failures as best-effort diagnostics", async () => {
        const error = new Error("release failed");
        const sentinel = new FakeSentinel();
        sentinel.release = () => Promise.reject(error);
        const events: ScreenWakeLockEvent[] = [];
        const manager = createScreenWakeLockManager({
            provider: { request: () => Promise.resolve(sentinel) },
            document: null,
            onEvent: (event) => events.push(event),
        });

        await expect(manager.run(() => "continued")).resolves.toBe("continued");

        expect(manager.held).toBe(false);
        expect(events).toContainEqual({
            type: "wake-lock-error",
            operation: "release",
            error,
            activeLeaseCount: 0,
        });
    });

    it("releases while hidden and reacquires after becoming visible", async () => {
        const provider = createProvider();
        const visibilityDocument = new FakeDocument();
        const manager = createScreenWakeLockManager({
            provider,
            document: visibilityDocument,
        });
        const lease = await manager.acquire();
        const firstSentinel = provider.sentinels[0];

        visibilityDocument.setVisibility("hidden");
        await vi.waitFor(() => expect(firstSentinel?.released).toBe(true));
        expect(manager.activeLeaseCount).toBe(1);

        visibilityDocument.setVisibility("visible");
        await vi.waitFor(() => expect(provider.requestCount).toBe(2));
        expect(manager.held).toBe(true);

        await lease.dispose();
    });

    it("does not loop after a system release and retries on a visibility cycle", async () => {
        const provider = createProvider();
        const visibilityDocument = new FakeDocument();
        const manager = createScreenWakeLockManager({
            provider,
            document: visibilityDocument,
        });
        const lease = await manager.acquire();

        provider.sentinels[0]?.forceRelease();
        expect(manager.held).toBe(false);
        expect(provider.requestCount).toBe(1);

        visibilityDocument.setVisibility("hidden");
        visibilityDocument.setVisibility("visible");
        await vi.waitFor(() => expect(provider.requestCount).toBe(2));

        await lease.dispose();
    });

    it("releases a delayed sentinel when its signal is aborted", async () => {
        const pending = deferred<ScreenWakeLockSentinel>();
        const sentinel = new FakeSentinel();
        const controller = new AbortController();
        const manager = createScreenWakeLockManager({
            provider: { request: () => pending.promise },
            document: null,
        });

        const leasePromise = manager.acquire({ signal: controller.signal });
        controller.abort();
        const lease = await leasePromise;

        expect(lease.released).toBe(true);
        expect(manager.activeLeaseCount).toBe(0);
        expect(sentinel.releaseCalls).toBe(0);

        pending.resolve(sentinel);
        await vi.waitFor(() => expect(sentinel.releaseCalls).toBe(1));
    });

    it("unblocks a pending acquisition when the manager is disposed", async () => {
        const pending = deferred<ScreenWakeLockSentinel>();
        const sentinel = new FakeSentinel();
        const manager = createScreenWakeLockManager({
            provider: { request: () => pending.promise },
            document: null,
        });

        const leasePromise = manager.acquire();
        await manager.dispose();
        const lease = await leasePromise;

        expect(lease.released).toBe(true);
        pending.resolve(sentinel);
        await vi.waitFor(() => expect(sentinel.releaseCalls).toBe(1));
    });

    it("creates an inert lease for an already-aborted signal", async () => {
        const provider = createProvider();
        const controller = new AbortController();
        controller.abort();
        const manager = createScreenWakeLockManager({ provider, document: null });

        const lease = await manager.acquire({ signal: controller.signal });

        expect(lease.released).toBe(true);
        expect(provider.requestCount).toBe(0);
    });

    it("disposes all leases and rejects later reuse", async () => {
        const provider = createProvider();
        const manager = createScreenWakeLockManager({ provider, document: null });
        const first = await manager.acquire();
        const second = await manager.acquire();

        await manager.dispose();
        await manager.dispose();

        expect(first.released).toBe(true);
        expect(second.released).toBe(true);
        expect(provider.sentinels[0]?.releaseCalls).toBe(1);
        await expect(manager.acquire()).rejects.toBeInstanceOf(ScreenWakeLockManagerDisposedError);
    });

    it("does not let a diagnostic observer alter a task", async () => {
        const manager = createScreenWakeLockManager({
            provider: null,
            document: null,
            onEvent: () => {
                throw new Error("observer failed");
            },
        });

        await expect(manager.run(() => "safe")).resolves.toBe("safe");
    });
});
