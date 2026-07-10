const LOG_LEVEL_DEBUG = -1;
const LOG_LEVEL_VERBOSE = 0b00010000;
const LOG_LEVEL_INFO = 0b00100000;
const LOG_LEVEL_NOTICE = 0b01000000;
const LOG_LEVEL_URGENT = 0b10000000;
const LOG_KIND_INFO = 0b00000000;
const LOG_KIND_DEBUG = 0b00000001;
const LOG_KIND_VERBOSE = 0b00000010;
const LOG_KIND_WARNING = 0b00000100;
const LOG_KIND_ERROR = 0b00001000;
const LEVEL_DEBUG = LOG_LEVEL_DEBUG;
const LEVEL_INFO = LOG_LEVEL_INFO;
const LEVEL_NOTICE = LOG_LEVEL_NOTICE;
const LEVEL_URGENT = LOG_LEVEL_URGENT;
const LEVEL_VERBOSE = LOG_LEVEL_VERBOSE;
const defaultLoggerEnv = {
    minLogLevel: LOG_LEVEL_INFO,
};
const defaultLogger = function defaultLogger(message, level = LEVEL_INFO, key) {
    if (level < defaultLoggerEnv.minLogLevel) {
        return;
    }
    const now = new Date();
    const timestamp = now.toLocaleString();
    const messageContent = typeof message == "string"
        ? message
        : message instanceof Error
            ? `${message.name}:${message.message}`
            : JSON.stringify(message, null, 2);
    const newMessage = `${timestamp}\t${level}\t${messageContent}`;
    if (level & LOG_KIND_DEBUG) {
        console.debug(newMessage);
    }
    else if (level & LOG_KIND_WARNING) {
        console.warn(newMessage);
    }
    else if (level & LOG_KIND_ERROR) {
        console.error(newMessage);
    }
    else if (level & LOG_KIND_VERBOSE) {
        console.info(newMessage);
    }
    else {
        console.log(newMessage);
    }
    if (message instanceof Error) {
        // debugger;
        console.dir(message.stack);
    }
};
let _logger = defaultLogger;
/**
 * Sets the global log function.
 *
 * @param logger - The logger function to set as the global log function.
 */
function setGlobalLogFunction(logger) {
    _logger = logger;
}
/**
 * Logs a message with an optional log level and key.
 *
 * @param message - The message to be logged.
 * @param level - The log level (optional).
 * @param key - The key (optional).
 */
function Logger(message, level, key) {
    _logger(message, level, key);
}
function __logger(message, baseLevel, flagsOrKey, key) {
    let level = baseLevel;
    if (typeof flagsOrKey == "string") {
        key = flagsOrKey;
    }
    else if (flagsOrKey !== undefined) {
        level |= flagsOrKey;
    }
    _logger(message, level, key);
}
function info(message, flagsOrKey, key) {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}
function debug(message, flagsOrKey, key) {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}
function verbose(message, flagsOrKey, key) {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}
function notice(message, flagsOrKey, key) {
    __logger(message, LEVEL_INFO, flagsOrKey, key);
}

export { LEVEL_DEBUG, LEVEL_INFO, LEVEL_NOTICE, LEVEL_URGENT, LEVEL_VERBOSE, LOG_KIND_DEBUG, LOG_KIND_ERROR, LOG_KIND_INFO, LOG_KIND_VERBOSE, LOG_KIND_WARNING, LOG_LEVEL_DEBUG, LOG_LEVEL_INFO, LOG_LEVEL_NOTICE, LOG_LEVEL_URGENT, LOG_LEVEL_VERBOSE, Logger, debug, defaultLogger, defaultLoggerEnv, info, notice, setGlobalLogFunction, verbose };
//# sourceMappingURL=logger.js.map
