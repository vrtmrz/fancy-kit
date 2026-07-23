// This harmless process stands in for a detached Obsidian process group.
// The parent regression test terminates it during cleanup even when the
// implementation under test does not.

setInterval(() => undefined, 1_000);
