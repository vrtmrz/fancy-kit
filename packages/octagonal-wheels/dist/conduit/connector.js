import { promiseWithResolvers } from '../promises.js';

function getFuncOf(name) {
    let connectedFunction;
    let connectedFunctionTask = promiseWithResolvers();
    let onDisconnect;
    const inst = {
        connect: (func, onDisconnectCallback) => {
            if (connectedFunction) {
                inst.disconnect();
            }
            connectedFunctionTask.resolve(func);
            connectedFunction = func;
            onDisconnect = onDisconnectCallback;
        },
        invoke: async (...args) => {
            if (connectedFunction) {
                return await connectedFunction(...args);
            }
            const func = await connectedFunctionTask.promise;
            return await func(...args);
        },
        invokeSync: (...args) => {
            if (!connectedFunction) {
                throw new Error(`Function not connected: ${name}`);
            }
            return connectedFunction(...args);
        },
        disconnect: () => {
            connectedFunction = undefined;
            connectedFunctionTask = promiseWithResolvers();
            onDisconnect?.();
            onDisconnect = undefined;
        },
        get isConnected() {
            return connectedFunction !== undefined;
        },
    };
    return inst;
}
function getInstanceOf(name) {
    let connectedInstance = promiseWithResolvers();
    let instance = undefined;
    let onDisconnect;
    const inst = {
        connect: (obj, onDisconnectCallback) => {
            if (instance) {
                inst.disconnect();
            }
            connectedInstance.resolve(obj);
            instance = obj;
            onDisconnect = onDisconnectCallback;
        },
        connected: async () => {
            if (instance) {
                return instance;
            }
            return await connectedInstance.promise;
        },
        connectedSync: () => {
            if (!instance) {
                throw new Error(`Instance not connected: ${name}`);
            }
            return instance;
        },
        disconnect: () => {
            instance = undefined;
            connectedInstance = promiseWithResolvers();
            onDisconnect?.();
            onDisconnect = undefined;
        },
        get isConnected() {
            return instance !== undefined;
        },
    };
    return inst;
}
const connectedFunctionsOf = new Map();
const connectedInstancesOf = new Map();
const weakFuncMap = new WeakMap();
const weakInstanceMap = new WeakMap();
/**
 * Get a function connector
 * @remarks
 * This method returns a function connector that allows you to connect a function to a name and then invoke that function later.
 * @param param A function to connect
 * @returns <ConnectorFuncOf<T, U>>
 */
function funcOf(param) {
    let name;
    if (typeof param === "function") {
        if (weakFuncMap.has(param)) {
            name = `func-${weakFuncMap.get(param)}`;
        }
        else {
            const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
            weakFuncMap.set(param, id);
            name = `func-${id}`;
        }
    }
    else {
        name = param;
    }
    if (connectedFunctionsOf.has(name)) {
        return connectedFunctionsOf.get(name);
    }
    const func = getFuncOf(name);
    connectedFunctionsOf.set(name, func);
    return func;
}
/**
 * Get a connector to instance by the name (internal function)
 * @param name The name of the instance (decided by each type of instance)
 * @remarks This function retrieves the connector instance associated with the given name.
 * @returns The connector instance associated with the name.
 */
function _instanceOf(name) {
    if (connectedInstancesOf.has(name)) {
        return connectedInstancesOf.get(name);
    }
    const instance = getInstanceOf(name);
    connectedInstancesOf.set(name, instance);
    return instance;
}
function classInstanceOf(classType) {
    if (typeof classType === "string") {
        return _instanceOf(classType);
    }
    let name;
    if (classType && typeof classType === "function" && classType.name) {
        name = classType.name;
    }
    else {
        throw new Error("Seems not a class type, please provide a class type or a name");
    }
    return _instanceOf(name);
}
function objectInstanceOf(instanceObject) {
    let name;
    if ("name" in instanceObject && typeof instanceObject.name === "string") {
        name = instanceObject.name;
    }
    if (!name) {
        if (weakInstanceMap.has(instanceObject)) {
            name = `instance-${weakInstanceMap.get(instanceObject)}`;
        }
        else {
            const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
            weakInstanceMap.set(instanceObject, id);
            name = `instance-${id}`;
        }
    }
    return _instanceOf(name);
}
function instanceOf(param) {
    if (typeof param === "string") {
        return _instanceOf(param);
    }
    return objectInstanceOf(param);
}
/**
 * Connector
 * @remarks
 * Connector is a utility class that allows you to connect functions and instances.
 * It provides a way to connect a function or an instance to a name, and then invoke that function or instance later.
 */
const Connector = {
    funcOf,
    instanceOf,
    classInstanceOf,
};

export { Connector };
//# sourceMappingURL=connector.js.map
