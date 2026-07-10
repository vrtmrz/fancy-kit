import { describe, it, expect } from "vitest";
import { bindContext, bindContextFunc } from "./context";

describe("bindContext", () => {
    it("should bind the context object to the function", () => {
        const ctx = { name: "John" };
        const func = (ctx: any) => {
            return `Hello, ${ctx.name}!`;
        };
        const boundFunc = bindContext(ctx, func);
        const result = boundFunc();
        expect(result).to.equal("Hello, John!");
    });

    it("should pass arguments to the original function", () => {
        const ctx = { name: "John" };
        const func = (ctx: any, greeting: string) => {
            return `${greeting}, ${ctx.name}!`;
        };
        const boundFunc = bindContext(ctx, func);
        const result = boundFunc("Good morning");
        expect(result).to.equal("Good morning, John!");
    });

    it("should return the result of the original function", () => {
        const ctx = { name: "John" };
        const func = (ctx: any) => {
            return `Hello, ${ctx.name}!`;
        };
        const boundFunc = bindContext(ctx, func);
        const result = boundFunc();
        expect(result).to.equal("Hello, John!");
    });
});
describe("bindContextFunc", () => {
    it("should bind the context object to the function", () => {
        const ctxFun = () => ({ name: "John" });
        const func = (ctx: any) => {
            return `Hello, ${ctx.name}!`;
        };
        const boundFunc = bindContextFunc(ctxFun, func);
        const result = boundFunc();
        expect(result).to.equal("Hello, John!");
    });

    it("should pass arguments to the original function", () => {
        const ctxFun = () => ({ name: "John" });
        const func = (ctx: any, greeting: string) => {
            return `${greeting}, ${ctx.name}!`;
        };
        const boundFunc = bindContextFunc(ctxFun, func);
        const result = boundFunc("Good morning");
        expect(result).to.equal("Good morning, John!");
    });

    it("should return the result of the original function", () => {
        const ctxFun = () => ({ name: "John" });
        const func = (ctx: any) => {
            return `Hello, ${ctx.name}!`;
        };
        const boundFunc = bindContextFunc(ctxFun, func);
        const result = boundFunc();
        expect(result).to.equal("Hello, John!");
    });
});
