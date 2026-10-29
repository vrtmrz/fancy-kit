import { scoped, withScope, type Scope, type ScopedStep } from "./scope.js";
import { withCancellation, type Cancellation } from "./cancellation.js";
import { forEachInScope, mapInScope, type IterationMapResult, type IterationResult } from "./iteration.js";
import { acquirePermit, type SemaphoreAcquisition } from "./semaphore.js";

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;

interface Settings {
    readonly path: string;
}
interface Reader {
    read(): Promise<string>;
    close(): Promise<void>;
}
interface Report {
    readonly words: number;
}
declare const settings: Settings;
declare const signal: AbortSignal;
declare const semaphore: SemaphoreAcquisition;
declare function openReader(path: string): Promise<Reader>;
declare function report(contents: string): Report;

const open: ScopedStep<Settings, { settings: Settings; reader: Reader }> = async (ctx) => {
    const reader = await openReader(ctx.value.path);
    ctx.defer(() => reader.close());
    return { settings: ctx.value, reader };
};

const inspect = scoped<Settings>()
    .pipe(acquirePermit(semaphore))
    .pipe(open)
    .pipe(async (ctx) => report(await ctx.value.reader.read()));
const inspected = withScope(settings, inspect);
type FinalResult = Assert<Equal<typeof inspected, Promise<Report>>>;

const separatelyClosed = scoped<Settings>()
    .pipeScoped(async (ctx) => {
        const reader = await openReader(ctx.value.path);
        ctx.defer(() => reader.close());
        return await reader.read();
    })
    .pipe((ctx) => report(ctx.value));
const separatelyClosedResult = withScope(settings, separatelyClosed);
type ChildScopeResult = Assert<Equal<typeof separatelyClosedResult, Promise<Report>>>;

const noPipe = withScope(settings, (ctx) => ctx.value.path.length);
type NoPipeResult = Assert<Equal<typeof noPipe, Promise<number>>>;

const returnsNothing = withScope(settings, (ctx) => {
    if (ctx.value.path.length === 0) return;
    ctx.defer(() => undefined);
});
type VoidResult = Assert<Equal<typeof returnsNothing, Promise<void>>>;

const permitsUndefined = scoped<Settings>()
    .pipe((ctx) => (ctx.value.path ? ctx.value.path : undefined))
    .pipe((ctx) => (ctx.value === undefined ? 0 : ctx.value.length));
const permitsUndefinedResult = withScope(settings, permitsUndefined);
type UndefinedIsOrdinaryData = Assert<Equal<typeof permitsUndefinedResult, Promise<number>>>;

const cancelAware = scoped<Settings, Cancellation>()
    .pipeScoped(async (ctx) => {
        if (ctx.isCancelled()) return { status: "cancelled" as const, text: "" };
        const reader = await openReader(ctx.value.path);
        ctx.defer(() => reader.close());
        const text = await reader.read();
        return { status: ctx.isCancelled() ? ("cancelled" as const) : ("complete" as const), text };
    })
    .pipe((ctx) => ({ ...ctx.value, cancelled: ctx.isCancelled() }));
const cancelledResult = withCancellation(settings, { signal }, cancelAware);
type CancellationResult = Assert<Equal<Awaited<typeof cancelledResult>["cancelled"], boolean>>;

const ordinaryInCancellation = withCancellation(settings, { signal }, inspect);
type OrdinaryStepsRemainReusable = Assert<Equal<typeof ordinaryInCancellation, Promise<Report>>>;

const loop = withCancellation(settings, { signal }, async (ctx) => {
    const summary = await forEachInScope(ctx, ["a", "b"], { concurrency: 2 }, async (item, child, index) => {
        const name: string = item;
        const position: number = index;
        const path: string = child.value.path;
        const requestSignal: AbortSignal = child.signal;
        if (child.isCancelled()) return;
        const reader = await openReader(path + name + position);
        child.defer(() => reader.close());
        void requestSignal;
    });
    return summary;
});
type LoopResult = Assert<Equal<typeof loop, Promise<IterationResult>>>;

const mapping = withScope(settings, async (ctx) => {
    return await mapInScope(ctx, [Promise.resolve(1), Promise.resolve(2)], {}, (item, child) => {
        const value: number = item;
        const path: string = child.value.path;
        return path + value;
    });
});
type MappingResult = Assert<Equal<typeof mapping, Promise<IterationMapResult<string>>>>;

const asyncSource = async function* () {
    yield 1;
    yield 2;
};
const asyncMapping = withScope(settings, (ctx) => mapInScope(ctx, asyncSource(), {}, (item) => item + 1));
type AsyncMappingResult = Assert<Equal<typeof asyncMapping, Promise<IterationMapResult<number>>>>;

const requiresNumber: ScopedStep<number, string> = (ctx) => String(ctx.value);
// @ts-expect-error Report cannot be passed to a number-only step.
inspect.pipe(requiresNumber);
// @ts-expect-error The program still requires Settings at its outer boundary.
withScope(1, inspect);
// @ts-expect-error A base scope does not supply cancellation capabilities.
withScope(settings, cancelAware);

withScope(settings, (ctx) => {
    // @ts-expect-error Cancellation is available only through its explicit runner.
    ctx.isCancelled();
    // @ts-expect-error Cleanup returns no application result.
    ctx.defer(() => 123);
    // @ts-expect-error value cannot be replaced through the context view.
    ctx.value = settings;
});

scoped<Settings>()
    .pipe(open)
    .pipeScoped((ctx) => {
        // @ts-expect-error No implicit merge with the previous Settings object occurs.
        return ctx.value.path;
    });

scoped<Settings>()
    .pipe(() => undefined)
    .pipe((ctx) => {
        // @ts-expect-error Returning undefined does not magically stop the program.
        return ctx.value.path;
    });

withScope(settings, (ctx) =>
    forEachInScope(ctx, [1], {}, (_item, child) => {
        // @ts-expect-error A loop does not invent cancellation for an ordinary parent.
        child.isCancelled();
    })
);

const mutable = { count: 0 };
const shared = withScope(mutable, (ctx: Scope<typeof mutable>) => ++ctx.value.count);
type SharedValueIdentity = Assert<Equal<typeof shared, Promise<number>>>;

export type {
    FinalResult,
    ChildScopeResult,
    NoPipeResult,
    VoidResult,
    UndefinedIsOrdinaryData,
    CancellationResult,
    OrdinaryStepsRemainReusable,
    LoopResult,
    MappingResult,
    AsyncMappingResult,
    SharedValueIdentity,
};
