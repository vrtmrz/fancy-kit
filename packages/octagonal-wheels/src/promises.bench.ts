import { bench, describe } from "vitest";
import { nativePromiseWithResolvers, polyfillPromiseWithResolvers } from "./promises.ts";

describe("PromiseWithResolver bench", () => {
    bench(
        "native",
        async () => {
            const p = nativePromiseWithResolvers<number>();
            const { promise, resolve } = p;
            resolve(42);
            await promise;
        },
        { time: 1000 }
    );
    bench(
        "polyfill",
        async () => {
            const p = polyfillPromiseWithResolvers<number>();
            const { promise, resolve } = p;
            resolve(42);
            await promise;
        },
        { time: 1000 }
    );
});
