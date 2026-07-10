import { bench, describe } from "vitest";
import {
    hexStringToUint8ArrayBrowser,
    hexStringToUint8ArrayNative,
    uint8ArrayToHexStringBrowser,
    uint8ArrayToHexStringNative,
} from "./hex.ts";

const sourceString = "Fancy Syncing! ステーシーの美術 ! 1234567890 ~!@#$%^&*()_+`-={}|[] ";
const testOption = { time: 2000 };
describe("base64 bench", () => {
    for (const len of [10, 100, 1000, 10000]) {
        const source = new TextEncoder().encode(sourceString.repeat(len));
        describe(`Length: ${source.length}`, () => {
            describe(`Encode Length: ${source.length}`, () => {
                bench(
                    "native",
                    () => {
                        uint8ArrayToHexStringNative(source);
                    },
                    testOption
                );
                bench(
                    "browser",
                    () => {
                        uint8ArrayToHexStringBrowser(source);
                    },
                    testOption
                );
            });
            describe(`Decode`, async () => {
                const hex = uint8ArrayToHexStringNative(source);
                bench(
                    "native",
                    () => {
                        hexStringToUint8ArrayNative(hex);
                    },
                    testOption
                );
                bench(
                    "browser",
                    () => {
                        hexStringToUint8ArrayBrowser(hex);
                    },
                    testOption
                );
            });
        });
    }
});
