import { describe, it, expect } from "vitest";
import { escapeStringToHTML, replaceAll, replaceAllPairs } from "./string.ts";

describe("replaceAll", () => {
    it("should replace all occurrences of a substring with another substring", () => {
        const str = "Hello, World!";
        const search = "o";
        const replace = "x";
        const result = replaceAll(str, search, replace);
        expect(result).to.equal("Hellx, Wxrld!");
    });

    it("should replace all occurrences of a substring with another substring (case-sensitive)", () => {
        const str = "Hello, World!";
        const search = "o";
        const replace = "x";
        const result = replaceAll(str, search, replace);
        expect(result).to.equal("Hellx, Wxrld!");
    });

    it("should replace all occurrences of a substring with another substring (multiple replacements)", () => {
        const str = "Hello, World!";
        const search = "o";
        const replace = "x";
        const result = replaceAll(str, search, replace);
        expect(result).to.equal("Hellx, Wxrld!");
    });
});

describe("replaceAllPairs", () => {
    it("should replace all occurrences of multiple substrings with their corresponding replacements", () => {
        const str = "Hello, World!";
        const replacements = [
            ["o", "x"],
            ["l", "y"],
            ["d", "z"],
        ] as [from: string, to: string][];
        const result = replaceAllPairs(str, ...replacements);
        expect(result).to.equal("Heyyx, Wxryz!");
    });

    it("should replace all occurrences of multiple substrings with their corresponding replacements (case-sensitive)", () => {
        const str = "Hello, World!";
        const replacements = [
            ["o", "x"],
            ["L", "Y"],
            ["D", "Z"],
        ] as [from: string, to: string][];
        const result = replaceAllPairs(str, ...replacements);
        expect(result).to.equal("Hellx, Wxrld!");
    });

    it("should replace all occurrences of multiple substrings with their corresponding replacements (multiple replacements)", () => {
        const str = "Hello, World!";
        const replacements = [
            ["o", "x"],
            ["l", "y"],
            ["x", "l"],
        ] as [from: string, to: string][];
        const result = replaceAllPairs(str, ...replacements);
        expect(result).to.equal("Heyyl, Wlryd!");
    });
});

describe("escapeStringToHTML", () => {
    it("should escape special characters in the string", () => {
        const str = '<script>alert("Hello, World!")</script>';
        const result = escapeStringToHTML(str);
        expect(result).to.equal("&lt;script&gt;alert(&quot;Hello, World!&quot;)&lt;/script&gt;");
    });

    it("should escape multiple occurrences of special characters in the string", () => {
        const str = 'This is a "quote" and this is a <tag>.';
        const result = escapeStringToHTML(str);
        expect(result).to.equal("This is a &quot;quote&quot; and this is a &lt;tag&gt;.");
    });

    it("should escape special characters in an empty string", () => {
        const str = "";
        const result = escapeStringToHTML(str);
        expect(result).to.equal("");
    });

    it("should not escape characters that are not special characters", () => {
        const str = "This is a normal string without any special characters.";
        const result = escapeStringToHTML(str);
        expect(result).to.equal(str);
    });
});
