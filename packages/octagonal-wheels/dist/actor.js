const LogActorName = "LogActor";
/**
 * Represents a hub for managing actors.
 * @template T - The type of the message that can be dispatched to actors.
 */
class ActorHub {
    constructor() {
        /**
         * Represents a map of actors.
         * The key is a name of actors, and the value is an array of actors of type T.
         * Exposed for testing purposes. Do not use it directly.
         */
        Object.defineProperty(this, "_actorMap", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        /**
         * Represents a map of round-robin indexes for actors.
         * The key is a name of actors, and the value is an index of the actor in the array of actors of type T.
         * Exposed for testing purposes. Do not use it directly.
         */
        Object.defineProperty(this, "_actorRRIndex", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: new Map()
        });
        // super();
    }
    /**
     * Adds an actor to be managed by the hub.
     * This method is used internally by the Actor class, but it can be used if you are sure and want to make an original and custom actor.
     * @param actor - The actor to be added.
     */
    add(actor) {
        const name = actor.name;
        const actors = this._actorMap.get(name) ?? [];
        if (actor.multiInstance) {
            actors.push(actor);
        }
        else {
            if (actors.length > 0) {
                actors[0].destroy();
                this.dispatch(LogActorName, {
                    level: "warn",
                    message: `The instance of Actor ${name} has been replaced`,
                });
            }
            actors.length = 0;
            actors[0] = actor;
        }
        this._actorMap.set(name, actors);
    }
    remove(actor) {
        const name = actor.name;
        const actors = this._actorMap.get(name) ?? [];
        const index = actors.indexOf(actor);
        if (index >= 0) {
            actors.splice(index, 1);
        }
    }
    dispatch(actorName, message) {
        const actors = this._actorMap.get(actorName);
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
        }
        else {
            console.warn(`${actorName} -${LogActorName}`);
            if (actorName !== LogActorName) {
                this.dispatch(LogActorName, {
                    level: "error",
                    message: `The instance of Actor ${actorName} is not assigned to the hub`,
                });
            }
            else {
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
class Actor {
    /**
     * Initializes a new instance of the Actor class.
     * @param params - The parameters for the actor.
     * @param params.name - The name of the actor. It will be the class name if not provided.
     * @param params.multiInstance - Indicates whether the actor is a multi-instance. The default value is false. If true, the actor can have multiple instances to process each message concurrently.
     */
    constructor({ name, multiInstance } = {}) {
        /**
         * The name of the actor.
         */
        Object.defineProperty(this, "name", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /**
         * Indicates whether the actor is a multi-instance.
         */
        Object.defineProperty(this, "multiInstance", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_busy", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        // Promise chain to process messages sequentially. DO NOT USE IT. it is exposed for testing purposes.
        Object.defineProperty(this, "__process", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: Promise.resolve()
        });
        this.name = name || this.constructor.name;
        this.multiInstance = multiInstance ?? false;
        Actor.hub.add(this);
    }
    async _process(message) {
        // Internal method to pumping process a message
        this._busy = true;
        try {
            const w = this.process(message);
            if (w instanceof Promise) {
                await w;
            }
        }
        finally {
            this._busy = false;
        }
    }
    // Enqueue a message to be processed
    _enqueue(message) {
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
     * Dispatches a message to the actor.
     * Note: Even if we posted messages to the specific actor, the message will be processed by some actor instances if the actor is a multi-instance.
     * @param message - The message to be dispatched.
     */
    post(message) {
        Actor.hub.dispatch(this.name, message);
    }
    /**
     * Posts a message to this actor instance.
     *
     * @param message - The message to be posted.
     */
    postToThisInstance(message) {
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
    dispatch(actor, message) {
        Actor.hub.dispatch(actor.name, message);
    }
    /**
     * Destroys the actor instance.
     */
    destroy() {
        if (this.__process) {
            void this.__process.finally(() => (this.__process = undefined));
            this.__process = undefined;
        }
        Actor.hub.remove(this);
    }
}
/**
 * Represents the hub for actors.
 */
Object.defineProperty(Actor, "hub", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: new ActorHub()
});
class LogActorBase extends Actor {
    constructor() {
        // Make it never overridable in the derived class
        super({ name: `LogActor` });
    }
}

export { Actor, ActorHub, LogActorBase };
//# sourceMappingURL=actor.js.map
