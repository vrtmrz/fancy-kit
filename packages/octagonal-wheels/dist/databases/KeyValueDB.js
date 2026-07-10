import { openDB, deleteDB } from 'idb';
import { Logger, LOG_LEVEL_VERBOSE } from '../common/logger.js';

const databaseCache = {};
/**
 * Opens a key-value database and returns a promise that resolves to a KeyValueDatabase object.
 * If the database with the given key already exists in the cache, it will be closed and removed from the cache before opening a new one.
 * @param dbKey - The key of the database.
 * @returns A promise that resolves to a KeyValueDatabase object.
 */
async function OpenKeyValueDatabase(dbKey) {
    if (dbKey in databaseCache) {
        databaseCache[dbKey].close();
        delete databaseCache[dbKey];
    }
    const storeKey = dbKey;
    const dbPromise = openDB(dbKey, 1, {
        upgrade(db) {
            db.createObjectStore(storeKey);
        },
        blocking() {
            Logger("Database blocking upgrade: " + dbKey, LOG_LEVEL_VERBOSE);
            try {
                db.close();
                Logger("Database closed for upgrade: " + dbKey, LOG_LEVEL_VERBOSE);
            }
            catch (e) {
                Logger(e, LOG_LEVEL_VERBOSE);
            }
        },
    });
    const db = await dbPromise;
    databaseCache[dbKey] = db;
    return {
        async get(key) {
            return await db.get(storeKey, key);
        },
        async set(key, value) {
            return await db.put(storeKey, value, key);
        },
        async del(key) {
            return await db.delete(storeKey, key);
        },
        async clear() {
            return await db.clear(storeKey);
        },
        async keys(query, count) {
            return await db.getAllKeys(storeKey, query, count);
        },
        close() {
            delete databaseCache[dbKey];
            return db.close();
        },
        async destroy() {
            delete databaseCache[dbKey];
            db.close();
            await deleteDB(dbKey, {
                blocked: (a, b) => {
                    Logger("Delete blocked for database: " + dbKey, LOG_LEVEL_VERBOSE);
                },
            });
        },
    };
}

export { OpenKeyValueDatabase };
//# sourceMappingURL=KeyValueDB.js.map
