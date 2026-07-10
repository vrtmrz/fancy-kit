import { describe, it, expect } from "vitest";
import { Clerk, ClerkGroup, ClerkState, Feeder, Harvester, Porter } from "./Clerk.ts";
import { Inbox, InboxWithEvent } from "./Inbox.ts";
import { delay, promiseWithResolvers, yieldMicrotask } from "../promises.ts";

describe("Clerk", () => {
    it("should process items using the provided job function", async () => {
        const result: string[] = [];
        const completed = promiseWithResolvers<void>();
        const postBox = new Inbox<string>(5);

        const job = (item: string) => {
            // console.log(item);
            result.push(item);
        };

        const clerk = new Clerk<string>({ assigned: postBox, job });
        clerk.setOnProgress((state) => {
            const detail = state.inboxDetail;
            // console.log(state);
            if (detail.size == 0 && detail.processed != 0 && state.state == ClerkState.IDLE) {
                completed.resolve();
            }
        });
        // Simulate the main loop
        expect(clerk.state).toBe(ClerkState.STALLED);
        await yieldMicrotask(); // Allow the loop to run once
        await delay(10);
        expect(clerk.state).toBe(ClerkState.IDLE);
        const expected = [] as string[];
        for (let i = 0; i < 10; i++) {
            const testStr = "Hello " + i;
            expected.push(testStr);
            await postBox.post(testStr);
        }
        await completed.promise;

        expect(result).toEqual(expected);

        // Dispose the clerk and ensure the loop exits
        postBox.dispose();
        await postBox.onDisposed;
        await clerk.onDisposed;
        await delay(10);
        expect(clerk.state).toBe(ClerkState.DISPOSED);
    });

    it("should processable multiple clerks", async () => {
        const result: string[] = [];
        const completed = promiseWithResolvers<void>();
        const completed2 = promiseWithResolvers<void>();

        const postBox = new Inbox<string>(5);

        const job = async (item: string) => {
            // console.log(item);
            await delay(Math.random() * 40);
            result.push(item);
        };
        const job2 = async (item: string) => {
            // console.log(item);
            await delay(Math.random() * 10);
            result.push(item);
        };
        const clerk = new Clerk<string>({ assigned: postBox, job });
        clerk.setOnProgress((state) => {
            const detail = state.inboxDetail;
            // console.log(state);
            if (detail.size == 0 && detail.processed != 0 && state.state == ClerkState.IDLE) {
                completed.resolve();
            }
        });
        const clerk2 = new Clerk<string>({ assigned: postBox, job: job2 });
        clerk2.setOnProgress((state) => {
            const detail = state.inboxDetail;
            // console.log(state);
            if (detail.size == 0 && detail.processed != 0 && state.state == ClerkState.IDLE) {
                completed2.resolve();
            }
        });
        await yieldMicrotask(); // Allow the loop to run once
        await delay(10);
        const expected = [] as string[];
        for (let i = 0; i < 100; i++) {
            const testStr = "Hello " + `000${i}`.slice(-3);
            expected.push(testStr);
            await postBox.post(testStr);
        }

        await Promise.all([completed.promise, completed2.promise]);

        expect(result.sort()).toEqual(expected);

        expect(clerk.stateDetail.totalProcessed).not.toBe(clerk2.stateDetail.totalProcessed);
        expect(clerk.stateDetail.totalProcessed + clerk2.stateDetail.totalProcessed).toBe(100);
        // Dispose the clerk and ensure the loop exits
        postBox.dispose();
        await delay(10);
        expect(clerk.state).toBe(ClerkState.DISPOSED);
        expect(clerk2.state).toBe(ClerkState.DISPOSED);
    });
});

describe("Porter", () => {
    it("should batch items and post them to the outgoing inbox", async () => {
        // const result: string[][] = [];
        const completed = promiseWithResolvers<void>();
        const postBox = new InboxWithEvent<string>(5);
        const outgoingBox = new InboxWithEvent<string[]>(5);

        const porter = new Porter<string>({
            from: postBox,
            to: outgoingBox,
            timeout: 50,
            maxSize: 3,
        });

        const harvester = new Harvester<string[]>({
            assigned: outgoingBox,
        });

        const expected = [
            ["item1", "item2", "item3"],
            ["item4", "item5", "item6"],
            ["item7", "item8", "item9"],
            ["item10"],
        ];

        for (let i = 1; i <= 10; i++) {
            await postBox.post(`item${i}`);
        }

        const checkStates = () => {
            if (porter.stateDetail.isBusy) return;
            if (harvester.stateDetail.isBusy) return;
            completed.resolve();
        };
        harvester.setOnProgress((state) => {
            checkStates();
        });
        porter.setOnProgress((state) => {
            checkStates();
        });
        await completed.promise;

        expect(harvester.drainAndReset()).toEqual(expected);

        postBox.dispose();
        await delay(10);
        expect(porter.state).toBe(ClerkState.DISPOSED);
    });

    it("should flush items after timeout if maxSize is not reached", async () => {
        const completed = promiseWithResolvers<void>();
        const postBox = new InboxWithEvent<string>(5);
        const outgoingBox = new InboxWithEvent<string[]>(5);

        const source = async function* () {
            for (let i = 1; i <= 3; i++) {
                yield `item${i}`;
            }
            await delay(100);
            for (let i = 4; i <= 8; i++) {
                yield `item${i}`;
            }
        };
        const porter = new Porter<string>({
            from: postBox,
            to: outgoingBox,
            timeout: 50,
            maxSize: 5,
        });

        const harvester = new Harvester<string[]>({
            assigned: outgoingBox,
        });
        const feeder = new Feeder({
            source: source(),
            target: postBox,
        });
        const checkStates = () => {
            if (porter.stateDetail.isBusy) return;
            if (harvester.stateDetail.isBusy) return;
            if (!feeder._hasFinished) return;
            completed.resolve();
        };

        harvester.setOnProgress((state) => {
            checkStates();
        });
        porter.setOnProgress((state) => {
            checkStates();
        });

        feeder.setOnProgress((state) => {
            checkStates();
        });

        const expected = [
            ["item1", "item2", "item3"],
            ["item4", "item5", "item6", "item7", "item8"],
        ];

        // await delay(100);
        // await delay(10);
        await completed.promise;

        expect(harvester.drainAndReset()).toEqual(expected);

        postBox.dispose();
        await delay(10);
        expect(porter.state).toBe(ClerkState.DISPOSED);
    });
    it("should merge batches items if not have not drained", async () => {
        const completed = promiseWithResolvers<void>();
        const postBox = new InboxWithEvent<string>(5);
        const outgoingBox = new InboxWithEvent<string[]>(5);

        const source = async function* () {
            for (let i = 1; i <= 3; i++) {
                yield `item${i}`;
            }
            await delay(100);
            for (let i = 4; i <= 8; i++) {
                yield `item${i}`;
            }
        };
        const porter = new Porter<string>({
            from: postBox,
            to: outgoingBox,
            timeout: 50,
            maxSize: 5,
        });

        let harvester: Harvester<string[]> | undefined = undefined;

        const feeder = new Feeder({
            source: source(),
            target: postBox,
        });
        const checkStates = () => {
            if (porter.stateDetail.isBusy) return;
            if (!harvester) return;
            if (harvester?.stateDetail.isBusy) return;
            if (!feeder._hasFinished) return;
            completed.resolve();
        };

        porter.setOnProgress((state) => {
            checkStates();
        });

        feeder.setOnProgress((state) => {
            checkStates();
        });

        const expected = [
            ["item1", "item2", "item3", "item4", "item5"],
            ["item6", "item7", "item8"],
        ];

        await delay(1000);
        // await delay(10);
        harvester = new Harvester<string[]>({
            assigned: outgoingBox,
        });
        harvester.setOnProgress((state) => {
            checkStates();
        });
        await completed.promise;

        expect(harvester.drainAndReset()).toEqual(expected);

        postBox.dispose();
        await delay(10);
        expect(porter.state).toBe(ClerkState.DISPOSED);
    });
    it("should handle dispose correctly", async () => {
        const postBox = new Inbox<string>(5);
        const outgoingBox = new Inbox<string[]>(5);

        const porter = new Porter<string>({
            from: postBox,
            to: outgoingBox,
            timeout: 50,
            maxSize: 3,
        });

        postBox.dispose();
        await delay(10);
        await postBox.onDisposed;
        await porter.onDisposed;
        expect(porter.state).toBe(ClerkState.DISPOSED);
    });
});
describe("ClerkGroup", () => {
    it("should hire initial members and process items", async () => {
        const result: string[] = [];
        const completed = promiseWithResolvers<void>();
        const postBox = new Inbox<string>(5);

        const job = async (item: string) => {
            result.push(item);
        };

        const clerkGroup = new ClerkGroup<string, Clerk<string>>({
            assigned: postBox,
            job,
            instantiate(params) {
                return new Clerk(params);
            },
            initialMemberCount: 3,
        });

        clerkGroup._clerks.forEach((clerk) => {
            clerk.setOnProgress((state) => {
                const detail = state.inboxDetail;
                if (detail.size == 0 && detail.processed != 0 && state.state == ClerkState.IDLE) {
                    completed.resolve();
                }
            });
        });

        await yieldMicrotask(); // Allow the loop to run once
        await delay(10);

        const expected = [] as string[];
        for (let i = 0; i < 10; i++) {
            const testStr = "Hello " + i;
            expected.push(testStr);
            await postBox.post(testStr);
        }

        await completed.promise;

        expect(result.sort()).toEqual(expected);

        postBox.dispose();
        await delay(10);
        clerkGroup.dispose();
        clerkGroup._clerks.forEach((clerk) => {
            expect(clerk.state).toBe(ClerkState.DISPOSED);
        });
    });

    it("should adjust member count correctly", async () => {
        const result: string[] = [];
        const completed = promiseWithResolvers<void>();
        const postBox = new Inbox<string>(5);

        const job = async (item: string) => {
            result.push(item);
        };

        const clerkGroup = new ClerkGroup<string, Clerk<string>>({
            assigned: postBox,
            job,
            instantiate(params) {
                return new Clerk(params);
            },
            initialMemberCount: 2,
        });

        clerkGroup.adjustMemberCount(4);
        expect(clerkGroup._clerks.length).toBe(4);

        clerkGroup.adjustMemberCount(1);
        expect(clerkGroup._clerks.length).toBe(1);

        clerkGroup._clerks.forEach((clerk) => {
            clerk.setOnProgress((state) => {
                const detail = state.inboxDetail;
                if (detail.size == 0 && detail.processed != 0 && state.state == ClerkState.IDLE) {
                    completed.resolve();
                }
            });
        });

        await yieldMicrotask(); // Allow the loop to run once
        await delay(10);

        const expected = [] as string[];
        for (let i = 0; i < 10; i++) {
            const testStr = "Hello " + i;
            expected.push(testStr);
            await postBox.post(testStr);
        }

        await completed.promise;

        expect(result.sort()).toEqual(expected);

        postBox.dispose();
        await delay(10);
        clerkGroup.dispose();
        clerkGroup._clerks.forEach((clerk) => {
            expect(clerk.state).toBe(ClerkState.DISPOSED);
        });
    });

    it("should return correct state details", async () => {
        const postBox = new Inbox<string>(5);

        const job = async (item: string) => {
            await delay(10);
        };

        const clerkGroup = new ClerkGroup<string, Clerk<string>>({
            assigned: postBox,
            job,
            instantiate(params) {
                return new Clerk(params);
            },
            initialMemberCount: 2,
        });

        await yieldMicrotask(); // Allow the loop to run once
        await delay(10);

        for (let i = 0; i < 5; i++) {
            await postBox.post("Hello " + i);
        }

        await delay(50);

        const stateDetail = clerkGroup.stateDetail;
        expect(stateDetail.totalFetched).toBe(5);
        expect(stateDetail.totalProcessed).toBe(5);
        expect(stateDetail.isBusy).toBe(false);
        expect(stateDetail.hasStarted).toBe(true);

        postBox.dispose();
        await delay(10);
        clerkGroup.dispose();
        clerkGroup._clerks.forEach((clerk) => {
            expect(clerk.state).toBe(ClerkState.DISPOSED);
        });
    });
});
