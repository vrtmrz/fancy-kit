import { describe, expect, expectTypeOf, it, vi } from "vitest";
import { scoped, withScope, type Scope, type ScopedPipeline, type ScopedStep } from "./scope.ts";

function gate<T = void>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

describe("withScope", () => {
    it("preserves borrowed values and returned identity without automatically disposing either", async () => {
        const input = { count: 0, dispose: vi.fn() };
        const output = { dispose: vi.fn() };
        const returned = await withScope(input, (ctx) => {
            expect(ctx.value).toBe(input);
            ctx.value.count++;
            return output;
        });
        expect(returned).toBe(output);
        expect(input.count).toBe(1);
        expect(input.dispose).not.toHaveBeenCalled();
        expect(output.dispose).not.toHaveBeenCalled();
        expectTypeOf(returned).toEqualTypeOf<typeof output>();
    });

    it("rejects a non-function cleanup at registration and still releases earlier resources", async () => {
        const release = vi.fn();
        const afterRegistration = vi.fn();
        const invalidCleanup = null as unknown as Parameters<Scope<undefined>["defer"]>[0];

        const failure = await withScope(undefined, (ctx) => {
            ctx.defer(release);
            ctx.defer(invalidCleanup);
            afterRegistration();
        }).catch((error: unknown) => error);

        expect(failure).toBeInstanceOf(TypeError);
        expect(afterRegistration).not.toHaveBeenCalled();
        expect(release).toHaveBeenCalledOnce();
    });

    it("cleans up after an early return without requiring a pipeline", async () => {
        const close = vi.fn();
        await expect(
            withScope(undefined, (ctx) => {
                ctx.defer(close);
                return;
            })
        ).resolves.toBeUndefined();
        expect(close).toHaveBeenCalledOnce();
    });

    it("awaits a thenable body and every cleanup in reverse order before returning", async () => {
        const bodyStarted = gate();
        const body = gate<number>();
        const cleanupStarted = gate();
        const cleanup = gate();
        const trace: string[] = [];
        const thenable: PromiseLike<number> = {
            then(resolve, reject) {
                bodyStarted.resolve();
                return body.promise.then(resolve, reject);
            },
        };
        const pending = withScope("input", (ctx) => {
            ctx.defer(() => {
                trace.push("first");
            });
            ctx.defer(async () => {
                trace.push("second:start");
                cleanupStarted.resolve();
                await cleanup.promise;
                trace.push("second:end");
            });
            return thenable;
        });
        let settled = false;
        const observed = pending.then((value) => {
            settled = true;
            return value;
        });
        await bodyStarted.promise;
        expect(trace).toEqual([]);
        body.resolve(17);
        await cleanupStarted.promise;
        expect(trace).toEqual(["second:start"]);
        expect(settled).toBe(false);
        cleanup.resolve();
        await expect(observed).resolves.toBe(17);
        expect(trace).toEqual(["second:start", "second:end", "first"]);
    });

    it("preserves synchronous and asynchronous failure values, including undefined and null", async () => {
        for (const failure of [new Error("body"), undefined, null, "failure"]) {
            const cleanup = vi.fn();
            await expect(
                withScope(0, (ctx): never => {
                    ctx.defer(cleanup);
                    throw failure;
                })
            ).rejects.toBe(failure);
            expect(cleanup).toHaveBeenCalledOnce();

            const asyncCleanup = vi.fn();
            await expect(
                withScope(0, async (ctx) => {
                    ctx.defer(asyncCleanup);
                    await Promise.resolve();
                    throw failure;
                })
            ).rejects.toBe(failure);
            expect(asyncCleanup).toHaveBeenCalledOnce();
        }
    });

    it("preserves the identity of a single cleanup failure", async () => {
        const failure = new Error("close");
        await expect(
            withScope(0, (ctx) => {
                ctx.defer(() => {
                    throw failure;
                });
                return "value";
            })
        ).rejects.toBe(failure);
    });

    it("runs remaining cleanup after failures and groups errors in body then cleanup order", async () => {
        const body = new Error("body");
        const laterCleanup = new Error("later registration");
        const trace: string[] = [];
        const pending = withScope(0, (ctx) => {
            ctx.defer(() => {
                trace.push("first");
                throw undefined;
            });
            ctx.defer(async () => {
                trace.push("second");
                throw laterCleanup;
            });
            ctx.defer(() => {
                trace.push("third");
            });
            throw body;
        });
        const error = await pending.catch((error: unknown) => error);
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toEqual([body, laterCleanup, undefined]);
        expect(trace).toEqual(["third", "second", "first"]);
    });

    it("groups multiple cleanup failures even when the body succeeds", async () => {
        const first = new Error("first");
        const second = new Error("second");
        const error = await withScope(0, (ctx) => {
            ctx.defer(() => {
                throw first;
            });
            ctx.defer(() => {
                throw second;
            });
            return "body result";
        }).catch((error: unknown) => error);
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toEqual([second, first]);
    });

    it("runs each registration, including repeated registration of the same function", async () => {
        const cleanup = vi.fn();
        await withScope(0, (ctx) => {
            ctx.defer(cleanup);
            ctx.defer(cleanup);
        });
        expect(cleanup).toHaveBeenCalledTimes(2);
    });

    it("rejects new cleanup while closing and after closure without skipping existing cleanup", async () => {
        const closing = gate();
        const release = gate();
        const previousCleanup = vi.fn();
        const late = vi.fn();
        let retained!: Scope<number>;
        const pending = withScope(0, (ctx) => {
            retained = ctx;
            ctx.defer(previousCleanup);
            ctx.defer(async () => {
                closing.resolve();
                await release.promise;
                ctx.defer(late);
            });
        });
        const rejected = expect(pending).rejects.toThrow("closing or closed");
        await closing.promise;
        expect(() => retained.defer(late)).toThrow("closing or closed");
        release.resolve();
        await rejected;
        expect(previousCleanup).toHaveBeenCalledOnce();
        expect(late).not.toHaveBeenCalled();
        expect(() => retained.defer(late)).toThrow("closing or closed");
    });

    it("allows cleanup to own a separate temporary scope", async () => {
        const trace: string[] = [];
        await withScope(0, (ctx) => {
            ctx.defer(async () => {
                await withScope(1, (child) => {
                    trace.push("child:body");
                    child.defer(() => {
                        trace.push("child:cleanup");
                    });
                });
                trace.push("outer:cleanup:done");
            });
        });
        expect(trace).toEqual(["child:body", "child:cleanup", "outer:cleanup:done"]);
    });

    it("keeps overlapping scopes independent even when they share the same value", async () => {
        const shared = { count: 0 };
        const firstGate = gate();
        const secondGate = gate();
        const firstCleanup = vi.fn();
        const secondCleanup = vi.fn();
        const first = withScope(shared, async (ctx) => {
            ctx.defer(firstCleanup);
            ctx.value.count++;
            await firstGate.promise;
        });
        const second = withScope(shared, async (ctx) => {
            ctx.defer(secondCleanup);
            ctx.value.count++;
            await secondGate.promise;
        });
        expect(shared.count).toBe(2);
        firstGate.resolve();
        await first;
        expect(firstCleanup).toHaveBeenCalledOnce();
        expect(secondCleanup).not.toHaveBeenCalled();
        secondGate.resolve();
        await second;
        expect(secondCleanup).toHaveBeenCalledOnce();
    });
});

describe("scoped", () => {
    it("declares lazy reusable pipelines without changing earlier declarations", async () => {
        const step = vi.fn((ctx: Scope<number>) => ctx.value + 1);
        const identity = scoped<number>();
        const increment = identity.pipe(step);
        const doubled = increment.pipe((ctx) => ctx.value * 2);
        expectTypeOf(identity).toEqualTypeOf<ScopedPipeline<number, number>>();
        expectTypeOf(increment).toEqualTypeOf<ScopedPipeline<number, number>>();
        expectTypeOf(doubled).toEqualTypeOf<ScopedPipeline<number, number>>();
        expect(step).not.toHaveBeenCalled();
        expect("then" in increment).toBe(false);
        expect(await withScope(3, identity)).toBe(3);
        expect(await withScope(3, doubled)).toBe(8);
        expect(await withScope(3, increment)).toBe(4);
        expect(await withScope(10, increment)).toBe(11);
        expect(step).toHaveBeenCalledTimes(3);
    });

    it("keeps earlier value views stable and defers shared cleanup until the entire pipeline ends", async () => {
        const trace: string[] = [];
        const operation = scoped<string>()
            .pipe((ctx) => {
                ctx.defer(() => {
                    trace.push(`first:${ctx.value}`);
                });
                trace.push("first:body");
                return { value: `${ctx.value}:next` };
            })
            .pipe((ctx) => {
                expect(trace).toEqual(["first:body"]);
                ctx.defer(() => {
                    trace.push(`second:${ctx.value.value}`);
                });
                trace.push("second:body");
                return ctx.value.value.length;
            });
        const result = await withScope("input", operation);
        expectTypeOf(result).toEqualTypeOf<number>();
        expect(result).toBe(10);
        expect(trace).toEqual(["first:body", "second:body", "second:input:next", "first:input"]);
    });

    it("passes undefined to the next step and does not merge old fields into a new value", async () => {
        const operation = scoped<{ old: string }>()
            .pipe(() => undefined)
            .pipe((ctx) => {
                expect(ctx.value).toBeUndefined();
                return { next: 1 };
            })
            .pipe((ctx) => {
                expect(ctx.value).toEqual({ next: 1 });
                return ctx.value;
            });
        expect(await withScope({ old: "original" }, operation)).toEqual({ next: 1 });
    });

    it("can borrow a scope and compose a named pipeline without closing the owner", async () => {
        const cleanup = vi.fn();
        const named: ScopedStep<number, string> = (ctx) => {
            ctx.defer(cleanup);
            return String(ctx.value);
        };
        const nested = scoped<number>().pipe(named);
        const operation = scoped<number>()
            .pipe(nested)
            .pipe((ctx) => ctx.value.length);
        await withScope(123, async (ctx) => {
            expect(await operation(ctx)).toBe(3);
            expect(cleanup).not.toHaveBeenCalled();
        });
        expect(cleanup).toHaveBeenCalledOnce();
    });

    it("waits for child cleanup before the next stage and leaves parent cleanup pending", async () => {
        const closing = gate();
        const release = gate();
        const parentCleanup = vi.fn();
        const next = vi.fn((ctx: Scope<number>) => ctx.value * 2);
        const operation = scoped<number>()
            .pipe((ctx) => {
                ctx.defer(parentCleanup);
                return ctx.value;
            })
            .pipeScoped((ctx) => {
                ctx.defer(async () => {
                    closing.resolve();
                    await release.promise;
                });
                return ctx.value + 1;
            })
            .pipe(next);
        const pending = withScope(2, operation);
        await closing.promise;
        expect(next).not.toHaveBeenCalled();
        expect(parentCleanup).not.toHaveBeenCalled();
        release.resolve();
        await expect(pending).resolves.toBe(6);
        expect(next).toHaveBeenCalledOnce();
        expect(parentCleanup).toHaveBeenCalledOnce();
    });

    it("skips later stages after a failed child cleanup and still closes the parent", async () => {
        const childFailure = new Error("child close");
        const parentCleanup = vi.fn();
        const next = vi.fn();
        const operation = scoped<number>()
            .pipe((ctx) => {
                ctx.defer(parentCleanup);
                return ctx.value;
            })
            .pipeScoped((ctx) => {
                ctx.defer(() => {
                    throw childFailure;
                });
                return "content";
            })
            .pipe(next);
        await expect(withScope(0, operation)).rejects.toBe(childFailure);
        expect(next).not.toHaveBeenCalled();
        expect(parentCleanup).toHaveBeenCalledOnce();
    });

    it("preserves borrowed capabilities and separates child cleanup registration", async () => {
        const cancelled = () => false;
        const token = Symbol("capability");
        const trace: string[] = [];
        const operation = scoped<number, { isCancelled(): boolean; readonly token: symbol }>()
            .pipeScoped((ctx) => {
                expect(ctx.isCancelled).toBe(cancelled);
                expect(ctx.token).toBe(token);
                ctx.defer(() => {
                    trace.push("child");
                });
                return "result";
            })
            .pipe((ctx) => {
                expect(trace).toEqual(["child"]);
                expect(ctx.isCancelled()).toBe(false);
                expect(ctx.token).toBe(token);
                return ctx.value;
            });
        await withScope(0, (ctx) => {
            ctx.defer(() => {
                trace.push("parent");
            });
            return operation(Object.assign(Object.create(ctx), { isCancelled: cancelled, token }));
        });
        expect(trace).toEqual(["child", "parent"]);
    });
});
