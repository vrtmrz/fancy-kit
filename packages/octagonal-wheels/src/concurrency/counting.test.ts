import { describe, expect, it, vi } from "vitest";
import { withCounting } from "./counting.ts";

describe("withCounting", () => {
    it("counts independent overlapping operations until each settles", async () => {
        const counter = { value: 4 };
        let finishFirst!: (value: number) => void;
        let finishSecond!: (value: number) => void;
        const first = withCounting(
            counter,
            () =>
                new Promise<number>((resolve) => {
                    finishFirst = resolve;
                })
        );
        const second = withCounting(
            counter,
            () =>
                new Promise<number>((resolve) => {
                    finishSecond = resolve;
                })
        );
        expect(counter.value).toBe(6);
        finishSecond(22);
        await expect(second).resolves.toBe(22);
        expect(counter.value).toBe(5);
        finishFirst(11);
        await expect(first).resolves.toBe(11);
        expect(counter.value).toBe(4);
    });

    it("returns synchronous values and assimilates thenables before decrementing", async () => {
        const counter = { value: 0 };
        await expect(withCounting(counter, () => 42)).resolves.toBe(42);
        const result = withCounting(
            counter,
            () =>
                ({
                    then(resolve: (value: string) => void) {
                        expect(counter.value).toBe(1);
                        resolve("done");
                    },
                }) as PromiseLike<string>
        );
        await expect(result).resolves.toBe("done");
        expect(counter.value).toBe(0);
    });

    it.each([false, true])("restores the count after a failure (asynchronous: %s)", async (asynchronous) => {
        const counter = { value: 2 };
        const error = new Error("operation failed");
        await expect(
            withCounting(counter, () => {
                expect(counter.value).toBe(3);
                if (asynchronous) return Promise.reject(error);
                throw error;
            })
        ).rejects.toBe(error);
        expect(counter.value).toBe(2);
    });

    it("does not invoke the operation if incrementing fails", async () => {
        const error = new Error("increment failed");
        const operation = vi.fn();
        await expect(
            withCounting(
                {
                    get value() {
                        return 0;
                    },
                    set value(_value) {
                        throw error;
                    },
                },
                operation
            )
        ).rejects.toBe(error);
        expect(operation).not.toHaveBeenCalled();
    });

    it("retains finally precedence if decrementing fails", async () => {
        let value = 0;
        const error = new Error("decrement failed");
        const counter = {
            get value() {
                return value;
            },
            set value(next) {
                if (next === 0) throw error;
                value = next;
            },
        };
        await expect(
            withCounting(counter, () => {
                throw new Error("operation failed");
            })
        ).rejects.toBe(error);
    });
});
