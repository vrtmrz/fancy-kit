/**
 * Connecting Function Type
 */
const MessageTypes = {
    ADVERTISE: "advertise",
    REQUEST_AD: "request_ad",
    BYE: "bye",
    REQUEST: "request",
    RESPONSE: "response",
    BROADCAST: "broadcast",
};
const DEFAULT_QUERY_TIMEOUT_MS = 5000;
const threadUniquePrefix = Math.random().toString(36).substring(2, 11);
let idCounter = 0;
function generateId() {
    return `${threadUniquePrefix}-${(++idCounter).toString(36)}`;
}

export { DEFAULT_QUERY_TIMEOUT_MS, MessageTypes, generateId };
//# sourceMappingURL=common.js.map
