import { PaceMaker } from '../bureau/PaceMaker.js';
import { InboxWithEvent, NOT_AVAILABLE } from '../bureau/Inbox.js';
import { Porter, Feeder } from '../bureau/Clerk.js';
import { promiseWithResolvers } from '../promises.js';

/**
 * async generator that yields chunks of items from the source.
 * @param source
 * @param {ChunkProcessOptions} options
 */
async function* asChunk(source, { unit, timeout, interval }) {
    const postBox = new InboxWithEvent(unit * 10);
    const outgoingBox = new InboxWithEvent(10);
    const completed = promiseWithResolvers();
    const pacemaker = interval ? new PaceMaker(interval) : undefined;
    let isCompleted = false;
    const porter = new Porter({
        from: postBox,
        to: outgoingBox,
        timeout: timeout,
        maxSize: unit,
    });
    const feeder = new Feeder({
        source,
        target: postBox,
    });
    const checkStates = () => {
        if (porter.stateDetail.isBusy)
            return;
        // if (harvester.stateDetail.isBusy) return;
        if (!feeder.stateDetail.hasFinished)
            return;
        if (outgoingBox.size != 0)
            return;
        isCompleted = true;
        completed.resolve();
    };
    feeder.setOnProgress((state) => {
        checkStates();
    });
    porter.setOnProgress((state) => {
        checkStates();
    });
    postBox.setOnProgress((state) => {
        checkStates();
    });
    outgoingBox.setOnProgress((state) => {
        checkStates();
    });
    do {
        const chunk = await outgoingBox.pick(undefined, [completed.promise]);
        if (chunk === NOT_AVAILABLE) {
            if (isCompleted) {
                break;
            }
            continue;
        }
        if (pacemaker) {
            await Promise.race([pacemaker.paced]);
        }
        yield chunk;
        pacemaker?.mark();
    } while (!isCompleted);
    porter.dispose();
}
/**
 * Flattens nested async or sync iterables.
 * The counterpart to `asChunk`.
 * @param source
 */
async function* asFlat(source) {
    for await (const chunk of source) {
        for await (const item of chunk) {
            yield item;
        }
    }
}

export { asChunk, asFlat };
//# sourceMappingURL=chunks.js.map
