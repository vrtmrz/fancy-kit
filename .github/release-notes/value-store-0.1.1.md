## @vrtmrz/value-store 0.1.1

10th November, 2026

### Improved

- Growing application state can now use SQLite through the existing asynchronous string and JSON-value API. Import `createSqliteFileValueStore` or `createSqliteValueStore` from `@vrtmrz/value-store/node-sqlite` for an internally managed file or a caller-owned connection.
- Memory, Web Storage, JSON-file, and SQLite stores support prepared `writeBatch` operations and `dispose()` for stopping new work and awaiting accepted operations. Scoped `clear()` is available on memory, JSON-file, and SQLite stores. Existing minimal custom backends remain compatible.
- Public TSDoc and a small executable storage example explain defaults, ownership, completion, migration, and reset ordering.

### Runtime and compatibility

- SQLite preserves exact JavaScript strings, literal prefixes, and independent namespaces. Existing storage is not migrated automatically.
- Managed SQLite uses WAL/FULL by default. NORMAL is an explicit durability trade-off. SQLite batches use one transaction; Web Storage batches can retain earlier changes after a write fails.
- Native checks cover Node 24.18.0, Node 26.13.0, and Deno 2.9.7 on Linux arm64. Managed-file use on Deno 2.9.7 requires `--allow-all`. Native SQLite I/O is synchronous, so large workloads need bounded chunks and opportunities for the event loop to run.
