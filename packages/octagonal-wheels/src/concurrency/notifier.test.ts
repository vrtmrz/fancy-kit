import { describe, expect, it } from "vitest";
import { createNotifier } from "./notifier.ts";
import { Notifier as LegacyNotifierV1 } from "./processor_v1.ts";
import { Notifier as LegacyNotifierV2 } from "./processor_v2.ts";

describe("createNotifier", () => {
    it("resolves all currently registered waits from their shared promise", async () => {
        const notifier = createNotifier();
        const first = notifier.wait();
        const second = notifier.wait();
        expect(second).toBe(first);

        let resolvedWaits = 0;
        const observed = Promise.all([
            first.then(() => resolvedWaits++),
            second.then(() => resolvedWaits++),
        ]);
        notifier.notify();
        await observed;
        expect(resolvedWaits).toBe(2);

        const next = notifier.wait();
        expect(next).not.toBe(first);
        notifier.notify();
        await next;
    });

    it("discards notifications sent before a wait and repeated idle notifications", async () => {
        const notifier = createNotifier();
        notifier.notify();
        notifier.notify();

        let resolved = false;
        const waiting = notifier.wait().then(() => {
            resolved = true;
        });
        await Promise.resolve();
        expect(resolved).toBe(false);

        notifier.notify();
        notifier.notify();
        await waiting;
        expect(resolved).toBe(true);

        let nextResolved = false;
        const next = notifier.wait().then(() => {
            nextResolved = true;
        });
        await Promise.resolve();
        expect(nextResolved).toBe(false);
        notifier.notify();
        await next;
    });

    it("keeps independent instances separate", async () => {
        const first = createNotifier();
        const second = createNotifier();
        const firstWait = first.wait();
        let secondResolved = false;
        const secondWait = second.wait().then(() => {
            secondResolved = true;
        });

        first.notify();
        await firstWait;
        await Promise.resolve();
        expect(secondResolved).toBe(false);

        second.notify();
        await secondWait;
        expect(secondResolved).toBe(true);
    });

    it("keeps detached methods bound to their owning instance", async () => {
        const notifier = createNotifier();
        const { wait, notify } = notifier;
        const waiting = wait();
        notify();
        await waiting;
    });
});

describe("legacy Notifier adapters", () => {
    it.each([
        ["processor_v1", () => new LegacyNotifierV1()],
        ["processor_v2", () => new LegacyNotifierV2()],
    ])("%s preserves its fields and follows the current wait-group contract", async (_name, create) => {
        const notifier = create();
        expect(notifier.isUsed).toBe(false);

        const current = notifier.nextNotify;
        expect(notifier._p.promise).toBe(current);
        expect(notifier.nextNotify).toBe(current);
        expect(notifier.isUsed).toBe(true);

        notifier.notify();
        expect(notifier.isUsed).toBe(false);
        expect(notifier._p.promise).not.toBe(current);
        await current;

        notifier.notify();
        const next = notifier.nextNotify;
        expect(next).not.toBe(current);
        notifier.notify();
        await next;
    });

    it("keeps the legacy and factory instances independently signalable", async () => {
        const modern = createNotifier();
        const legacy = new LegacyNotifierV2();
        const modernWait = modern.wait();
        let legacyResolved = false;
        const legacyWait = legacy.nextNotify.then(() => {
            legacyResolved = true;
        });

        modern.notify();
        await modernWait;
        await Promise.resolve();
        expect(legacyResolved).toBe(false);

        legacy.notify();
        await legacyWait;
        expect(legacyResolved).toBe(true);
    });
});
