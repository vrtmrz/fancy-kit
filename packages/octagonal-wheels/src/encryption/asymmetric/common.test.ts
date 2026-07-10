// Note: This test should be a supplementary test for the asymmetric encryption module.
// Basically, they have been tested in each unit test file.
import { describe, it, expect } from "vitest";
import { AsymmetricEncryptionArgumentError } from "./common.ts";

describe("common.ts", () => {
    it("tests secondary argument could be handled on error classes", () => {
        const encryptionError = new AsymmetricEncryptionArgumentError("Error-testing", "string");

        expect(encryptionError.message).toBe("Error-testing: string");

        const encryptionError2 = new AsymmetricEncryptionArgumentError("Error-testing-json", { key: "value" });
        expect(encryptionError2.message).toBe('Error-testing-json: {"key":"value"}');

        const error = new Error("This is a test error");
        const encryptionError3 = new AsymmetricEncryptionArgumentError("Error-testing-error", error);
        expect(encryptionError3.message).toBe("Error-testing-error: This is a test error");
    });
});
