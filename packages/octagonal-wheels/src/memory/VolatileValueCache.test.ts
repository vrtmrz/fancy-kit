import { describe, it, expect, beforeEach, vi } from "vitest";
import { VolatileValueCache } from "./VolatileValueCache.ts";

// Check if the global gc function exists.
// Throws an error if run without the --expose-gc flag.
if (!globalThis.gc) {
    throw new Error('Garbage Collection is not exposed. Run vitest with "--expose-gc" flag.');
}

/**
 * Triggers GC and waits for the FinalizationRegistry callback to execute.
 * Since GC behaviour is asynchronous and non-deterministic, a short wait is required.
 */
async function triggerGCAndWait() {
    // Call GC several times to increase the likelihood of collection.
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc?.();
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc?.();
}

describe("VolatileValueCache", () => {
    let cache: VolatileValueCache<string | number, any>;

    beforeEach(() => {
        cache = new VolatileValueCache<string | number, any>();
    });

    describe("Basic Operations", () => {
        it("should set and get a value correctly", () => {
            const value = { data: "test-data" };
            cache.set("key1", value);
            expect(cache.get("key1")).toBe(value);
            expect(cache.get("key1")).toEqual({ data: "test-data" });
        });

        it("should return true from has() for an existing key", () => {
            cache.set("key1", { data: "test" });
            expect(cache.has("key1")).toBe(true);
        });

        it("should return undefined from get() for a non-existent key", () => {
            expect(cache.get("non-existent-key")).toBe(undefined);
        });

        it("should return false from has() for a non-existent key", () => {
            expect(cache.has("non-existent-key")).toBe(false);
        });

        it("should overwrite a value if set is called with the same key", () => {
            const value1 = "first-value";
            const value2 = "second-value";
            cache.set("key1", value1);
            expect(cache.get("key1")).toBe(value1);
            cache.set("key1", value2);
            expect(cache.get("key1")).toBe(value2);
        });

        it("should delete a key-value pair", () => {
            cache.set("key1", "value1");
            expect(cache.has("key1")).toBe(true);
            const result = cache.delete("key1");
            expect(result).toBe(true);
            expect(cache.has("key1")).toBe(false);
            expect(cache.get("key1")).toBe(undefined);
        });

        it("should return false when deleting a non-existent key", () => {
            expect(cache.delete("non-existent-key")).toBe(false);
        });

        it("should handle both string and number keys", () => {
            cache.set("1", "string one");
            cache.set(1, "number one");
            expect(cache.has("1")).toBe(true);
            expect(cache.has(1)).toBe(true);
            expect(cache.get("1")).toBe("string one");
            expect(cache.get(1)).toBe("number one");
        });

        it("should handle null and undefined as values", () => {
            cache.set("key-null", null);
            cache.set("key-undefined", undefined);
            expect(cache.has("key-null")).toBe(true);
            expect(cache.has("key-undefined")).toBe(true);
            expect(cache.get("key-null")).toBe(null);
            expect(cache.get("key-undefined")).toBe(undefined);
        });
    });

    describe("Weak Reference and Garbage Collection Behaviour", () => {
        it("should clear an entry when its value is garbage collected", async () => {
            // Create a value within an immediately invoked function scope and set it in the cache.
            // After leaving the scope, the only reference to `value` is the WeakRef in the cache.
            (() => {
                const value = { message: "I will be collected" };
                cache.set("gc-key", value);
            })();

            // At this point, GC has not yet run, so it should still exist in the cache.
            expect(cache.has("gc-key")).toBe(true);
            expect(cache.get("gc-key")).toEqual({ message: "I will be collected" });
            await new Promise((resolve) => setTimeout(resolve, 10));
            // Trigger GC and wait for the FinalizationRegistry cleanup.
            await triggerGCAndWait();

            // After the FinalizationRegistry callback has executed,
            // confirm with vitest's waitFor that the entry has been removed from the cache.
            await vi.waitFor(() => {
                expect(cache.has("gc-key")).toBe(false);
            });

            // Confirm the final state.
            expect(cache.get("gc-key")).toBe(undefined);

            // Also confirm it has been removed from the internal key registry (accessing private property for testing).
            // @ts-ignore: Accessing private property for testing purposes
            expect(cache._keyRegistry.has("gc-key")).toBe(false);
        });

        it("should NOT clear an entry if its value is still strongly referenced", async () => {
            // Value with a strong reference
            const strongRefValue = { message: "I will NOT be collected" };
            const _pin = cache.set("strong-ref-key", strongRefValue);

            // Value referenced only within this scope
            (() => {
                const weakRefValue = { message: "I will be collected" };
                const _pin = cache.set("weak-ref-key", weakRefValue);
            })();

            // Run GC
            await triggerGCAndWait();

            // Confirm that the entry with a strong reference is not removed
            expect(cache.has("strong-ref-key")).toBe(true);
            expect(cache.get("strong-ref-key")).toBe(strongRefValue);

            // Confirm that the entry without a strong reference is removed
            await vi.waitFor(() => {
                expect(cache.has("weak-ref-key")).toBe(false);
            });
            expect(cache.get("weak-ref-key")).toBe(undefined);
        });

        it("should clean up correctly when a value is overwritten and the old value is GCed", async () => {
            let oldVal: object | null = { old: true };
            const pin1 = cache.set("overwrite-key", oldVal);
            expect(cache.has("overwrite-key")).toBe(true);

            // Overwrite the value
            const newVal = { new: true };
            const pin2 = cache.set("overwrite-key", newVal);

            // Remove the reference to the old value
            oldVal = null;

            await triggerGCAndWait();

            // Confirm that the new value remains in the cache after GC
            expect(cache.has("overwrite-key")).toBe(true);
            expect(cache.get("overwrite-key")).toBe(newVal);
        });
        it("should keep value during pinned", async () => {
            const value = { message: "I am pinned" };
            const pin = cache.set("pin-key", value);

            await triggerGCAndWait();
            // Confirm the value is accessible while pinned
            expect(pin.value).toBe(value);
            expect(cache.has("pin-key")).toBe(true);
            await triggerGCAndWait();
            // Release the pin
            pin.release();
            await triggerGCAndWait();

            // Confirm the value is no longer accessible after unpinning
            expect(pin.value).toBeUndefined();
            expect(cache.has("pin-key")).toBe(false);
        });
        it("should handle pinned values and deletion", async () => {
            const value = { message: "I am pinned" };
            const pin = cache.set("pin-key", value);

            await triggerGCAndWait();
            // Confirm the value is accessible while pinned
            expect(pin.value).toBe(value);
            expect(cache.has("pin-key")).toBe(true);
            expect(cache.get("pin-key")).toBe(value);
            await triggerGCAndWait();
            // Delete the key
            const deleteResult = cache.delete("pin-key");

            expect(deleteResult).toBe(true);
            // Pinned value is still accessible because it has strong reference.
            expect(pin.value).toBe(value);
            // But the cache should reflect the deletion
            expect(cache.get("pin-key")).toBeUndefined();
            // Release the pin
            pin.release();
            await triggerGCAndWait();

            // Confirm the value is no longer accessible after deletion
            expect(pin.value).toBeUndefined();
            expect(cache.has("pin-key")).toBe(false);
        });
    });
});
