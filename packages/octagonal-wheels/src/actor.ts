const LogActorName = "LogActor";
export type ActorLogMessage = {
    level?: "info" | "warn" | "error" | "verbose";
    message: string;
};

/**
 * Represents a hub for managing actors.
 * @template T - The type of the message that can be dispatched to actors.
 */
export class ActorHub<T> {
    constructor() {
        // super();
    }

    /**
     * Represents a map of actors.
     * The key is a name of actors, and the value is an array of actors of type T.
     * Exposed for testing purposes. Do not use it directly.
     */
    _actorMap: Map<string, Actor<T>[]> = new Map();

    /**
     * Represents a map of round-robin indexes for actors.
     * The key is a name of actors, and the value is an index of the actor in the array of actors of type T.
     * Exposed for testing purposes. Do not use it directly.
     */
    _actorRRIndex: Map<string, number> = new Map();

    /**
     * Adds an actor to be managed by the hub.
     * This method is used internally by the Actor class, but it can be used if you are sure and want to make an original and custom actor.
     * @param actor - The actor to be added.
     */
    add(actor: Actor<T>) {
        const name = actor.name;
        const actors = this._actorMap.get(name) ?? [];
        if (actor.multiInstance) {
            actors.push(actor);
        } else {
            if (actors.length > 0) {
                actors[0].destroy();
                this.dispatch(LogActorName, {
                    level: "warn",
                    message: `The instance of Actor ${name} has been replaced`,
                } as unknown as T);
            }
            actors.length = 0;
            actors[0] = actor;
        }
        this._actorMap.set(name, actors);
    }

    remove(actor: Actor<T>) {
        const name = actor.name;
        const actors = this._actorMap.get(name) ?? [];
        const index = actors.indexOf(actor);
        if (index >= 0) {
            actors.splice(index, 1);
        }
    }

    dispatch(actorName: string, message: T) {
        const actors = this._actorMap.get(actorName) as Actor<T>[];
        if (actors && actors.length > 0) {
            let index = 0;
            if (actors.length > 1) {
                index = this._actorRRIndex.get(actorName) ?? 0;
                index++;
                index %= actors.length;
                this._actorRRIndex.set(actorName, index);
                // Round robin
            }
            actors[index]._enqueue(message);
        } else {
            console.warn(`${actorName} -${LogActorName}`);
            if (actorName !== LogActorName) {
                this.dispatch(LogActorName, {
                    level: "error",
                    message: `The instance of Actor ${actorName} is not assigned to the hub`,
                } as unknown as T);
            } else {
                // Prevent infinite loop, but it should not happen. This will not be tested deeply.
                console.error(`${LogActorName} is not assigned but dispatched to itself`);
            }
        }
    }
}

/**
 * Represents an abstract class for an actor.
 * @template T - The type of the message that the actor can process.
 */
export abstract class Actor<T> {
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
    static hub: ActorHub<any> = new ActorHub();

    /**
     * Initializes a new instance of the Actor class.
     * @param params - The parameters for the actor.
     * @param params.name - The name of the actor. It will be the class name if not provided.
     * @param params.multiInstance - Indicates whether the actor is a multi-instance. The default value is false. If true, the actor can have multiple instances to process each message concurrently.
     */
    constructor({ name, multiInstance }: { name?: string; multiInstance?: boolean } = {}) {
        this.name = name || this.constructor.name;
        this.multiInstance = multiInstance ?? false;
        Actor.hub.add(this);
    }

    _busy: boolean = false;
    async _process(message: T) {
        // Internal method to pumping process a message
        this._busy = true;
        try {
            const w = this.process(message);
            if (w instanceof Promise) {
                await w;
            }
        } finally {
            this._busy = false;
        }
    }

    // Promise chain to process messages sequentially. DO NOT USE IT. it is exposed for testing purposes.
    __process: Promise<void> | undefined = Promise.resolve();

    // Enqueue a message to be processed
    _enqueue(message: T) {
        if (this.__process === undefined) {
            throw new Error("The actor has been destroyed");
        }
        // We use a promise chain to ensure that messages are processed sequentially.
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        this.__process = this.__process.finally(() => {
            return this._process(message);
        });
    }

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
    post(message: T) {
        Actor.hub.dispatch(this.name, message);
    }

    /**
     * Posts a message to this actor instance.
     *
     * @param message - The message to be posted.
     */
    postToThisInstance(message: T) {
        this._enqueue(message);
    }

    /**
     * Dispatches a message to the specified actor.
     * Utility method to dispatch a message to the actor, which is the subsequent actor of the current actor.
     * Just for hiding the hub from the derived class.
     * @template U - The type of the message.
     * @template V - The type of the actor.
     * @param actor - The actor to dispatch the message to.
     * @param message - The message to be dispatched.
     */
    dispatch<U, V extends U>(actor: typeof Actor<V>, message: U) {
        Actor.hub.dispatch(actor.name, message);
    }

    /**
     * Destroys the actor instance.
     */
    destroy() {
        if (this.__process) {
            void this.__process.finally(() => (this.__process = undefined as any));
            this.__process = undefined;
        }
        Actor.hub.remove(this);
    }
}

export abstract class LogActorBase extends Actor<ActorLogMessage> {
    constructor() {
        // Make it never overridable in the derived class
        super({ name: `LogActor` });
    }
}
