import { describe, it, expect, vi } from "vitest";
import { Computed } from "./Computed";

describe("Computed", () => {
    it("should compute value on first update", async () => {
        const evaluation = vi.fn((a: number, b: number) => a + b);
        const computed = new Computed({ evaluation });

        const updated = await computed.updateValue(1, 2);

        expect(updated).toBe(true);
        expect(evaluation).toHaveBeenCalledWith(1, 2);
        expect(computed.value).toBe(3);
    });

    it("should not re-compute if args are the same", async () => {
        const evaluation = vi.fn((a: number, b: number) => a + b);
        const computed = new Computed({ evaluation });

        await computed.updateValue(1, 2);
        expect(evaluation).toHaveBeenCalledTimes(1);

        const updated = await computed.updateValue(1, 2);
        expect(updated).toBe(false);
        expect(evaluation).toHaveBeenCalledTimes(1);
        expect(computed.value).toBe(3);
    });

    it("should re-compute if args are different", async () => {
        const evaluation = vi.fn((a: number, b: number) => a + b);
        const computed = new Computed({ evaluation });

        await computed.updateValue(1, 2);
        expect(computed.value).toBe(3);

        const updated = await computed.updateValue(2, 3);
        expect(updated).toBe(true);
        expect(evaluation).toHaveBeenCalledWith(2, 3);
        expect(evaluation).toHaveBeenCalledTimes(2);
        expect(computed.value).toBe(5);
    });

    it("should handle async evaluation", async () => {
        const evaluation = vi.fn(async (a: number) => {
            await new Promise((resolve) => setTimeout(resolve, 10));
            return a * 2;
        });
        const computed = new Computed({ evaluation });

        await computed.updateValue(5);
        expect(computed.value).toBe(10);
    });

    it("should use requiresUpdate to force re-computation", async () => {
        const evaluation = vi.fn((a: number) => a * 2);
        const requiresUpdate = vi.fn(() => true);
        const computed = new Computed({ evaluation, requiresUpdate });

        await computed.updateValue(5);
        expect(evaluation).toHaveBeenCalledTimes(1);

        await computed.updateValue(5);
        expect(requiresUpdate).toHaveBeenCalled();
        expect(evaluation).toHaveBeenCalledTimes(2);
        expect(computed.value).toBe(10);
    });

    it("should not re-compute if requiresUpdate returns false and args are same", async () => {
        const evaluation = vi.fn((a: number) => a * 2);
        const requiresUpdate = vi.fn(() => false);
        const computed = new Computed({ evaluation, requiresUpdate });

        await computed.updateValue(5);
        expect(evaluation).toHaveBeenCalledTimes(1);

        const updated = await computed.updateValue(5);
        expect(updated).toBe(false);
        expect(requiresUpdate).toHaveBeenCalled();
        expect(evaluation).toHaveBeenCalledTimes(1);
    });

    it("should use custom isEqual function", async () => {
        const evaluation = vi.fn((obj: { val: number }) => obj.val);
        const isEqual = vi.fn((a, b) => a[0].val === b[0].val);
        const computed = new Computed({ evaluation, isEqual });

        await computed.updateValue({ val: 1 });
        expect(evaluation).toHaveBeenCalledTimes(1);

        // Different object instance, but same `val` property
        const updated = await computed.updateValue({ val: 1 });
        expect(updated).toBe(false);
        expect(isEqual).toHaveBeenCalled();
        expect(evaluation).toHaveBeenCalledTimes(1);
    });

    it("should handle evaluation errors", async () => {
        const error = new Error("Evaluation failed");
        const evaluation = vi.fn((_: any) => {
            throw error;
        });
        const computed = new Computed({ evaluation });

        const updated = await computed.updateValue(1);
        expect(updated).toBe(true);
        expect(() => computed.value).toThrow(error);
    });

    it("should handle evaluation errors (thrown as string)", async () => {
        const evaluation = vi.fn((_: any) => {
            throw "Evaluation failed as string";
        });
        const computed = new Computed({ evaluation });

        const updated = await computed.updateValue(1);
        expect(updated).toBe(true);
        try {
            computed.value;
        } catch (e) {
            expect(e).toBeInstanceOf(Error);
            expect((e as Error).message).toBe("Evaluation failed as string");
        }
    });

    it("should not re-evaluate on same args after an error", async () => {
        const error = new Error("Evaluation failed");
        const evaluation = vi.fn((_: any) => {
            throw error;
        });
        const computed = new Computed({ evaluation });

        await computed.updateValue(1);
        expect(evaluation).toHaveBeenCalledTimes(1);
        expect(() => computed.value).toThrow(error);

        const updated = await computed.updateValue(1);
        expect(updated).toBe(false);
        expect(evaluation).toHaveBeenCalledTimes(1);
        expect(() => computed.value).toThrow(error);
    });

    it("should re-evaluate on different args after an error", async () => {
        const error = new Error("Evaluation failed");
        let callCount = 0;
        const evaluation = vi.fn((_: any) => {
            callCount++;
            if (callCount === 1) {
                throw error;
            }
            return "success";
        });
        const computed = new Computed({ evaluation });

        await computed.updateValue(1);
        expect(evaluation).toHaveBeenCalledTimes(1);
        expect(() => computed.value).toThrow(error);

        const updated = await computed.updateValue(2);
        expect(updated).toBe(true);
        expect(evaluation).toHaveBeenCalledTimes(2);
        expect(computed.value).toBe("success");
    });

    it("should reject updateValue if requiresUpdate throws", async () => {
        const error = new Error("requiresUpdate failed");
        const computed = new Computed({
            evaluation: (_: any) => 1,
            requiresUpdate: () => {
                throw error;
            },
        });

        await expect(computed.updateValue(1)).rejects.toThrow(error);
    });

    it("should reset and force re-evaluation", async () => {
        const evaluation = vi.fn((a: number) => a * 2);
        const computed = new Computed({ evaluation });

        await computed.updateValue(5);
        expect(evaluation).toHaveBeenCalledTimes(1);
        expect(computed.value).toBe(10);

        computed.reset();
        expect(computed.value).toBe(null);

        const updated = await computed.updateValue(5);
        expect(updated).toBe(true);
        expect(evaluation).toHaveBeenCalledTimes(2);
        expect(computed.value).toBe(10);
    });

    it("should return null value if never evaluated", () => {
        const computed = new Computed({ evaluation: () => 1 });
        expect(computed.value).toBe(null);
    });

    it("update() should update value and return the instance", async () => {
        const evaluation = vi.fn((a: number) => a * 10);
        const computed = new Computed({ evaluation });

        const resolvedComputed = await computed.update(7);
        expect(evaluation).toHaveBeenCalledWith(7);
        expect(resolvedComputed).toBe(computed);
        expect(resolvedComputed.value).toBe(70);
    });

    it("should handle concurrent updates correctly", async () => {
        let evalCount = 0;
        const evaluation = vi.fn(async (val: number) => {
            await new Promise((r) => setTimeout(r, 20));
            evalCount++;
            return val;
        });
        const computed = new Computed({ evaluation });

        const p1 = computed.updateValue(1);
        const p2 = computed.updateValue(2);

        const [res1, res2] = await Promise.all([p1, p2]);

        // The first call starts, but before it finishes, the second one is queued.
        // The second one should see the args are different and run.
        // Depending on timing, either 1 or 2 evaluations might happen.
        // With the current implementation, the second update waits for the first to finish.
        // Then it runs its own check.
        expect(res1).toBe(true); // first update happened
        expect(res2).toBe(true); // second update happened
        expect(evalCount).toBe(2);
        expect(computed.value).toBe(2);
    });
    it("should handle concurrent updates correctly with duplicate args", async () => {
        let evalCount = 0;
        const evaluation = vi.fn(async (val: number) => {
            await new Promise((r) => setTimeout(r, 20));
            evalCount++;
            return val;
        });
        const computed = new Computed({ evaluation });

        const p1 = computed.updateValue(1);
        const p2 = computed.updateValue(1);
        const p3 = computed.updateValue(2);
        const p4 = computed.updateValue(2);
        const p5 = computed.updateValue(3);

        const [res1, res2, res3, res4, res5] = await Promise.all([p1, p2, p3, p4, p5]);

        // The first call starts, but before it finishes, the second one is queued.
        // The second one should see the args are different and run.
        // Depending on timing, either 1 or 2 evaluations might happen.
        // With the current implementation, the second update waits for the first to finish.
        // Then it runs its own check.
        expect(res1).toBe(true); // first update happened
        expect(res2).toBe(false); // second update skipped
        expect(res3).toBe(true); // third update happened
        expect(res4).toBe(false); // fourth update skipped
        expect(res5).toBe(true); // fifth update happened
        expect(evalCount).toBe(3);
        expect(evaluation).toHaveBeenCalledTimes(3);
        expect(computed.value).toBe(3);
    });
});
