import { describe, it, expect, vi } from "vitest";
import { NamedInstance, WeakNamedInstance } from "./NamedInstance.ts";

describe("NamedInstance", () => {
    it("should create and retrieve named instances", () => {
        const factory = vi.fn((name: string) => ({ name }));
        const ni = new NamedInstance("TestType", factory);

        const a = ni.of("foo");
        expect(a).toEqual({ name: "foo" });
        expect(factory).toHaveBeenCalledWith("foo");

        // Returns existing instance
        const b = ni.of("foo");
        expect(b).toBe(a);
        expect(factory).toHaveBeenCalledTimes(1);

        // Creates a new instance for a new name
        const c = ni.of("bar");
        expect(c).toEqual({ name: "bar" });
        expect(factory).toHaveBeenCalledWith("bar");
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should dispose of instances", () => {
        const ni = new NamedInstance("TestType", (name) => ({ name }));
        const a = ni.of("foo");
        expect(ni._instances.has("foo")).toBe(true);

        ni.dispose("foo");
        expect(ni._instances.has("foo")).toBe(false);

        // Disposing a non-existent instance should not throw an error
        ni.dispose("foo");
    });

    it("should throw if the factory throws", () => {
        const error = new Error("fail");
        const factory = vi.fn(() => {
            throw error;
        });
        const ni = new NamedInstance("TestType", factory);

        expect(() => ni.of("failcase")).toThrow(error);
    });
});

describe("WeakNamedInstance", () => {
    it("should create and retrieve weakly referenced named instances", () => {
        const factory = vi.fn((name: string) => ({ name }));
        const ni = new WeakNamedInstance("TestType", factory);

        const a = ni.of("foo");
        expect(a).toEqual({ name: "foo" });
        expect(factory).toHaveBeenCalledWith("foo");

        // Returns existing instance (provided it has not been garbage collected)
        const b = ni.of("foo");
        expect(b).toBe(a);
        expect(factory).toHaveBeenCalledTimes(1);

        // Creates a new instance for a new name
        const c = ni.of("bar");
        expect(c).toEqual({ name: "bar" });
        expect(factory).toHaveBeenCalledWith("bar");
        expect(factory).toHaveBeenCalledTimes(2);
    });

    it("should create a new instance if deref returns undefined", () => {
        // We use an object so that we can simulate garbage collection by overriding deref
        const ni = new WeakNamedInstance("TestType", () => ({ a: "hello", b: "world" }));

        const a = ni.of("foo");

        // Simulate garbage collection by overriding deref to return undefined
        // @ts-ignore
        ni._instances.get("foo").deref = () => {
            console.warn("Simulating garbage collection: deref-ed object returns undefined");
            return undefined;
        };
        const w = ni.of("foo");
        expect(w).not.toBe(a);
    });
});
