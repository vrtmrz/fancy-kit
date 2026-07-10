import { describe, bench } from "vitest";

import * as v1 from "./reactive_v1.ts";
import * as v2 from "./reactive_v2.ts";

for (const mode of ["R/W", "R/O", "W/O"]) {
    describe("Reactive Source Benchmark " + mode, () => {
        for (const [title, target] of [
            ["v1", v1],
            ["v2", v2],
        ] as const) {
            // describe(`reactive-benchmark-${title}`, () => {
            // const title = target === v1 ? 'v1' : 'v2';
            const value_1_1 = target.reactiveSource(1);
            const value_1_2 = target.reactiveSource(1);
            const value_2_1 = target.reactive(() => value_1_1.value + 1);
            const value_3_a = target.reactive(() => value_2_1.value + 1 + value_1_2.value);
            const value_4_a = target.reactive(() => value_3_a.value * 1 + value_1_1.value);
            const value_5_a = target.reactive(() => value_4_a.value * 1 + value_2_1.value);
            if (mode === "R/W") {
                bench(`reactive-benchmark-readwrite-${title}`, async () => {
                    for (let i = 0; i < 1000; i++) {
                        value_1_1.value = i;
                        value_1_2.value = i + 2;
                        const _ = value_5_a.value;
                    }
                });
            } else if (mode === "R/O") {
                bench(`reactive-benchmark-readonly-${title}`, async () => {
                    value_1_1.value = 1;
                    value_1_2.value = 2;
                    for (let i = 0; i < 1000; i++) {
                        const _ = value_5_a.value;
                    }
                });
            } else {
                bench(`reactive-benchmark-write-some-only-${title}`, async () => {
                    for (let i = 0; i < 1000; i++) {
                        value_1_1.value = i;
                        // value_1_2.value = i ;
                    }
                    const _ = value_5_a.value;
                });
            }
        }
    });
}
