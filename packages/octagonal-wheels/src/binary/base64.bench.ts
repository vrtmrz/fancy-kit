import { bench, describe } from "vitest";
import {
    arrayBufferToBase64Browser,
    arrayBufferToBase64Native,
    arrayBufferToBase64SingleBrowser,
    arrayBufferToBase64SingleNative,
    base64ToArrayBufferBrowser,
    base64ToArrayBufferNative,
    base64ToStringBrowser,
    base64ToStringNative,
    tryConvertBase64ToArrayBufferBrowser,
    tryConvertBase64ToArrayBufferNative,
} from "./base64.ts";

const sourceString = "Fancy Syncing! ステーシーの美術 ! 1234567890 ~!@#$%^&*()_+`-={}|[] ";
const testOption = { time: 2000 };
describe("base64 bench", () => {
    for (const len of [10, 100, 1000, 10000]) {
        const source = new TextEncoder().encode(sourceString.repeat(len));
        describe(`Length: ${source.length}`, () => {
            describe("Encode", () => {
                bench(
                    "native",
                    async () => {
                        await arrayBufferToBase64Native(source);
                    },
                    testOption
                );
                bench(
                    "browser",
                    async () => {
                        await arrayBufferToBase64Browser(source);
                    },
                    testOption
                );
            });
            describe(`Encode Single`, () => {
                bench(
                    "native single",
                    async () => {
                        await arrayBufferToBase64SingleNative(source);
                    },
                    testOption
                );
                bench(
                    "browser single",
                    async () => {
                        await arrayBufferToBase64SingleBrowser(source);
                    },
                    testOption
                );
            });
            describe(`Decode`, async () => {
                const base64 = await arrayBufferToBase64Native(source);
                const joined = base64.join("");
                bench(
                    "native",
                    async () => {
                        base64ToArrayBufferNative(joined);
                    },
                    testOption
                );
                bench(
                    "browser",
                    async () => {
                        base64ToArrayBufferBrowser(joined);
                    },
                    testOption
                );
            });
            describe(`Base64 To String`, async () => {
                const base64 = await arrayBufferToBase64Native(source);
                const joined = base64.join("");
                bench(
                    "native",
                    async () => {
                        base64ToStringNative(joined);
                    },
                    testOption
                );
                bench(
                    "browser",
                    async () => {
                        base64ToStringBrowser(joined);
                    },
                    testOption
                );
            });
            describe(`Try Convert Base64 To ArrayBuffer`, async () => {
                const base64 = await arrayBufferToBase64Native(source);
                const joined = base64.join("");
                bench(
                    "native",
                    async () => {
                        tryConvertBase64ToArrayBufferNative(joined);
                    },
                    testOption
                );
                bench(
                    "browser",
                    async () => {
                        tryConvertBase64ToArrayBufferBrowser(joined);
                    },
                    testOption
                );
            });
        });
    }
});
