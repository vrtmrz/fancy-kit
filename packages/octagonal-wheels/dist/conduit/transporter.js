import { Logger, LOG_LEVEL_INFO, LOG_LEVEL_VERBOSE } from '../common/logger.js';
import { promiseWithResolvers } from '../promises.js';
import { NamedInstance } from './NamedInstance.js';
import { PostMessageBackbone } from './transporterAdapter.js';

/**
 * Transporter is a utility for creating a communication channel between different parts of an application.
 * @param emitter An EventTarget that is used to dispatch and listen for events.
 * @param name The name of the transporter, used for event naming and logging.
 * @returns A tuple containing a function to send messages and a function to set a callee that will handle incoming messages.
 * @remarks This utility enables straightforward communication between different parts of an application by adopting an event-driven approach.
 * It generates a unique callback ID for each message sent, allowing the sender to receive a response or handle errors.
 * It also allows setting a callee function that is invoked when a message is received, enabling the receiver to process the message and send a response in return.
 * Note: Arguments and results must be serialisable; non-serialisable values cannot be used.
 *
 * @example
 * // On the receiver side:
 * const [, onFetched] = _createTransporter<[string], string>(window, "fetchData");
 * onFetched(async (id) => {
 *   // Handle the fetch request
 *   return "data";
 * });
 * // On another part of the application, we can now use `fetch()` to send a request and receive a response.
 * const [fetch, ] = _createTransporter<[string], string>(window, "fetchData");
 * const data = await fetch("some-id");
 */
let transporterCount = 0;
function _createTransporter(emitter, name, forceTransportNo) {
    if (forceTransportNo && forceTransportNo <= transporterCount) {
        Logger(`Transporter number ${forceTransportNo} is less than the current transporter count ${transporterCount}. Using a new transporter number.`, LOG_LEVEL_INFO);
        forceTransportNo = undefined; // Reset to undefined to ensure a new transporter number is used.
    }
    const transporterNo = forceTransportNo ?? ++transporterCount;
    transporterCount = transporterNo; // Ensure unique transporter number
    let callbackCount = 0;
    const _emitter = emitter;
    const _name = name;
    const _instanceName = `${_name}.${transporterNo}`;
    const messages = new Map();
    const methodInvocationIdentifier = `${_name}.invoke`;
    const notifyIdentifier = `${_name}.notify`;
    let releaseInvocationHandler;
    const callback = (event) => {
        const { callback, result, error } = event;
        /* istanbul ignore if -- @preserve : it only occurred when too much consumed the call back, However, thanks for volatile event ID,
        It should not be happened */
        if (!messages.has(callback)) {
            Logger(`Callback ${callback} not found in messages for transporter ${_name}.`, LOG_LEVEL_INFO);
            return;
        }
        const p = messages.get(callback);
        messages.delete(callback);
        if (error) {
            p.reject(error);
        }
        else {
            p.resolve(result);
        }
    };
    const send = (...args) => {
        const callbackId = `${_name}.${transporterNo}.${++callbackCount}`;
        const task = promiseWithResolvers();
        messages.set(callbackId, task);
        const detail = {
            callback: callbackId,
            args,
        };
        const ac = new AbortController();
        _emitter.setListener(callbackId, (event) => callback(event), {
            once: true,
            signal: ac.signal,
        });
        _emitter.dispatchMessage(methodInvocationIdentifier, detail);
        return task.promise;
    };
    let _onInvoked;
    function onInvokedEvent(payload) {
        if (!payload || !payload.callback) {
            Logger(`Invalid event for transporter: ${_name}`, LOG_LEVEL_INFO);
            return;
        }
        const { callback, args } = payload;
        if (_onInvoked) {
            _onInvoked(...args)
                .then((result) => {
                _emitter.dispatchMessage(callback, { callback, result });
            })
                .catch((error) => {
                _emitter.dispatchMessage(callback, { callback, error });
            });
        }
    }
    let alreadyListening = false;
    function notifyInformation(payload) {
        _emitter.dispatchMessage(notifyIdentifier, payload);
    }
    function activate() {
        if (!alreadyListening) {
            alreadyListening = true;
            releaseInvocationHandler = _emitter.setListener(methodInvocationIdentifier, onInvokedEvent);
            // Logger(`Transporter ${_name} activated and listening for method invocations.`, LOG_LEVEL_VERBOSE);
            notifyInformation({
                type: "activated",
                instanceName: _instanceName,
            });
            Logger(`[activated] instance ${_instanceName} of transporter ${_name} activated and listening for method invocations.`, LOG_LEVEL_VERBOSE);
        }
        // else {
        //     // Logger(`[*active* ] instance ${_instanceName} of transporter ${_name} is already activated and listening for method invocations.`, LOG_LEVEL_VERBOSE);
        // }
    }
    function deactivate() {
        if (alreadyListening) {
            alreadyListening = false;
            if (releaseInvocationHandler) {
                releaseInvocationHandler();
                releaseInvocationHandler = undefined;
            }
            notifyInformation({
                type: "deactivated",
                instanceName: _instanceName,
            });
            Logger(`[Deactivated ] instance ${_instanceName} of transporter ${_name} deactivated and stopped listening for method invocations.`, LOG_LEVEL_VERBOSE);
        }
        //  else {
        //     // Logger(`[*deactivated*] instance ${_instanceName} of transporter ${_name} is already deactivated and not listening for method invocations.`, LOG_LEVEL_VERBOSE);
        // }
    }
    function setOnInvoked(callee) {
        if (_onInvoked && callee && _onInvoked !== callee) {
            Logger(`Overriding existing callee for ${_name}.invoke`, LOG_LEVEL_VERBOSE);
        }
        if (_onInvoked === callee) {
            Logger(`Callee for ${_name}.invoke is already set to the same function.`, LOG_LEVEL_VERBOSE);
            return;
        }
        _onInvoked = callee;
        if (_onInvoked) {
            activate();
        }
        else {
            deactivate();
        }
    }
    const onNotify = (notification) => {
        const { type, instanceName } = notification;
        if (instanceName === _instanceName) {
            // TODO: Make configurable
            // This instance is the one that sent the notification, so we can ignore it.
            if (type === "activate") {
                Logger(`Received activation request for instance ${instanceName} -> ${_instanceName}`, LOG_LEVEL_VERBOSE);
                activate();
                return;
            }
            return;
        }
        // If some other instance is activated, this instance should deactivate.
        if (type === "activated") {
            Logger(`Received activated notification of type "${type}" for instance ${instanceName} -> ${_instanceName}`, LOG_LEVEL_VERBOSE);
            deactivate();
        }
        else {
            Logger(`No action taken for notification of type "${type}" for instance ${instanceName} -> ${_instanceName}`, LOG_LEVEL_VERBOSE);
        }
    };
    // Ready to receive notifications about activation and deactivation
    _emitter.setListener(notifyIdentifier, onNotify);
    const controller = {
        get instanceName() {
            return _instanceName;
        },
        activate: () => {
            Logger(`Activating transporter ${_name} instance ${_instanceName}`, LOG_LEVEL_VERBOSE);
            activate();
        },
        deactivate: () => {
            Logger(`Deactivating transporter ${_name} instance ${_instanceName} `, LOG_LEVEL_VERBOSE);
            deactivate();
        },
        dispatchCommand: (type, instanceName) => {
            notifyInformation({
                type,
                instanceName: instanceName,
            });
        },
    };
    return [
        send,
        (callee) => {
            setOnInvoked(callee);
            return () => {
                _emitter.removeListener(notifyIdentifier, onNotify);
                setOnInvoked(undefined);
            };
        },
        controller,
    ];
}
const Transporters = new NamedInstance("Transporters", (name) => {
    // const emitter = new EventTarget();
    const channel = new MessageChannel();
    channel.port1.start();
    channel.port2.start();
    return _createTransporter(new PostMessageBackbone(channel.port1, channel.port2), name);
});
const GlobalTransporters = new NamedInstance("GlobalTransporters", (name) => {
    const emitter = globalThis;
    return _createTransporter(new PostMessageBackbone(emitter), name);
});

export { GlobalTransporters, Transporters, _createTransporter };
//# sourceMappingURL=transporter.js.map
