export declare const LOG_LEVEL_DEBUG = -1;
export declare const LOG_LEVEL_VERBOSE = 16;
export declare const LOG_LEVEL_INFO = 32;
export declare const LOG_LEVEL_NOTICE = 64;
export declare const LOG_LEVEL_URGENT = 128;
export declare const LOG_KIND_INFO = 0;
export declare const LOG_KIND_DEBUG = 1;
export declare const LOG_KIND_VERBOSE = 2;
export declare const LOG_KIND_WARNING = 4;
export declare const LOG_KIND_ERROR = 8;
export type LOG_LEVEL = typeof LOG_LEVEL_DEBUG | typeof LOG_LEVEL_VERBOSE | typeof LOG_LEVEL_INFO | typeof LOG_LEVEL_NOTICE | typeof LOG_LEVEL_URGENT;
export declare const LEVEL_DEBUG = -1;
export declare const LEVEL_INFO = 32;
export declare const LEVEL_NOTICE = 64;
export declare const LEVEL_URGENT = 128;
export declare const LEVEL_VERBOSE = 16;
export type LOG_KIND = typeof LOG_KIND_INFO | typeof LOG_KIND_DEBUG | typeof LOG_KIND_VERBOSE | typeof LOG_KIND_WARNING | typeof LOG_KIND_ERROR;
export type LoggerFunction = typeof defaultLogger;
export declare const defaultLoggerEnv: {
    minLogLevel: number;
};
export declare const defaultLogger: (message: any, level?: number, key?: string) => void;
/**
 * Sets the global log function.
 *
 * @param logger - The logger function to set as the global log function.
 */
export declare function setGlobalLogFunction(logger: LoggerFunction): void;
/**
 * Logs a message with an optional log level and key.
 *
 * @param message - The message to be logged.
 * @param level - The log level (optional).
 * @param key - The key (optional).
 */
export declare function Logger(message: any, level?: LOG_LEVEL, key?: string): void;
export declare function info(message: any): void;
export declare function info(message: any, flags: LOG_KIND): void;
export declare function info(message: any, key: string): void;
export declare function info(message: any, flags: LOG_KIND, key: string): void;
export declare function debug(message: any): void;
export declare function debug(message: any, flags: LOG_KIND): void;
export declare function debug(message: any, key: string): void;
export declare function debug(message: any, flags: LOG_KIND, key: string): void;
export declare function verbose(message: any): void;
export declare function verbose(message: any, flags: LOG_KIND): void;
export declare function verbose(message: any, key: string): void;
export declare function verbose(message: any, flags: LOG_KIND, key: string): void;
export declare function notice(message: any): void;
export declare function notice(message: any, flags: LOG_KIND): void;
export declare function notice(message: any, key: string): void;
export declare function notice(message: any, flags: LOG_KIND, key: string): void;
