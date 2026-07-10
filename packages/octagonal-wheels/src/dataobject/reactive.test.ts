import { describe, it, expect, vi } from "vitest";
import { computed, reactive, reactiveSource } from "./reactive.ts";

describe("reactiveSource", () => {
    it("should return a reactive source with the initial value", () => {
        const initialValue = 10;
        const source = reactiveSource(initialValue);
        expect(source.value).to.equal(initialValue);
    });

    it("should update the value when assigned a new value", () => {
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        source.value = newValue;
        expect(source.value).to.equal(newValue);
    });

    it("should notify change handlers when the value is updated", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        source.onChanged((instance) => {
            notifiedValue = instance.value;
        });
        source.value = newValue;
        expect(notifiedValue).to.equal(newValue);
    });

    it("should not notify change handlers when the value is not updated", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const source = reactiveSource(initialValue);
        source.onChanged((instance) => {
            notifiedValue = instance.value;
        });
        source.value = initialValue;
        expect(notifiedValue).to.be.undefined;
    });

    it("should remove change handlers when offChanged is called", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        const changeHandler = (instance: any) => {
            notifiedValue = instance.value;
        };
        source.onChanged(changeHandler);
        source.value = newValue;
        expect(notifiedValue).to.equal(newValue);
        notifiedValue = undefined;
        source.offChanged(changeHandler);
        source.value = initialValue;
        expect(notifiedValue).to.be.undefined;
    });
});
describe("reactive", () => {
    it("should return a reactive value with the initial value", () => {
        const initialValue = 10;
        const reactiveValue = reactive(() => initialValue);
        expect(reactiveValue.value).to.equal(initialValue);
    });

    it("should update the value when assigned a new value", () => {
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        const reactiveValue = reactive(() => source.value);
        source.value = newValue;
        expect(reactiveValue.value).to.equal(newValue);
    });

    it("should notify change handlers when the value is updated", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        const reactiveValue = reactive(() => source.value);
        reactiveValue.onChanged((instance) => {
            notifiedValue = instance.value;
        });
        source.value = newValue;
        expect(notifiedValue).to.equal(newValue);
    });
    it("should notify change handlers when the value is updated (multiple)", () => {
        const initialValue = 10;
        const newValue1 = 20;
        const newValue2 = 30;
        const newValue3 = 40;
        const source = reactiveSource(initialValue);
        const reactiveValue = reactive(() => source.value);
        const notifiedValues: number[] = [];
        reactiveValue.onChanged((instance) => {
            notifiedValues.push(instance.value);
        });
        source.value = newValue1;
        source.value = newValue2;
        source.value = newValue2;
        source.value = newValue3;
        // expect(notifiedValue).to.equal(newValue);
        expect(notifiedValues).to.deep.equal([newValue1, newValue2, newValue3]);
    });

    it("should not notify change handlers when the value is not updated", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const source = reactiveSource(initialValue);
        const reactiveValue = reactive(() => source.value);
        reactiveValue.onChanged((instance) => {
            notifiedValue = instance.value;
        });
        source.value = initialValue;
        expect(notifiedValue).to.be.undefined;
    });

    it("should remove change handlers when offChanged is called", () => {
        let notifiedValue: number | undefined;
        const initialValue = 10;
        const newValue = 20;
        const source = reactiveSource(initialValue);
        const reactiveValue = reactive(() => source.value);
        const changeHandler = (instance: any) => {
            notifiedValue = instance.value;
        };
        reactiveValue.onChanged(changeHandler);
        source.value = newValue;
        expect(notifiedValue).to.equal(newValue);
        notifiedValue = undefined;
        reactiveValue.offChanged(changeHandler);
        source.value = initialValue;
        expect(notifiedValue).to.be.undefined;
    });

    it("should not recalculate the value when the dependencies don't change", () => {
        const initialValue = 10;
        const dependencyValue = reactiveSource(initialValue);
        const computeFunc = vi.fn(() => dependencyValue.value * 2);

        const reactiveValue = reactive(() => computeFunc());
        expect(reactiveValue.value).to.equal(initialValue * 2);
        expect(computeFunc).toBeCalledTimes(1);
        expect(reactiveValue.value).to.equal(initialValue * 2);
        expect(computeFunc).toBeCalledTimes(1);
    });

    it("should recalculate only the source value has been changed", () => {
        const initialValue = 10;
        const dependencyValue = reactiveSource(initialValue);
        const dependencyValue2 = reactiveSource(initialValue);
        const computeFunc = vi.fn(() => dependencyValue.value * 2);
        const reactiveValue = reactive(() => computeFunc());
        const computeFunc2 = vi.fn(() => reactiveValue.value * 2 + dependencyValue2.value);
        const reactiveValue2 = reactive(() => computeFunc2());

        expect(reactiveValue2.value).to.equal(initialValue * 4 + initialValue);
        expect(computeFunc).toBeCalledTimes(1);
        expect(reactiveValue2.value).to.equal(initialValue * 4 + initialValue);
        expect(computeFunc2).toBeCalledTimes(1);
        dependencyValue2.value = 20;
        // The value should not be calculated until evaluated.
        expect(computeFunc2).toBeCalledTimes(1);
        expect(computeFunc).toBeCalledTimes(1);
        expect(reactiveValue2.value).to.equal(initialValue * 4 + 20);
        // The value should be calculated only once only its needed.
        expect(computeFunc2).toBeCalledTimes(2);
        expect(computeFunc).toBeCalledTimes(1);
    });

    it("should allow nested reactive values", () => {
        const value_1_1 = reactiveSource(1);
        const value_1_2 = reactiveSource(1);
        const value_2_1 = reactive(() => value_1_1.value + 1); // 2
        const value_3_a = reactive(() => value_2_1.value + 1 + value_1_2.value); // 4
        const value_4_a = reactive(() => value_3_a.value * 1 + value_1_1.value); // 5
        const value_5_a = reactive(() => value_4_a.value * 1 + value_2_1.value); // 7
        expect(value_5_a.value).to.equal(7);
        value_1_1.value = 2;
        expect(value_5_a.value).to.equal(10);
        expect(value_5_a.value).to.equal(10);
        value_1_1.value = 3;
        value_1_2.value = 2;
        expect(value_5_a.value).to.equal(14);
        expect(value_5_a.value).to.equal(14);
        value_1_1.value = 3;
        value_1_1.value = 4;
        value_1_1.value = 5;
        value_1_1.value = 6;
    });
});

describe("computed", () => {
    it("should return the computed value", () => {
        const initialValue = 10;
        const computedValue = computed(() => initialValue * 2);
        expect(computedValue()).to.equal(initialValue * 2);
    });

    it("should update the computed value when dependencies change", () => {
        const initialValue = 10;
        const dependencyValue = reactiveSource(initialValue);
        const computedValue = computed(() => dependencyValue.value * 2);
        expect(computedValue()).to.equal(initialValue * 2);

        dependencyValue.value = 20;
        expect(computedValue()).to.equal(20 * 2);
    });

    it("should not update the computed value when dependencies do not change", () => {
        const initialValue = 10;
        const dependencyValue = reactiveSource(initialValue);
        const computedValue = computed(() => dependencyValue.value * 2);
        expect(computedValue()).to.equal(initialValue * 2);

        dependencyValue.value = initialValue;
        expect(computedValue()).to.equal(initialValue * 2);
    });
});
