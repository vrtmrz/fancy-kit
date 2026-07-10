declare const safePathComponentBrand: unique symbol;
declare const safeRelativePathBrand: unique symbol;
/** A single portable path component that has passed the OW path-safety contract. */
export type SafePathComponent = string & {
    readonly [safePathComponentBrand]: true;
};
/** A canonical, forward-slash-separated relative path that has passed the OW path-safety contract. */
export type SafeRelativePath = string & {
    readonly [safeRelativePathBrand]: true;
};
/** The reason that a path or path component was rejected. */
export type UnsafePathReason = "empty-path" | "absolute-path" | "empty-component" | "dot-component" | "control-character" | "invalid-character" | "trailing-dot-or-space" | "reserved-name";
/** Options controlling safe relative-path validation. */
export interface SafeRelativePathOptions {
    /** Whether the empty string may represent the root itself. Defaults to `false`. */
    allowEmpty?: boolean;
}
/** Options controlling safe root containment. */
export interface ResolvePathWithinRootOptions extends SafeRelativePathOptions {
    /** The separator used in the returned path. Defaults to `/`. */
    separator?: "/" | "\\";
}
/** An error raised when an untrusted path fails the OW path-safety contract. */
export declare class UnsafePathError extends Error {
    /** The complete untrusted input that was rejected. */
    readonly input: string;
    /** The stable reason that the input was rejected. */
    readonly reason: UnsafePathReason;
    /** The rejected component, when the failure applies to one component. */
    readonly component: string | undefined;
    /**
     * Creates an unsafe-path error.
     *
     * @param input - The complete untrusted input.
     * @param reason - The stable rejection reason.
     * @param component - The rejected component, when applicable.
     */
    constructor(input: string, reason: UnsafePathReason, component?: string);
}
/**
 * Validates one portable path component without changing it.
 *
 * @param component - The untrusted component to validate.
 * @returns The original component branded as safe.
 * @throws {@link UnsafePathError} When the component is empty, is `.` or `..`, contains a separator or control/portable-invalid character, ends in a dot or space, or is a reserved device name.
 *
 * @remarks
 * This conservative contract is suitable for names that may cross Windows,
 * macOS, Linux, Obsidian vaults, and archive formats. It deliberately does not
 * normalise Unicode or enforce filesystem-specific length limits.
 */
export declare function parseSafePathComponent(component: string): SafePathComponent;
/**
 * Reports whether a value is one portable path component.
 *
 * @param component - The component to inspect.
 * @returns `true` only when {@link parseSafePathComponent} would accept it.
 */
export declare function isSafePathComponent(component: string): component is SafePathComponent;
/**
 * Validates a canonical relative path without normalising or decoding it.
 *
 * @param path - The untrusted relative path to validate.
 * @param options - Validation options.
 * @returns The original path branded as safe.
 * @throws {@link UnsafePathError} When the path is absolute, drive-qualified, non-canonical, or contains an unsafe component.
 *
 * @remarks
 * Accepted paths use `/` separators. Empty components, `.` and `..` are
 * rejected, as are backslashes, control characters, portable-invalid names,
 * and Windows device names. Callers must decode archive, URL, or document
 * encodings before validation when those layers decode names before writing.
 */
export declare function parseSafeRelativePath(path: string, options?: SafeRelativePathOptions): SafeRelativePath;
/**
 * Reports whether a value is a canonical safe relative path.
 *
 * @param path - The path to inspect.
 * @param options - Validation options.
 * @returns `true` only when {@link parseSafeRelativePath} would accept it.
 */
export declare function isSafeRelativePath(path: string, options?: SafeRelativePathOptions): path is SafeRelativePath;
/**
 * Resolves an untrusted relative path beneath a trusted root.
 *
 * @param root - A trusted root path. The root is preserved apart from trailing separators needed for joining.
 * @param relativePath - The untrusted relative path to validate and join.
 * @param options - Validation and output-separator options.
 * @returns The root-contained path using the requested separator.
 * @throws {@link UnsafePathError} When `relativePath` is unsafe.
 * @throws {@link RangeError} When a forged runtime separator is neither `/` nor `\`.
 *
 * @remarks
 * The root is a trusted boundary supplied by the caller and is not normalised.
 * Containment follows from rejecting every absolute form and traversal
 * component before joining. An empty root is useful for vault-relative paths.
 */
export declare function resolvePathWithinRoot(root: string, relativePath: string, options?: ResolvePathWithinRootOptions): string;
export {};
