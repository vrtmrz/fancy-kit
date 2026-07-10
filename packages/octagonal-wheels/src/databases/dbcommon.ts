import { LSError } from "../common/error";

export const DATABASE_DESTROYED_ERROR = "Database not initialized or already destroyed";
export class DatabaseError extends LSError {
    name = "DatabaseError";
}
export class DatabaseTransactionError extends DatabaseError {
    name = "DatabaseTransactionError";
}
export class DatabaseTransactionAbortError extends DatabaseTransactionError {
    name = "DatabaseTransactionAbortError";
    abortedError?: Error;
    setAbortedError(err: Error) {
        this.abortedError = err;
    }
}
export class ErrorDatabaseDestroyed extends DatabaseError {
    name = "ErrorDatabaseDestroyed";
}

export function buildIDBRange(from: string | undefined, to: string | undefined): IDBKeyRange | undefined {
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
export const SIMPLE_STORE_EVENT_TYPES = {
    CLOSED: "closed",
    DESTROYED: "destroyed",
    INITIALISED: "initialised",
    OPENED: "opened",
} as const;
export type SimpleStoreEventTypes = (typeof SIMPLE_STORE_EVENT_TYPES)[keyof typeof SIMPLE_STORE_EVENT_TYPES];

export type SimpleStoreEventDetailBase = {
    instanceName: string;
    name: string;
    reason: string | Error | undefined;
};
export type SimpleStoreEventCloseParams = {
    type: typeof SIMPLE_STORE_EVENT_TYPES.CLOSED;
    reason: string | Error | undefined;
};
export type SimpleStoreEventDestroyParams = {
    type: typeof SIMPLE_STORE_EVENT_TYPES.DESTROYED;
    reason: string | Error | undefined;
};
export type SimpleStoreEventInitialiseParams = {
    type: typeof SIMPLE_STORE_EVENT_TYPES.INITIALISED;
    count: number;
    reason: string | Error | undefined;
};
export type SimpleStoreEventOpenedParams = {
    type: typeof SIMPLE_STORE_EVENT_TYPES.INITIALISED;
    count: number;
    reason: string | Error | undefined;
};
export type SimpleStoreEventParams =
    | SimpleStoreEventCloseParams
    | SimpleStoreEventDestroyParams
    | SimpleStoreEventInitialiseParams;
export type SimpleStoreEventClosedDetail = SimpleStoreEventDetailBase & SimpleStoreEventCloseParams;
export type SimpleStoreEventDestroyedDetail = SimpleStoreEventDetailBase & SimpleStoreEventDestroyParams;
export type SimpleStoreEventInitialisedDetail = SimpleStoreEventDetailBase & SimpleStoreEventInitialiseParams;
export type SimpleStoreEventOpenedDetail = SimpleStoreEventDetailBase & SimpleStoreEventOpenedParams;
export type SimpleStoreClosedEvent = CustomEvent<SimpleStoreEventClosedDetail>;
export type SimpleStoreDestroyedEvent = CustomEvent<SimpleStoreEventDestroyedDetail>;
export type SimpleStoreInitialisedEvent = CustomEvent<SimpleStoreEventInitialisedDetail>;
export type SimpleStoreOpenedEvent = CustomEvent<SimpleStoreEventOpenedDetail>;
export type SimpleStoreEvent =
    | SimpleStoreClosedEvent
    | SimpleStoreDestroyedEvent
    | SimpleStoreInitialisedEvent
    | SimpleStoreOpenedEvent;

export type SimpleStoreEventListener =
    | ((ev: SimpleStoreClosedEvent) => void)
    | ((ev: SimpleStoreDestroyedEvent) => void)
    | ((ev: SimpleStoreInitialisedEvent) => void)
    | ((ev: SimpleStoreOpenedEvent) => void);
