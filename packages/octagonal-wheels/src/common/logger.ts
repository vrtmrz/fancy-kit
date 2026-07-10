export const LOG_LEVEL_DEBUG = -1;
export const LOG_LEVEL_VERBOSE = 0b00010000;
export const LOG_LEVEL_INFO = 0b00100000;
export const LOG_LEVEL_NOTICE = 0b01000000;
export const LOG_LEVEL_URGENT = 0b10000000;

export const LOG_KIND_INFO = 0b00000000;
export const LOG_KIND_DEBUG = 0b00000001;
export const LOG_KIND_VERBOSE = 0b00000010;
export const LOG_KIND_WARNING = 0b00000100;
export const LOG_KIND_ERROR = 0b00001000;

export type LOG_LEVEL =
    | typeof LOG_LEVEL_DEBUG
    | typeof LOG_LEVEL_VERBOSE
    | typeof LOG_LEVEL_INFO
    | typeof LOG_LEVEL_NOTICE
    | typeof LOG_LEVEL_URGENT;

export const LEVEL_DEBUG = LOG_LEVEL_DEBUG;
export const LEVEL_INFO = LOG_LEVEL_INFO;
export const LEVEL_NOTICE = LOG_LEVEL_NOTICE;
export const LEVEL_URGENT = LOG_LEVEL_URGENT;
export const LEVEL_VERBOSE = LOG_LEVEL_VERBOSE;

export type LOG_KIND =
    | typeof LOG_KIND_INFO
    | typeof LOG_KIND_DEBUG
    | typeof LOG_KIND_VERBOSE
    | typeof LOG_KIND_WARNING
    | typeof LOG_KIND_ERROR;

export type LoggerFunction = typeof defaultLogger;

export const defaultLoggerEnv = {
    minLogLevel: LOG_LEVEL_INFO,
};
export const defaultLogger = function defaultLogger(message: any, level: number = LEVEL_INFO, key?: string) {
    if (level < defaultLoggerEnv.minLogLevel) {
        return;
    }
    const now = new Date();
    const timestamp = now.toLocaleString();
    const messageContent =
        typeof message == "string"
            ? message
            : message instanceof Error
              ? `${message.name}:${message.message}`
              : JSON.stringify(message, null, 2);
    const newMessage = `${timestamp}\t${level}\t${messageContent}`;
    if (level & LOG_KIND_DEBUG) {
        console.debug(newMessage);
    } else if (level & LOG_KIND_WARNING) {
        console.warn(newMessage);
    } else if (level & LOG_KIND_ERROR) {
        console.error(newMessage);
    } else if (level & LOG_KIND_VERBOSE) {
        console.info(newMessage);
    } else {
        console.log(newMessage);
    }
    if (message instanceof Error) {
        // debugger;
        console.dir(message.stack);
    }
};

let _logger: LoggerFunction = defaultLogger;

/**
 * Sets the global log function.
 *
 * @param logger - The logger function to set as the global log function.
 */
export function setGlobalLogFunction(logger: LoggerFunction) {
    _logger = logger;
}
/**
 * Logs a message with an optional log level and key.
 *
 * @param message - The message to be logged.
 * @param level - The log level (optional).
 * @param key - The key (optional).
 */
export function Logger(message: any, level?: LOG_LEVEL, key?: string): void {
    _logger(message, level, key);
}

function __logger(message: any, baseLevel: LOG_LEVEL, flagsOrKey?: LOG_KIND | string, key?: string) {
    let level = baseLevel;
    if (typeof flagsOrKey == "string") {
        key = flagsOrKey;
    } else if (flagsOrKey !== undefined) {
        level |= flagsOrKey;
    }
    _logger(message, level, key);
}

export function info(message: any): void;
export function info(message: any, flags: LOG_KIND): void;
export function info(message: any, key: string): void;
export function info(message: any, flags: LOG_KIND, key: string): void;
export function info(message: any, flagsOrKey?: LOG_KIND | string, key?: string): void {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}

export function debug(message: any): void;
export function debug(message: any, flags: LOG_KIND): void;
export function debug(message: any, key: string): void;
export function debug(message: any, flags: LOG_KIND, key: string): void;
export function debug(message: any, flagsOrKey?: LOG_KIND | string, key?: string): void {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}

export function verbose(message: any): void;
export function verbose(message: any, flags: LOG_KIND): void;
export function verbose(message: any, key: string): void;
export function verbose(message: any, flags: LOG_KIND, key: string): void;
export function verbose(message: any, flagsOrKey?: LOG_KIND | string, key?: string): void {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}

export function notice(message: any): void;
export function notice(message: any, flags: LOG_KIND): void;
export function notice(message: any, key: string): void;
export function notice(message: any, flags: LOG_KIND, key: string): void;
export function notice(message: any, flagsOrKey?: LOG_KIND | string, key?: string): void {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}
