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
/**
 * Get a function connector
 * @remarks
 * This method returns a function connector that allows you to connect a function to a name and then invoke that function later.
 * @param param A function to connect
 * @returns <ConnectorFuncOf<T, U>>
 */
declare function funcOf<T extends any[], U>(param: string | ConnectorFunc<T, U>): ConnectorFuncOf<T, U>;
type _classType<T> = new (...args: any[]) => T;
/**
 * Get a class instance connector
 * @param classType The class type to connect
 * @returns The connector instance associated with the class instance.
 */
declare function classInstanceOf<T extends new (...args: any[]) => any>(classType: T): ConnectorInstanceOf<InstanceType<T>>;
/**
 *  Get a class instance connector by name
 * @remarks This function retrieves the connector instance associated with the given name.
 * @param name The name of the class type to connect
 * @returns The connector instance associated with the class type.
 */
declare function classInstanceOf<T extends _classType<any>>(name: string): ConnectorInstanceOf<InstanceType<T>>;
/**
 * Get a connector to instance by the name
 * @remarks
 * This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.
 * @param name The name of the instance to connect.
 * @returns <ConnectorInstanceOf<T>>
 */
declare function instanceOf<T>(name: string): ConnectorInstanceOf<T>;
/**
 * Get a connector to instance by the instance object
 * @remarks
 * This method returns a instance connector that allows you to connect a instance to a name and then retrieve that instance later.
 * @template T The type of the instance
 * @param instanceObject The instance object to connect
 */
declare function instanceOf<T extends object>(instanceObject: T): ConnectorInstanceOf<T>;
/**
 * Connector
 * @remarks
 * Connector is a utility class that allows you to connect functions and instances.
 * It provides a way to connect a function or an instance to a name, and then invoke that function or instance later.
 */
export declare const Connector: {
    readonly funcOf: typeof funcOf;
    readonly instanceOf: typeof instanceOf;
    readonly classInstanceOf: typeof classInstanceOf;
};
export {};
