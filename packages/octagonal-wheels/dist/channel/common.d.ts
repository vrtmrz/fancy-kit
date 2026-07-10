/**
 * Connecting Function Type
 */
export declare const MessageTypes: {
    readonly ADVERTISE: "advertise";
    readonly REQUEST_AD: "request_ad";
    readonly BYE: "bye";
    readonly REQUEST: "request";
    readonly RESPONSE: "response";
    readonly BROADCAST: "broadcast";
};
export type MessageTypes = (typeof MessageTypes)[keyof typeof MessageTypes];
export type AdvertiseMessage = {
    type: typeof MessageTypes.ADVERTISE;
    id: string;
    subId?: string;
};
export type RequestAdvertiseMessage = {
    type: typeof MessageTypes.REQUEST_AD;
    id: string;
    subId?: string;
};
export type ByeMessage = {
    type: typeof MessageTypes.BYE;
    id: string;
    subId?: string;
};
export type RequestMessage<T extends any[]> = {
    type: typeof MessageTypes.REQUEST;
    id: string;
    subId?: string;
    args: T;
};
export type ResponseMessage<U> = {
    type: typeof MessageTypes.RESPONSE;
    id: string;
    subId?: string;
    result?: Awaited<U>;
    error?: any;
};
export type BroadcastMessage<T extends any[]> = {
    type: typeof MessageTypes.BROADCAST;
    args: T;
};
export declare const DEFAULT_QUERY_TIMEOUT_MS = 5000;
export declare function generateId(): string;
