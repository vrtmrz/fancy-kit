import { describe, expect, it, vi } from "vitest";
import { createContentApplier } from "./content.ts";

type Target = { path: string };
type Source = { data: string };

const TARGET: Target = { path: "example/data.json" };
const SOURCE: Source = { data: "replacement" };

describe("createContentApplier", () => {
    it("supports synchronous callbacks and returns unchanged without writing", async () => {
        const events: string[] = [];
        const write = vi.fn(() => {
            events.push("write");
        });
        const apply = createContentApplier<Target, Source, string, string>({
            read: (target, source) => {
                events.push(`read:${target.path}:${source.data}`);
                return "same";
            },
            onReadError: () => "fallback",
            decode: (source) => {
                events.push(`decode:${source.data}`);
                return "same";
            },
            isSame: (existing, content, target, source) => {
                events.push(`compare:${existing}:${content}:${target.path}:${source.data}`);
                return existing === content;
            },
            write,
        });

        await expect(apply(TARGET, SOURCE)).resolves.toBe("unchanged");
        expect(events).toEqual([
            `read:${TARGET.path}:${SOURCE.data}`,
            `decode:${SOURCE.data}`,
            `compare:same:same:${TARGET.path}:${SOURCE.data}`,
        ]);
        expect(write).not.toHaveBeenCalled();
    });

    it("uses the read-error fallback and awaits asynchronous callbacks in order", async () => {
        const events: string[] = [];
        const readError = new Error("read failed");
        const apply = createContentApplier<Target, Source, string, string>({
            read: async () => {
                events.push("read");
                throw readError;
            },
            onReadError: async (error, target, source) => {
                events.push(`fallback:${error === readError}:${target.path}:${source.data}`);
                return "empty";
            },
            decode: async (source) => {
                events.push(`decode:${source.data}`);
                return source.data;
            },
            isSame: async (existing, content) => {
                events.push(`compare:${existing}:${content}`);
                return false;
            },
            write: async (target, content, source) => {
                events.push(`write:${target.path}:${content}:${source.data}`);
            },
        });

        await expect(apply(TARGET, SOURCE)).resolves.toBe("changed");
        expect(events).toEqual([
            "read",
            `fallback:true:${TARGET.path}:${SOURCE.data}`,
            `decode:${SOURCE.data}`,
            "compare:empty:replacement",
            `write:${TARGET.path}:${SOURCE.data}:${SOURCE.data}`,
        ]);
    });

    it.each(["decode", "isSame", "write"] as const)("propagates %s failures", async (failureStage) => {
        const error = new Error(`${failureStage} failed`);
        const onReadError = vi.fn(() => "fallback");
        const apply = createContentApplier<Target, Source, string, string>({
            read: () => "existing",
            onReadError,
            decode: () => {
                if (failureStage === "decode") throw error;
                return "replacement";
            },
            isSame: () => {
                if (failureStage === "isSame") throw error;
                return false;
            },
            write: () => {
                if (failureStage === "write") throw error;
            },
        });

        await expect(apply(TARGET, SOURCE)).rejects.toBe(error);
        expect(onReadError).not.toHaveBeenCalled();
    });

    it("propagates a failure from the read-error fallback", async () => {
        const readError = new Error("read failed");
        const fallbackError = new Error("fallback failed");
        const decode = vi.fn(() => "replacement");
        const apply = createContentApplier<Target, Source, string, string>({
            read: () => {
                throw readError;
            },
            onReadError: () => {
                throw fallbackError;
            },
            decode,
            isSame: () => false,
            write: () => undefined,
        });

        await expect(apply(TARGET, SOURCE)).rejects.toBe(fallbackError);
        expect(decode).not.toHaveBeenCalled();
    });
});

describe("content application completion", () => {
    it("waits for the write and ignores its resolved value", async () => {
        let finish!: (value: boolean) => void;
        const written = new Promise<boolean>((resolve) => {
            finish = resolve;
        });
        const write = vi.fn(() => written);
        const apply = createContentApplier({
            read: (_target: string, _source: Uint8Array) => new Uint8Array([0]),
            onReadError: () => new Uint8Array(),
            decode: (source: Uint8Array) => source,
            isSame: () => false,
            write,
        });
        const bytes = new Uint8Array([1, 2]);
        let settled = false;
        const result = apply("target", bytes).then((value) => {
            settled = true;
            return value;
        });
        await vi.waitFor(() => expect(write).toHaveBeenCalledWith("target", bytes, bytes));
        expect(settled).toBe(false);
        finish(false);
        await expect(result).resolves.toBe("changed");
    });

    it.each(["onReadError", "decode", "isSame", "write"] as const)(
        "propagates asynchronous %s rejection and skips later stages",
        async (stage) => {
            const failure = new Error(stage);
            const events: string[] = [];
            const step = async (name: string) => {
                events.push(name);
                if (name === stage) throw failure;
            };
            const apply = createContentApplier({
                read: (_target: string, _source: string) => {
                    throw new Error("read");
                },
                onReadError: async () => {
                    await step("onReadError");
                    return "old";
                },
                decode: async (source: string) => {
                    await step("decode");
                    return source;
                },
                isSame: async () => {
                    await step("isSame");
                    return false;
                },
                write: async () => {
                    await step("write");
                },
            });
            await expect(apply("target", "new")).rejects.toBe(failure);
            const stages = ["onReadError", "decode", "isSame", "write"];
            expect(events).toEqual(stages.slice(0, stages.indexOf(stage) + 1));
        }
    );
});
