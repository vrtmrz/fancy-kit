import { describe, bench } from "vitest";
import { generativeBuffer, GeneratorSource } from "./source";
import { asChunk } from "./chunks";

function createGeneratorSource<T>(modeFunc: boolean) {
    if (modeFunc) return generativeBuffer<T>();
    return new GeneratorSource<T>();
}

describe("Generator Source Benchmark", () => {
    for (const modeFunc of [true, false]) {
        const title = modeFunc ? "generativeBuffer" : "GeneratorSource";
        bench(title, async () => {
            const source = createGeneratorSource<number>(modeFunc);
            for (let i = 0; i < 10000; i++) {
                source.enqueue(i);
            }
            source.finish();
            const packed = asChunk(source, { unit: 100 });
            for await (const chunk of packed) {
                // do nothing
            }
        });
    }
});
