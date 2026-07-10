import { promiseWithResolvers } from "../promises.ts";

/**
 * ConnectorFunc
 * @remarks
 * ConnectorFunc is a function that takes a set of arguments and returns a promise.
 * It is used to connect a function to a name, and then invoke that function later.
 * @param T the type of the arguments
 * @param U the type of the return value
 * @returns a promise that resolves to the return value of the function
 */
export type ConnectorFunc<T extends any[], U> = (...args: T) => U;
export type ConnectorWrappedFunc<T extends any[], U> = (...args: T) => U | Promise<Awaited<U>>;
/**
 * ConnectorInstance
 * @remarks
 * ConnectorInstance is a type that represents an instance of a class.
 * It is used to connect an instance to a name, and then retrieve that instance later.
 * @param T the type of the instance
 */
export type ConnectorInstance<T> = T;
/**
 * ConnectorFuncOf
 * @remarks
 * Connect and invoke a function via connector.
 * It is used to connect a function to a name, and then invoke that function later.
 * @param T the type of the arguments
 * @param U the type of the return value
 */
export interface ConnectorFuncOf<T extends any[], U> {
    /**
     * Connect a function to the connector
     * @remarks
     * @param func The function to connect
     * @param teardown Optional callback to be called when the function is disconnected
     */
    connect(func: ConnectorFunc<T, U>, teardown?: () => void): void;
    /**
     * Invoke the connected function
     * @remarks If no function is connected yet, this will wait for the function to be connected and then invoke it.
     * @param args The arguments to pass to the function
     * @returns result of the function
     */
    invoke(...args: T): Promise<Awaited<U>>;
    /**
     * Invoke the connected function synchronously
     * @remarks If no function is connected yet, this will throw an error.
     * @param args The arguments to pass to the function
     * @returns result of the function
     */
    invokeSync(...args: T): U;
    /**
     * Disconnect the connected function
     * @remarks
     * This will remove the function from the connector and clear the connection.
     * @returns void
     */
    disconnect(): void;

    readonly isConnected: boolean;
}
/**
 * ConnectorInstanceOf
 * @remarks
 * Connect and get an instance via connector.
 * It is used to connect an instance to a name, and then retrieve that instance later.
 * @param T the type of the instance
 * @returns a promise that resolves to the instance
 */
export interface ConnectorInstanceOf<T> {
    /**
     * Connect an instance to the connector
     * @remarks
     * @param obj The instance to connect
     * @param teardown Optional callback to be called when the instance is disconnected
     */
    connect(obj: T, teardown?: () => void): void;
    /**
     * Get the connected instance
     * @remarks
     * @returns a promise that resolves to the connected instance
     */
    connected(): Promise<T>;
    /**
     * Get the connected instance synchronously
     * @remarks
     * @returns the connected instance
     * @throws Error if no instance is connected yet
     */
    connectedSync(): T;
    /**
     * Disconnect the connected instance
     * @remarks
     * This will remove the instance from the connector and clear the connection.
     * @returns void
     */
    disconnect(): void;
    readonly isConnected: boolean;
}

function getFuncOf<T extends any[], U>(name: string): ConnectorFuncOf<T, U> {
    let connectedFunction: ConnectorFunc<T, U> | undefined;
    let connectedFunctionTask = promiseWithResolvers<ConnectorFunc<T, U>>();
    let onDisconnect: (() => void) | undefined;
    const inst = {
        connect: (func: ConnectorFunc<T, U>, onDisconnectCallback?: () => void) => {
            if (connectedFunction) {
                inst.disconnect();
            }
            connectedFunctionTask.resolve(func);
            connectedFunction = func;
            onDisconnect = onDisconnectCallback;
        },
        invoke: async (...args: T): Promise<Awaited<U>> => {
            if (connectedFunction) {
                return await connectedFunction(...args);
            }
            const func = await connectedFunctionTask.promise;
            return await func(...args);
        },
        invokeSync: (...args: T): U => {
            if (!connectedFunction) {
                throw new Error(`Function not connected: ${name}`);
            }
            return connectedFunction(...args);
        },
        disconnect: () => {
            connectedFunction = undefined;
            connectedFunctionTask = promiseWithResolvers<ConnectorFunc<T, U>>();
            onDisconnect?.();
            onDisconnect = undefined;
        },
        get isConnected() {
            return connectedFunction !== undefined;
        },
    } satisfies ConnectorFuncOf<T, U>;
    return inst;
}

function getInstanceOf<T>(name: string): ConnectorInstanceOf<T> {
    let connectedInstance = promiseWithResolvers<ConnectorInstance<T>>();
    let instance: T | undefined = undefined;
    let onDisconnect: (() => void) | undefined;
    const inst = {
        connect: (obj: T, onDisconnectCallback?: () => void) => {
            if (instance) {
                inst.disconnect();
            }
            connectedInstance.resolve(obj);
            instance = obj;
            onDisconnect = onDisconnectCallback;
        },
        connected: async (): Promise<T> => {
            if (instance) {
                return instance;
            }
            return await connectedInstance.promise;
        },
        connectedSync: (): T => {
            if (!instance) {
                throw new Error(`Instance not connected: ${name}`);
            }
            return instance;
        },
        disconnect: () => {
            instance = undefined;
            connectedInstance = promiseWithResolvers<ConnectorInstance<T>>();
            onDisconnect?.();
            onDisconnect = undefined;
        },
        get isConnected() {
            return instance !== undefined;
        },
    } satisfies ConnectorInstanceOf<T>;
    return inst;
}

const connectedFunctionsOf = new Map<string, ConnectorFuncOf<any, any>>();
const connectedInstancesOf = new Map<string, ConnectorInstanceOf<any>>();

const weakFuncMap = new WeakMap<ConnectorFunc<any, any>, string>();
const weakInstanceMap = new WeakMap<ConnectorInstance<any>, string>();

/**
 * Get a function connector
 * @remarks
 * This method returns a function connector that allows you to connect a function to a name and then invoke that function later.
 * @param param A function to connect
 * @returns <ConnectorFuncOf<T, U>>
 */
function funcOf<T extends any[], U>(param: string | ConnectorFunc<T, U>): ConnectorFuncOf<T, U> {
    let name: string;
    if (typeof param === "function") {
        if (weakFuncMap.has(param)) {
            name = `func-${weakFuncMap.get(param)}`;
        } else {
            const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
            weakFuncMap.set(param, id);
            name = `func-${id}`;
        }
    } else {
        name = param;
    }

    if (connectedFunctionsOf.has(name)) {
        return connectedFunctionsOf.get(name) as ConnectorFuncOf<T, U>;
    }
    const func = getFuncOf<T, U>(name);
    connectedFunctionsOf.set(name, func);
    return func;
}
/**
 * Get a connector to instance by the name (internal function)
 * @param name The name of the instance (decided by each type of instance)
 * @remarks This function retrieves the connector instance associated with the given name.
 * @returns The connector instance associated with the name.
 */
function _instanceOf<T>(name: string) {
    if (connectedInstancesOf.has(name)) {
        return connectedInstancesOf.get(name) as ConnectorInstanceOf<T>;
    }
    const instance = getInstanceOf<T>(name);
    connectedInstancesOf.set(name, instance);
    return instance;
}

type _classType<T> = new (...args: any[]) => T;

/**
 * Get a class instance connector
 * @param classType The class type to connect
 * @returns The connector instance associated with the class instance.
 */
function classInstanceOf<T extends new (...args: any[]) => any>(classType: T): ConnectorInstanceOf<InstanceType<T>>;
/**
 *  Get a class instance connector by name
 * @remarks This function retrieves the connector instance associated with the given name.
 * @param name The name of the class type to connect
 * @returns The connector instance associated with the class type.
 */
function classInstanceOf<T extends _classType<any>>(name: string): ConnectorInstanceOf<InstanceType<T>>;
function classInstanceOf<T extends _classType<any>, N extends string = string>(
    classType: T | N
): ConnectorInstanceOf<InstanceType<T>> {
    if (typeof classType === "string") {
        return _instanceOf<InstanceType<T>>(classType);
    }
    let name: string;
    if (classType && typeof classType === "function" && classType.name) {
        name = classType.name;
    } else {
        throw new Error("Seems not a class type, please provide a class type or a name");
    }
    return _instanceOf<InstanceType<T>>(name);
}

function objectInstanceOf<T extends object>(instanceObject: T): ConnectorInstanceOf<T> {
    let name: string | undefined;
    if ("name" in instanceObject && typeof instanceObject.name === "string") {
        name = instanceObject.name;
    }
    if (!name) {
        if (weakInstanceMap.has(instanceObject)) {
            name = `instance-${weakInstanceMap.get(instanceObject)}`;
        } else {
            const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 15);
            weakInstanceMap.set(instanceObject, id);
            name = `instance-${id}`;
        }
    }
    return _instanceOf<T>(name);
}

/**
 * Get a connector to instance by the name
 * @remarks
 * This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.
 * @param name The name of the instance to connect.
 * @returns <ConnectorInstanceOf<T>>
 */
function instanceOf<T>(name: string): ConnectorInstanceOf<T>;
/**
 * Get a connector to instance by the instance object
 * @remarks
 * This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.
 * @template T The type of the instance
 * @param instanceObject The instance object to connect
 */
function instanceOf<T extends object>(instanceObject: T): ConnectorInstanceOf<T>;
function instanceOf<T extends object>(param: string | T): ConnectorInstanceOf<T> {
    if (typeof param === "string") {
        return _instanceOf<T>(param);
    }
    return objectInstanceOf(param);
}

/**
 * Connector
 * @remarks
 * Connector is a utility class that allows you to connect functions and instances.
 * It provides a way to connect a function or an instance to a name, and then invoke that function or instance later.
 */
export const Connector = {
    funcOf,
    instanceOf,
    classInstanceOf,
} as const;
