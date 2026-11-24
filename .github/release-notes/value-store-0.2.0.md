## @vrtmrz/value-store 0.2.0

24th November, 2026

### Improved

- Enumerate keys in memory, JSON files, and SQLite with `listKeys()`. Use a literal prefix, optional bounds, and a limit to page in UTF-16 code-unit order. Resume after the last key by setting it as `lower` with `lowerExclusive: true`.
- SQLite lists keys without reading stored values and clears a non-empty prefix through the primary-key range. Existing SQLite files use the same schema and require no migration.

### Runtime and compatibility

- SQLite now rejects connections without a boolean `DatabaseSync.isTransaction` with `unavailable` to enforce transaction isolation. Use a supported runtime such as Node.js 22.22.0 or later on the 22.x LTS line, 24.x, or 26.x. End-of-life Node.js 23.x lacks the required property.
- Native checks cover Node.js 22.22.0, 24.18.0, and 26.13.1, and Deno 2.9.7 with `--allow-all`, on Linux arm64. Node.js 22.22.0 emits its experimental SQLite warning.
