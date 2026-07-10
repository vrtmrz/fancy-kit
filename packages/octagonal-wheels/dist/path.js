/** An error raised when an untrusted path fails the OW path-safety contract. */
class UnsafePathError extends Error {
    /**
     * Creates an unsafe-path error.
     *
     * @param input - The complete untrusted input.
     * @param reason - The stable rejection reason.
     * @param component - The rejected component, when applicable.
     */
    constructor(input, reason, component) {
        super(`Unsafe relative path (${reason}): ${JSON.stringify(input)}`);
        /** The complete untrusted input that was rejected. */
        Object.defineProperty(this, "input", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The stable reason that the input was rejected. */
        Object.defineProperty(this, "reason", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** The rejected component, when the failure applies to one component. */
        Object.defineProperty(this, "component", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this.name = "UnsafePathError";
        this.input = input;
        this.reason = reason;
        this.component = component;
    }
}
const INVALID_PORTABLE_COMPONENT_CHARACTER = /[<>:"/\\|?*]/u;
const RESERVED_PORTABLE_COMPONENT = /^(?:con|prn|aux|nul|clock\$|conin\$|conout\$|com[1-9]|lpt[1-9])(?:\.|$)/iu;
const DRIVE_PREFIX = /^[A-Za-z]:/u;
function containsControlCharacter(value) {
    for (let index = 0; index < value.length; index++) {
        const code = value.charCodeAt(index);
        if (code <= 0x1f || (code >= 0x7f && code <= 0x9f))
            return true;
    }
    return false;
}
function getUnsafeComponentReason(component) {
    if (component.length === 0)
        return "empty-component";
    if (component === "." || component === "..")
        return "dot-component";
    if (containsControlCharacter(component))
        return "control-character";
    if (INVALID_PORTABLE_COMPONENT_CHARACTER.test(component))
        return "invalid-character";
    if (/[. ]$/u.test(component))
        return "trailing-dot-or-space";
    if (RESERVED_PORTABLE_COMPONENT.test(component))
        return "reserved-name";
    return undefined;
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
function parseSafePathComponent(component) {
    const reason = getUnsafeComponentReason(component);
    if (reason !== undefined)
        throw new UnsafePathError(component, reason, component);
    return component;
}
/**
 * Reports whether a value is one portable path component.
 *
 * @param component - The component to inspect.
 * @returns `true` only when {@link parseSafePathComponent} would accept it.
 */
function isSafePathComponent(component) {
    return getUnsafeComponentReason(component) === undefined;
}
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
function parseSafeRelativePath(path, options = {}) {
    if (path.length === 0) {
        if (options.allowEmpty === true)
            return path;
        throw new UnsafePathError(path, "empty-path");
    }
    if (path.startsWith("/") || path.startsWith("\\") || DRIVE_PREFIX.test(path)) {
        throw new UnsafePathError(path, "absolute-path");
    }
    for (const component of path.split("/")) {
        const reason = getUnsafeComponentReason(component);
        if (reason !== undefined)
            throw new UnsafePathError(path, reason, component);
    }
    return path;
}
/**
 * Reports whether a value is a canonical safe relative path.
 *
 * @param path - The path to inspect.
 * @param options - Validation options.
 * @returns `true` only when {@link parseSafeRelativePath} would accept it.
 */
function isSafeRelativePath(path, options = {}) {
    if (path.length === 0)
        return options.allowEmpty === true;
    if (path.startsWith("/") || path.startsWith("\\") || DRIVE_PREFIX.test(path))
        return false;
    return path.split("/").every(isSafePathComponent);
}
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
function resolvePathWithinRoot(root, relativePath, options = {}) {
    const safePath = parseSafeRelativePath(relativePath, options);
    const separator = options.separator ?? "/";
    if (separator !== "/" && separator !== "\\") {
        throw new RangeError("Path separator must be either '/' or '\\\\'.");
    }
    if (safePath.length === 0)
        return root;
    const joinedRelativePath = separator === "/" ? safePath : safePath.split("/").join("\\");
    const rootWithoutTrailingSeparators = root.replace(/[\\/]+$/u, "");
    if (rootWithoutTrailingSeparators.length > 0) {
        return `${rootWithoutTrailingSeparators}${separator}${joinedRelativePath}`;
    }
    if (root.length > 0)
        return `${root}${joinedRelativePath}`;
    return joinedRelativePath;
}

export { UnsafePathError, isSafePathComponent, isSafeRelativePath, parseSafePathComponent, parseSafeRelativePath, resolvePathWithinRoot };
//# sourceMappingURL=path.js.map
