import { describe, expect, it } from "vitest";
import {
    isSafePathComponent,
    isSafeRelativePath,
    parseSafePathComponent,
    parseSafeRelativePath,
    resolvePathWithinRoot,
    UnsafePathError,
    type UnsafePathReason,
} from "./path.ts";

describe("safe path components", () => {
    it.each(["note.md", ".obsidian", "two words", "日本語.md", "name...part", "COM10"])(
        "accepts the portable component %s",
        (component) => {
            expect(parseSafePathComponent(component)).toBe(component);
            expect(isSafePathComponent(component)).toBe(true);
        }
    );

    it.each<[string, UnsafePathReason]>([
        ["", "empty-component"],
        [".", "dot-component"],
        ["..", "dot-component"],
        ["folder/file", "invalid-character"],
        ["folder\\file", "invalid-character"],
        ["bad:name", "invalid-character"],
        ["bad?.md", "invalid-character"],
        ["bad\0name", "control-character"],
        ["bad\nname", "control-character"],
        [`bad${String.fromCharCode(0x7f)}name`, "control-character"],
        [`bad${String.fromCharCode(0x80)}name`, "control-character"],
        ["trailing.", "trailing-dot-or-space"],
        ["trailing ", "trailing-dot-or-space"],
        ["CON", "reserved-name"],
        ["nul.txt", "reserved-name"],
        ["Lpt9.log", "reserved-name"],
        ["CONOUT$", "reserved-name"],
    ])("rejects %j as %s", (component, reason) => {
        expect(isSafePathComponent(component)).toBe(false);
        expect(() => parseSafePathComponent(component)).toThrowError(
            expect.objectContaining({ reason, input: component, component })
        );
    });
});

describe("safe relative paths", () => {
    it.each(["note.md", "folder/note.md", ".obsidian/plugins/example/main.js", "日本語/ノート.md"])(
        "accepts the canonical relative path %s unchanged",
        (path) => {
            expect(parseSafeRelativePath(path)).toBe(path);
            expect(isSafeRelativePath(path)).toBe(true);
        }
    );

    it("allows the root representation only when requested", () => {
        expect(() => parseSafeRelativePath("")).toThrowError(expect.objectContaining({ reason: "empty-path" }));
        expect(parseSafeRelativePath("", { allowEmpty: true })).toBe("");
        expect(isSafeRelativePath("")).toBe(false);
        expect(isSafeRelativePath("", { allowEmpty: true })).toBe(true);
    });

    it.each<[string, UnsafePathReason, string | undefined]>([
        ["/etc/passwd", "absolute-path", undefined],
        ["\\\\server\\share", "absolute-path", undefined],
        ["C:/Windows/system.ini", "absolute-path", undefined],
        ["c:relative.txt", "absolute-path", undefined],
        ["./note.md", "dot-component", "."],
        ["../note.md", "dot-component", ".."],
        ["folder/../note.md", "dot-component", ".."],
        ["folder//note.md", "empty-component", ""],
        ["folder/", "empty-component", ""],
        ["folder\\note.md", "invalid-character", "folder\\note.md"],
        ["folder/NUL.txt", "reserved-name", "NUL.txt"],
        ["folder/bad|name", "invalid-character", "bad|name"],
    ])("rejects %j as %s", (path, reason, component) => {
        expect(isSafeRelativePath(path)).toBe(false);
        expect(() => parseSafeRelativePath(path)).toThrowError(
            expect.objectContaining({ reason, input: path, component })
        );
    });

    it("exposes a stable error type and rejection fields", () => {
        try {
            parseSafeRelativePath("safe/../escape");
            expect.fail("Expected the path to be rejected");
        } catch (error) {
            expect(error).toBeInstanceOf(UnsafePathError);
            expect(error).toMatchObject({
                name: "UnsafePathError",
                input: "safe/../escape",
                component: "..",
                reason: "dot-component",
            });
        }
    });
});

describe("resolvePathWithinRoot", () => {
    it("joins a safe path beneath a POSIX root", () => {
        expect(resolvePathWithinRoot("/vault/", "folder/note.md")).toBe("/vault/folder/note.md");
    });

    it("joins a safe path beneath a Windows root using backslashes", () => {
        expect(resolvePathWithinRoot("C:\\vault\\", "folder/note.md", { separator: "\\" })).toBe(
            "C:\\vault\\folder\\note.md"
        );
    });

    it("supports an empty vault-relative root", () => {
        expect(resolvePathWithinRoot("", "folder/note.md")).toBe("folder/note.md");
    });

    it("preserves a separator-only root", () => {
        expect(resolvePathWithinRoot("/", "folder/note.md")).toBe("/folder/note.md");
        expect(resolvePathWithinRoot("\\\\", "folder/note.md", { separator: "\\" })).toBe("\\\\folder\\note.md");
    });

    it("returns the root itself only when an empty relative path is allowed", () => {
        expect(resolvePathWithinRoot("/vault/", "", { allowEmpty: true })).toBe("/vault/");
    });

    it("rejects traversal before joining", () => {
        expect(() => resolvePathWithinRoot("/vault", "folder/../../escape.md")).toThrowError(
            expect.objectContaining({ reason: "dot-component" })
        );
    });

    it("rejects a forged runtime separator", () => {
        expect(() =>
            resolvePathWithinRoot("/vault", "folder/note.md", {
                separator: ":" as "/",
            })
        ).toThrowError(RangeError);
    });
});
