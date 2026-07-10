import { LSError } from '../common/error.js';

const DATABASE_DESTROYED_ERROR = "Database not initialized or already destroyed";
class DatabaseError extends LSError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "DatabaseError"
        });
    }
}
class DatabaseTransactionError extends DatabaseError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "DatabaseTransactionError"
        });
    }
}
class DatabaseTransactionAbortError extends DatabaseTransactionError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "DatabaseTransactionAbortError"
        });
        Object.defineProperty(this, "abortedError", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
    }
    setAbortedError(err) {
        this.abortedError = err;
    }
}
class ErrorDatabaseDestroyed extends DatabaseError {
    constructor() {
        super(...arguments);
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: "ErrorDatabaseDestroyed"
        });
    }
}
function buildIDBRange(from, to) {
    if (from && to) {
        return IDBKeyRange.bound(from, to);
    }
    if (from) {
        return IDBKeyRange.lowerBound(from);
    }
    if (to) {
        return IDBKeyRange.upperBound(to);
    }
    return undefined;
}
const SIMPLE_STORE_EVENT_TYPES = {
    CLOSED: "closed",
    DESTROYED: "destroyed",
    INITIALISED: "initialised",
    OPENED: "opened",
};

export { DATABASE_DESTROYED_ERROR, DatabaseError, DatabaseTransactionAbortError, DatabaseTransactionError, ErrorDatabaseDestroyed, SIMPLE_STORE_EVENT_TYPES, buildIDBRange };
//# sourceMappingURL=dbcommon.js.map
