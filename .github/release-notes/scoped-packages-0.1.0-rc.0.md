## Scoped packages 0.1.0-rc.0

10th July, 2026

I have extracted and exercised these contracts across several real Obsidian plug-ins. This release candidate is intended for registry-based consumer validation before the first stable `0.1.0` releases. I hope it makes the remaining review straightforward.

### UI interactions

- Framework-neutral prompt, selection, Markdown action, and message contracts.
- Instance-scoped scripted drivers and an App-free consumer harness.

### Obsidian plug-in kit

- Obsidian adapters for typed dialogues, Notices, progress UI, and the shared interaction contract.
- A narrow path-based Vault text capability with in-memory mocks, spies, and transcripts.

### Obsidian test session

- Isolated real-Obsidian Vault, process, CLI, CDP, plug-in installation, and readiness infrastructure.
- Explicit Linux AppImage preparation and cross-platform executable discovery boundaries.

### Validation status

- Consumer previews were exercised by DiffZip, TagFolder, Self-hosted LiveSync, and ScrewDriver.
- Real Obsidian UI and lifecycle coverage remains local-only and has been validated on Linux.
- The release candidates use the npm `next` dist-tag and may be skipped by other consumers until the stable release.
