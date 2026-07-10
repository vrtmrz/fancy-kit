import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';

var TransportResult;
(function (TransportResult) {
    TransportResult[TransportResult["SUCCESS"] = 0] = "SUCCESS";
    TransportResult[TransportResult["FAILURE"] = 1] = "FAILURE";
    TransportResult[TransportResult["NO_OP"] = 99] = "NO_OP";
})(TransportResult || (TransportResult = {}));
const protocolVersion = 1;
const transporterKey = `transporterAdapter.v${protocolVersion}`;
// const DefaultTransferOrigin = "https://vrtmrz.net/octagonal-wheels/conduit";
/**
 * PostMessageBackbone is a TransporterBackbone implementation that uses the postMessage API to send and receive messages.
 * It can be used with MessageChannel, Window, Worker, or any other target that supports postMessage.
 * Note that this backbone is dedicated one to be assigned to a single transporter.
 * Please share the `MessageChannel` or `Worker` instance between multiple transporters
 * if you want to communicate with multiple transporters.
 */
class PostMessageBackbone {
    constructor(receiver, transmitter) {
        Object.defineProperty(this, "_rx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_tx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        }); // In this case, we assume the same target for receiving and sending messages.
        Object.defineProperty(this, "_abortController", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new AbortController()
        });
        // Map to hold message handlers for different message types.
        // Keep in mind that multiple handlers cannot be assigned to the same type.
        // If you want to have multiple handlers for the same type, please wrap functions in a single handler or use `Manifold` to handle multiple handlers.
        // And, if you want to wait to the connection, please use `Connector` to wait for the connection to be established.
        Object.defineProperty(this, "_messageHandler", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        // Map to hold one-time message handlers for different message types.
        Object.defineProperty(this, "_onceSet", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        if (receiver instanceof MessageChannel) {
            // If a MessageChannel is provided, use its ports as the receiver and transmitter.
            this._tx = receiver.port1;
            this._rx = receiver.port2;
            this._tx.start();
            this._rx.start();
        }
        else {
            // If receiver and transmitter are provided, use them directly.
            this._rx = receiver;
            // If no transmitter is provided, use the receiver as the transmitter.
            // e.g., using inside a Worker or Window context. (Window can both send and receive messages)
            this._tx = transmitter || receiver;
        }
        this._onMessageOnTarget = this._onMessageOnTarget.bind(this);
        this._rx.addEventListener("message", this._onMessageOnTarget, {
            signal: this._abortController.signal,
        });
    }
    _onMessageOnTarget(event) {
        // On event received, we check if the abort signal has been triggered.
        // (Note that this happen so rarely, Because we aborted after removing handler)
        if (this._abortController.signal.aborted) {
            // If the abort signal is triggered, we ignore the message.
            Logger("TransporterAdapterPostMessage: Target aborted, ignoring message.", LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }
        const { data } = event;
        if (!data || !data.payload || !data.key) {
            // Logger(`TransporterAdapterPostMessage: Received a message without payload or key, ignoring.`, LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }
        const { type, payload, key } = data;
        if (key !== transporterKey) {
            // This is not a message for this transporter, ignore it.
            return TransportResult.NO_OP;
        }
        const handler = this._messageHandler.get(type);
        if (!handler) {
            // Logger(`TransporterAdapterPostMessage: No handlers registered for message type: ${type}`, LOG_LEVEL_VERBOSE);
            return TransportResult.NO_OP;
        }
        // console.log(`Handling message of type ${type} with payload:`, payload);
        try {
            handler(payload);
        }
        catch (error) {
            Logger(`Error handling message of type ${type}:`, LOG_LEVEL_VERBOSE);
            Logger(error, LOG_LEVEL_VERBOSE);
            // throw new Error(`TransporterAdapterPostMessage: Error handling message of type ${type}: ${error instanceof Error ? error.message : `${error}`}`);
        }
        finally {
            // If the handler is a one-time handler, remove it after handling the message.
            if (this._onceSet.has(type) && this._onceSet.get(type).has(handler)) {
                this._onceSet.get(type)?.delete(handler);
                this.removeListener(type, handler);
            }
        }
        event.stopPropagation();
        event.preventDefault();
        return TransportResult.SUCCESS;
    }
    /**
     * Registers a callback to be called when a message is received.
     * @param callback The function to call when a message is received.
     * @returns A function that can be called to remove the listener.
     */
    setListener(type, callback, opt = {}) {
        // console.log(`Setting listener for type: ${type}`);
        this._messageHandler.set(type, callback);
        if (opt.once) {
            const onceSet = this._onceSet.get(type) || new WeakSet();
            onceSet.add(callback);
            this._onceSet.set(type, onceSet);
        }
        if (opt.signal) {
            opt.signal.addEventListener("abort", () => {
                this.removeListener(type, callback);
            });
        }
        return () => {
            this.removeListener(type, callback);
            return this;
        };
    }
    removeListener(type, callback) {
        if (this._messageHandler.get(type) === callback) {
            this._messageHandler.delete(type);
            if (this._onceSet.has(type)) {
                this._onceSet.get(type)?.delete(callback);
            }
        }
        // else {
        //     // Possibly not needed, but useful for debugging
        //     // console.warn(`TransporterAdapterPostMessage: No handler registered for type: ${type}`);
        // }
    }
    dispatchMessage(type, message) {
        try {
            this._tx.postMessage({ type, payload: message, key: transporterKey }, {
            // targetOrigin: "*"
            });
        }
        catch (error) {
            Logger(`Error dispatching message of type ${type}:`, LOG_LEVEL_VERBOSE);
            Logger(error, LOG_LEVEL_VERBOSE);
        }
    }
    close() {
        this._rx.removeEventListener("message", this._onMessageOnTarget);
        this._abortController.abort();
        this._messageHandler.clear();
    }
}

export { PostMessageBackbone, transporterKey };
//# sourceMappingURL=transporterAdapter.js.map
