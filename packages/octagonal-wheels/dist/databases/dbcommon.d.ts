import { LSError } from "../common/error";
export declare const DATABASE_DESTROYED_ERROR = "Database not initialized or already destroyed";
export declare class DatabaseError extends LSError {
    name: string;
}
export declare class DatabaseTransactionError extends DatabaseError {
    name: string;
}
export declare class DatabaseTransactionAbortError extends DatabaseTransactionError {
    name: string;
    abortedError?: Error;
    setAbortedError(err: Error): void;
}
export declare class ErrorDatabaseDestroyed extends DatabaseError {
    name: string;
}
export declare function buildIDBRange(from: string | undefined, to: string | undefined): IDBKeyRange | undefined;
export declare const SIMPLE_STORE_EVENT_TYPES: {
    readonly CLOSED: "closed";
    readonly DESTROYED: "destroyed";
    readonly INITIALISED: "initialised";
    readonly OPENED: "opened";
};
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
export type SimpleStoreEventParams = SimpleStoreEventCloseParams | SimpleStoreEventDestroyParams | SimpleStoreEventInitialiseParams;
export type SimpleStoreEventClosedDetail = SimpleStoreEventDetailBase & SimpleStoreEventCloseParams;
export type SimpleStoreEventDestroyedDetail = SimpleStoreEventDetailBase & SimpleStoreEventDestroyParams;
export type SimpleStoreEventInitialisedDetail = SimpleStoreEventDetailBase & SimpleStoreEventInitialiseParams;
export type SimpleStoreEventOpenedDetail = SimpleStoreEventDetailBase & SimpleStoreEventOpenedParams;
export type SimpleStoreClosedEvent = CustomEvent<SimpleStoreEventClosedDetail>;
export type SimpleStoreDestroyedEvent = CustomEvent<SimpleStoreEventDestroyedDetail>;
export type SimpleStoreInitialisedEvent = CustomEvent<SimpleStoreEventInitialisedDetail>;
export type SimpleStoreOpenedEvent = CustomEvent<SimpleStoreEventOpenedDetail>;
export type SimpleStoreEvent = SimpleStoreClosedEvent | SimpleStoreDestroyedEvent | SimpleStoreInitialisedEvent | SimpleStoreOpenedEvent;
export type SimpleStoreEventListener = ((ev: SimpleStoreClosedEvent) => void) | ((ev: SimpleStoreDestroyedEvent) => void) | ((ev: SimpleStoreInitialisedEvent) => void) | ((ev: SimpleStoreOpenedEvent) => void);
