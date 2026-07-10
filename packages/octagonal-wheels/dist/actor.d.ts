export type ActorLogMessage = {
    level?: "info" | "warn" | "error" | "verbose";
    message: string;
};
/**
 * Represents a hub for managing actors.
 * @template T - The type of the message that can be dispatched to actors.
 */
export declare class ActorHub<T> {
    constructor();
    /**
     * Represents a map of actors.
     * The key is a name of actors, and the value is an array of actors of type T.
     * Exposed for testing purposes. Do not use it directly.
     */
    _actorMap: Map<string, Actor<T>[]>;
    /**
     * Represents a map of round-robin indexes for actors.
     * The key is a name of actors, and the value is an index of the actor in the array of actors of type T.
     * Exposed for testing purposes. Do not use it directly.
     */
    _actorRRIndex: Map<string, number>;
    /**
     * Adds an actor to be managed by the hub.
     * This method is used internally by the Actor class, but it can be used if you are sure and want to make an original and custom actor.
     * @param actor - The actor to be added.
     */
    add(actor: Actor<T>): void;
    remove(actor: Actor<T>): void;
    dispatch(actorName: string, message: T): void;
}
/**
 * Represents an abstract class for an actor.
 * @template T - The type of the message that the actor can process.
 */
export declare abstract class Actor<T> {
    /**
     * The name of the actor.
     */
    readonly name: string;
    /**
     * Indicates whether the actor is a multi-instance.
     */
    readonly multiInstance: boolean;
    /**
     * Represents the hub for actors.
     */
    static hub: ActorHub<any>;
    /**
     * Initializes a new instance of the Actor class.
     * @param params - The parameters for the actor.
     * @param params.name - The name of the actor. It will be the class name if not provided.
     * @param params.multiInstance - Indicates whether the actor is a multi-instance. The default value is false. If true, the actor can have multiple instances to process each message concurrently.
     */
    constructor({ name, multiInstance }?: {
        name?: string;
        multiInstance?: boolean;
    });
    _busy: boolean;
    _process(message: T): Promise<void>;
    __process: Promise<void> | undefined;
    _enqueue(message: T): void;
    /**
     * Processes a message. This method should be overridden in the derived class. Automatically called when a message is dispatched to the actor.
     * @param message - The message to be processed.
     */
    abstract process(message: T): Promise<void> | void;
    /**
     * Dispatches a message to the actor.
     * Note: Even if we posted messages to the specific actor, the message will be processed by some actor instances if the actor is a multi-instance.
     * @param message - The message to be dispatched.
     */
    post(message: T): void;
    /**
     * Posts a message to this actor instance.
     *
     * @param message - The message to be posted.
     */
    postToThisInstance(message: T): void;
    /**
     * Dispatches a message to the specified actor.
     * Utility method to dispatch a message to the actor, which is the subsequent actor of the current actor.
     * Just for hiding the hub from the derived class.
     * @template U - The type of the message.
     * @template V - The type of the actor.
     * @param actor - The actor to dispatch the message to.
     * @param message - The message to be dispatched.
     */
    dispatch<U, V extends U>(actor: typeof Actor<V>, message: U): void;
    /**
     * Destroys the actor instance.
     */
    destroy(): void;
}
export declare abstract class LogActorBase extends Actor<ActorLogMessage> {
    constructor();
}
