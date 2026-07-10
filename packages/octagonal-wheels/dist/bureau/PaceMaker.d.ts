export declare class PaceMaker {
    _interval: number;
    _minimumNext: number | undefined;
    constructor(interval: number);
    /**
     * Change the interval of the pacing.
     * This will reset the minimum next pacing time.
     * @param interval
     */
    changeInterval(interval: number): void;
    /**
     * Mark the current time as the basis for the next pacing.
     * @param now
     */
    mark(now?: number): void;
    _getPaced(doMark: boolean): Promise<void>;
    /**
     * The promise for waiting paced
     */
    get paced(): Promise<void>;
    /**
     * The promise for waiting paced since the last mark
     */
    get pacedSinceMark(): Promise<void>;
}
