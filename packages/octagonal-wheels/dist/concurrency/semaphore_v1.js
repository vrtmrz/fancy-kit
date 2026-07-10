function makeUniqueString() {
    const randomStrSrc = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const temp = [...Array(30)]
        .map(() => Math.floor(Math.random() * randomStrSrc.length))
        .map((e) => randomStrSrc[e])
        .join("");
    return `${Date.now()}-${temp}`;
}
/**
 * Semaphore handling lib.
 * @param limit Maximum number that can be acquired.
 * @returns Instance of SemaphoreObject
 * @deprecated Use `semaphore_v2` instead.
 */
function Semaphore(limit, onRelease) {
    let _limit = limit;
    let currentProcesses = 0;
    let queue = [];
    /**
     * Semaphore processing pump
     */
    function execProcess() {
        //Delete already finished
        queue = queue.filter((e) => e.state != "DONE");
        // acquiring semaphore by order
        for (const queueItem of queue) {
            if (queueItem.state != "NONE")
                continue;
            if (queueItem.quantity + currentProcesses > _limit) {
                break;
            }
            queueItem.state = "RUNNING";
            currentProcesses += queueItem.quantity;
            if (queueItem?.timer) {
                clearTimeout(queueItem.timer);
            }
            queueItem.notify(true);
        }
    }
    /**
     * Mark DONE.
     * @param key
     */
    function release(key) {
        const finishedTask = queue.find((e) => e.key == key);
        if (!finishedTask) {
            throw new Error("Missing locked semaphore!");
        }
        if (finishedTask.state == "RUNNING") {
            currentProcesses -= finishedTask.quantity;
        }
        finishedTask.state = "DONE";
        if (onRelease)
            void onRelease(queue.filter((e) => e.state != "DONE"));
        execProcess();
    }
    return {
        setLimit(limit) {
            _limit = limit;
        },
        _acquire(quantity, memo, timeout) {
            const key = makeUniqueString();
            if (_limit < quantity) {
                throw Error("Too big quantity");
            }
            // function for notify
            // When we call this function, semaphore acquired by resolving promise.
            // (Or, notify acquiring is timed out.)
            let notify = (_) => { };
            const semaphoreStopper = new Promise((res) => {
                notify = (result) => {
                    if (result) {
                        res(() => {
                            release(key);
                        });
                    }
                    else {
                        res(false);
                    }
                };
            });
            const notifier = {
                key,
                notify,
                semaphoreStopper,
                quantity,
                memo,
                state: "NONE",
            };
            if (timeout)
                notifier.timer = setTimeout(() => {
                    // If acquiring is timed out, clear queue and notify failed.
                    release(key);
                    notify(false);
                }, timeout);
            // Push into the queue once.
            queue.push(notifier);
            //Execute loop
            execProcess();
            //returning Promise
            return semaphoreStopper;
        },
        acquire(quantity = 1, memo) {
            return this._acquire(quantity, memo ?? "", 0);
        },
        tryAcquire(quantity = 1, timeout = 1, memo) {
            return this._acquire(quantity, memo ?? "", timeout);
        },
        peekQueues() {
            return queue;
        },
    };
}

export { Semaphore };
//# sourceMappingURL=semaphore_v1.js.map
