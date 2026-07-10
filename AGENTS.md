# Repository instructions

- Follow `CONTRIBUTING.md` for language, documentation, testing, and review requirements.
- Preserve documented behavioural contracts when changing an existing API.
- Keep scripted UI responses instance-scoped through `UiContext`; never store them in static members or module globals.
- Follow `test/e2e-obsidian/README.md` when changing visible Obsidian UI behaviour.
