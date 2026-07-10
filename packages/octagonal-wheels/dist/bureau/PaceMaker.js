class PaceMaker {
    constructor(interval) {
        Object.defineProperty(this, "_interval", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        Object.defineProperty(this, "_minimumNext", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        this._interval = interval;
    }
    /**
     * Change the interval of the pacing.
     * This will reset the minimum next pacing time.
     * @param interval
     */
    changeInterval(interval) {
        if (interval !== this._interval) {
            this._interval = interval;
            this._minimumNext = undefined;
        }
    }
    /**
     * Mark the current time as the basis for the next pacing.
     * @param now
     */
    mark(now = Date.now()) {
        if (this._minimumNext === undefined) {
            this._minimumNext = now + this._interval;
        }
        else {
            this._minimumNext = Math.max(this._minimumNext + this._interval, now + this._interval);
        }
    }
    _getPaced(doMark) {
        const now = Date.now();
        const prevMinimum = this._minimumNext;
        if (doMark)
            this.mark(now);
        if (prevMinimum !== undefined) {
            const shouldWait = prevMinimum - now;
            if (shouldWait > 0) {
                return new Promise((resolve) => setTimeout(() => {
                    resolve();
                }, shouldWait));
            }
        }
        return Promise.resolve();
    }
    /**
     * The promise for waiting paced
     */
    get paced() {
        return this._getPaced(true);
    }
    /**
     * The promise for waiting paced since the last mark
     */
    get pacedSinceMark() {
        return this._getPaced(false);
    }
}

export { PaceMaker };
//# sourceMappingURL=PaceMaker.js.map
