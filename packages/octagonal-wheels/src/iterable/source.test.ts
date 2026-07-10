import { describe, it, expect } from "vitest";
import { generativeBuffer, GeneratorSource } from "./source";

function createGeneratorSource<T>(modeFunc: boolean) {
    if (modeFunc) return generativeBuffer<T>();
    return new GeneratorSource<T>();
}
for (const modeFunc of [true, false]) {
    const title = modeFunc ? "generativeBuffer" : "GeneratorSource";
    describe(title, () => {
        it("should enqueue and iterate values", async () => {
            const source = createGeneratorSource<number>(modeFunc);
            source.enqueue(1);
            source.enqueue(2);
            source.enqueue(3);
            source.finish();

            const result = [] as number[];
            for await (const value of source) {
                result.push(value);
            }

            expect(result).toEqual([1, 2, 3]);
        });

        it("should handle dispose correctly", async () => {
            const source = createGeneratorSource<number>(modeFunc);
            source.enqueue(1);
            source.enqueue(2);
            source.dispose();

            const result = [] as number[];
            for await (const value of source) {
                result.push(value);
            }

            expect(result).toEqual([]);
        });

        it("should not enqueue after dispose", async () => {
            const source = createGeneratorSource<number>(modeFunc);
            source.enqueue(1);
            source.dispose();
            expect(() => source.enqueue(2)).toThrowError();

            const result = [] as number[];
            for await (const value of source) {
                result.push(value);
            }

            expect(result).toEqual([]);
        });

        it("should not enqueue after finish", async () => {
            const source = createGeneratorSource<number>(modeFunc);
            source.enqueue(1);
            source.finish();
            expect(() => source.enqueue(2)).toThrowError();

            const result = [] as number[];
            for await (const value of source) {
                result.push(value);
            }

            expect(result).toEqual([1]);
        });
    });
}
