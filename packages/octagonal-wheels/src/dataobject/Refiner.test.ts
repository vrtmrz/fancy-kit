import { isObjectDifferent } from "../object.ts";
import { delay } from "../promises.ts";
import { Refiner, RefinerSync } from "./Refiner.ts";
import { expect, test, vi } from "vitest";

test("Refiner computes and caches the result", async () => {
    const evaluation = vi.fn(async (source: number) => source * 2);
    const evalInstance = new Refiner({ initialSource: 10, evaluation });
    const result = await evalInstance.value;
    expect(result).toBe(20);
    expect(evaluation).toHaveBeenCalledTimes(1);
});

test("Refiner does not recompute if the source is the same", async () => {
    const evaluation = vi.fn(async (source: number) => source * 2);
    const evalInstance = new Refiner({ initialSource: 10, evaluation });
    await evalInstance.value;
    evalInstance.update(10);
    await evalInstance.value;
    expect(evaluation).toHaveBeenCalledTimes(1);
});

test("Refiner recomputes if the source is different", async () => {
    type TestData = {
        a: number;
        b: number;
        c: {
            d: string;
            e: string[];
        };
        g?: {
            h: string;
            i: string[];
        };
    };
    const test1: TestData = {
        a: 1,
        b: 2,
        c: {
            d: "test",
            e: ["test1", "test2"],
        },
    };
    const evaluation = (obj: TestData) => JSON.stringify(obj);
    const evalInstance = new Refiner({
        initialSource: test1,
        evaluation,
    });
    const result = await evalInstance.value;
    expect(result).toBe(JSON.stringify(test1));
    const test2: TestData = {
        a: 1,
        b: 2,
        c: {
            d: "test",
            e: ["test1", "test2"],
        },
        g: {
            h: "test",
            i: ["test1", "test2"],
        },
    };
    evalInstance.update(test2);
    const result2 = await evalInstance.value;
    expect(result2).toBe(JSON.stringify(test2));
    expect(isObjectDifferent(test1, test2)).toBe(true);
});

test("Refiner recomputes with conditionally decision", async () => {
    type Environment = {
        source: number;
        timestamp: number;
    };

    async function evaluation(source: Environment, prev?: Environment) {
        return { ...source, source: source.source * 2 };
    }
    const evalInstance = new Refiner({
        initialSource: { source: 10, timestamp: 100 },
        evaluation,
        shouldUpdate: (isDifferent, source, prev) => {
            // if (!isDifferent) {
            //     return false;
            // }
            if (prev && prev.timestamp > source.timestamp) {
                return false;
            }
            return true;
        },
        isDifferent: (a, b) => false,
    });
    const result = await evalInstance.value;
    expect(result).toEqual({ source: 20, timestamp: 100 });

    evalInstance.update({ source: 40, timestamp: 200 });
    const result2 = await evalInstance.value;
    expect(result2).toEqual({ source: 80, timestamp: 200 });

    evalInstance.update({ source: 120, timestamp: 150 });
    const result3 = await evalInstance.value;
    expect(result3).toEqual({ source: 80, timestamp: 200 });
});

test("Refiner handles errors in evaluation", async () => {
    const evaluation = vi.fn(async (source: number) => {
        if (source === 0) throw new Error("Source cannot be zero");
        return source * 2;
    });
    const evalInstance = new Refiner({ initialSource: 10, evaluation });
    await evalInstance.value;
    expect(evaluation).toHaveBeenCalledTimes(1);
    await expect(evalInstance.update(0).value).rejects.toThrow("Source cannot be zero");
});

test("Refiner handles lazy evaluation", async () => {
    const evaluation = vi.fn(async (source: number) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(source * 2);
            }, 20);
        });
    });
    const evalInstance = new Refiner({ evaluation });
    const result = evalInstance.value;
    expect(evaluation).toHaveBeenCalledTimes(0);
    evalInstance.update(10);
    expect(result).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(20);
    expect(evaluation).toHaveBeenCalledTimes(1);
});

test("Refiner longer evaluation", async () => {
    const evaluation = vi.fn(async (source: number) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(source * 2);
            }, 100);
        });
    });
    const evalInstance = new Refiner({ evaluation });
    const result = evalInstance.value;
    expect(evaluation).toHaveBeenCalledTimes(0);
    evalInstance.update(10);
    evalInstance.update(11);
    evalInstance.update(12);
    await delay(150);
    evalInstance.update(13);
    const result2 = evalInstance.update(14).value;

    expect(result).toBeInstanceOf(Promise);
    expect(result2).toBeInstanceOf(Promise);
    await expect(result).resolves.toBe(24);
    await expect(result2).resolves.toBe(28);
    expect(evaluation).toHaveBeenCalledTimes(2);
});

test("Refiner longer evaluation And correctly scheduled", async () => {
    const evaluation = vi.fn(async (source: number) => {
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(source * 2);
            }, 100);
        });
    });
    const evalInstance = new Refiner({ evaluation });
    expect(evaluation).toHaveBeenCalledTimes(0);
    evalInstance.update(10);
    expect(evaluation).toHaveBeenCalledTimes(0);
    evalInstance.update(11);
    expect(evaluation).toHaveBeenCalledTimes(0);
    await delay(10);
    +0;
    expect(evaluation).toHaveBeenCalledTimes(1);
    const result = await evalInstance.update(12).value;
    expect(evaluation).toHaveBeenCalledTimes(2);
    await delay(150);
    evalInstance.update(13);
    expect(evaluation).toHaveBeenCalledTimes(2);
    const result2 = evalInstance.update(14).value;

    expect(result2).toBeInstanceOf(Promise);
    expect(result).toBe(24);
    await expect(result2).resolves.toBe(28);
    expect(evaluation).toHaveBeenCalledTimes(3);
});

test("RefinerSync computes and caches the result", () => {
    const evaluation = vi.fn((source: number) => source * 2);
    const evalInstance = new RefinerSync({ initialSource: 10, evaluation });
    const result = evalInstance.value;
    expect(result).toBe(20);
    expect(evaluation).toHaveBeenCalledTimes(1);
});

test("RefinerSync does not recompute if the source is the same", () => {
    const evaluation = vi.fn((source: number) => source * 2);
    const evalInstance = new RefinerSync({ initialSource: 10, evaluation });
    evalInstance.value;
    evalInstance.update(10);
    expect(evaluation).toHaveBeenCalledTimes(1);
});

test("RefinerSync recomputes if the source is different", () => {
    const evaluation = vi.fn((source: number) => source * 2);
    const evalInstance = new RefinerSync({ initialSource: 10, evaluation });
    evalInstance.value;
    evalInstance.update(20);
    expect(evaluation).toHaveBeenCalledTimes(2);
    expect(evalInstance.value).toBe(40);
});

test("RefinerSync handles errors in evaluation", () => {
    const evaluation = vi.fn((source: number) => {
        if (source === 0) throw new Error("Source cannot be zero");
        return source * 2;
    });
    const evalSyncInstance = new RefinerSync({ initialSource: 10, evaluation });
    expect(evalSyncInstance.value).toBe(20);
    expect(() => evalSyncInstance.update(0).value).toThrow("Source cannot be zero");
    expect(evalSyncInstance.update(2).value).toEqual(4);
});

test("RefinerSync recomputes with conditionally decision", () => {
    type Environment = {
        source: number;
        timestamp: number;
    };

    function evaluation(source: Environment, prev?: Environment) {
        return { ...source, source: source.source * 2 };
    }
    const evalInstance = new RefinerSync({
        initialSource: { source: 10, timestamp: 100 },
        evaluation,
        shouldUpdate: (isDifferent, source, prev) => {
            if (prev && prev.timestamp > source.timestamp) {
                return false;
            }
            return true;
        },
        isDifferent: (a, b) => false,
    });
    const result = evalInstance.value;
    expect(result).toEqual({ source: 20, timestamp: 100 });

    evalInstance.update({ source: 40, timestamp: 200 });
    const result2 = evalInstance.value;
    expect(result2).toEqual({ source: 80, timestamp: 200 });

    evalInstance.update({ source: 120, timestamp: 150 });
    const result3 = evalInstance.value;
    expect(result3).toEqual({ source: 80, timestamp: 200 });
});

test("RefinerSync handles errors in evaluation", () => {
    const evaluation = vi.fn((source: number) => {
        if (source === 0) throw new Error("Source cannot be zero");
        return source * 2;
    });
    const evalSyncInstance = new RefinerSync({ initialSource: 10, evaluation });
    expect(evalSyncInstance.value).toBe(20);
    expect(() => evalSyncInstance.update(0).value).toThrow("Source cannot be zero");

    // console.log(evalSyncInstance.update(2).value?.toString());
    expect(evalSyncInstance.update(2).value).toEqual(4);
});

test("Refiner sync Lazy evaluation", () => {
    const evaluation = vi.fn((source: number) => {
        return source * 2;
    });
    const evalInstance = new RefinerSync({ evaluation });
    const result = evalInstance.value;
    expect(evaluation).toHaveBeenCalledTimes(0);
    expect(result).toBeUndefined();
    expect(evalInstance.update(10).value).toBe(20);
    expect(evaluation).toHaveBeenCalledTimes(1);
    expect(evalInstance.update(20).value).toBe(40);
    expect(evaluation).toHaveBeenCalledTimes(2);
    expect(evalInstance.update(20).value).toBe(40);
    expect(evaluation).toHaveBeenCalledTimes(2);
});
