/**
 * Error class for Self-hosted LiveSync errors.
 * This class extends the base LiveSyncError class and provides additional context for errors related to LiveSync operations.
 * It includes a name property and a cause property to capture the original error.
 * The status property returns the HTTP status code if available, defaulting to 500 for internal server errors.
 * The class also includes static methods to check whether an error is caused by a specific error class.
 */
class LSError extends Error {
    /**
     * Returns the HTTP status code associated with the error, if available.
     * If the error has a status property, it returns that; otherwise, it defaults to 500 (Internal Server Error).
     * @returns {number} The HTTP status code.
     */
    get status() {
        if (this.overrideStatus !== undefined) {
            return this.overrideStatus;
        }
        if (this.cause && "status" in this.cause) {
            return this.cause.status;
        }
        return 500; // Default status code for internal server error
    }
    /**
     * Constructs a new LiveSyncError instance.
     * @param message The error message to be displayed.
     */
    constructor(message, options) {
        super(message);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.constructor.name
        });
        Object.defineProperty(this, "cause", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "overrideStatus", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        if (options?.cause) {
            this.cause = options.cause instanceof Error ? options.cause : new Error(`${options.cause}`);
        }
        if (options?.status !== undefined) {
            this.overrideStatus = options.status;
        }
    }
    /**
     * Determines whether an error is caused by a specific error class.
     * @param error The error to examine.
     * @param errorClass The error class to compare against.
     * @returns True if the error is caused by the specified error class; otherwise, false.
     * @example
     * LiveSyncError.isCausedBy(someSyncParamsFetchError, SyncParamsNotFoundError); // Returns true if the error is caused by SyncParamsNotFoundError; this is usually represented as SyncParamsFetchError at the uppermost layer.
     */
    static isCausedBy(error, errorClass) {
        if (!error) {
            return false;
        }
        if (error instanceof errorClass) {
            return true;
        }
        if (error.cause) {
            return LSError.isCausedBy(error.cause, errorClass);
        }
        return false;
    }
    /**
     * Creates a new instance of the error class from an existing error.
     * @param error The error to wrap.
     * @returns A new instance of the error class with the original error's message and stack trace.
     */
    static fromError(error) {
        if (error instanceof this) {
            return error;
        }
        const instance = new this(`${this.name}: ${error?.message}`, { cause: error });
        if (error?.stack) {
            instance.stack = error.stack;
        }
        else {
            instance.stack = new Error().stack;
        }
        return instance;
    }
}
class LSFatalError extends LSError {
}
function wrapError(func) {
    return func().catch((err) => {
        return LSError.fromError(err);
    });
}

export { LSError, LSFatalError, wrapError };
//# sourceMappingURL=error.js.map
