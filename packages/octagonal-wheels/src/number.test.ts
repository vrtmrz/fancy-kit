import { expect, test } from "vitest";
import { sizeToHumanReadable } from "./number.ts";

test('should return "0.00B" when size is 0', () => {
    const size = 0;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("0.00B");
});

test('should return "1.00B" when size is 1', () => {
    const size = 1;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.00B");
});

test('should return "1.00KB" when size is 1024', () => {
    const size = 1024;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.00KB");
});

test('should return "1.00MB" when size is 1048576', () => {
    const size = 1048576;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.00MB");
});

test('should return "1.00GB" when size is 1073741824', () => {
    const size = 1073741824;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.00GB");
});

test('should return "1.00TB" when size is 1099511627776', () => {
    const size = 1099511627776;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.00TB");
});

test('should return "1.50KB" when size is 1536', () => {
    const size = 1536;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.50KB");
});

test('should return "1.50MB" when size is 1572864', () => {
    const size = 1572864;
    const result = sizeToHumanReadable(size);
    expect(result).to.equal("1.50MB");
});
