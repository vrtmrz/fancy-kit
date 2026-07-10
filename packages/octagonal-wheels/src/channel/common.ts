/**
 * Connecting Function Type
 */

export const MessageTypes = {
    ADVERTISE: "advertise",
    REQUEST_AD: "request_ad",
    BYE: "bye",
    REQUEST: "request",
    RESPONSE: "response",
    BROADCAST: "broadcast",
} as const;

export type MessageTypes = (typeof MessageTypes)[keyof typeof MessageTypes];

export type AdvertiseMessage = { type: typeof MessageTypes.ADVERTISE; id: string; subId?: string };
export type RequestAdvertiseMessage = { type: typeof MessageTypes.REQUEST_AD; id: string; subId?: string };
export type ByeMessage = { type: typeof MessageTypes.BYE; id: string; subId?: string };

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
export type BroadcastMessage<T extends any[]> = { type: typeof MessageTypes.BROADCAST; args: T };

export const DEFAULT_QUERY_TIMEOUT_MS = 5000;

const threadUniquePrefix = Math.random().toString(36).substring(2, 11);
let idCounter = 0;
export function generateId() {
    return `${threadUniquePrefix}-${(++idCounter).toString(36)}`;
}
