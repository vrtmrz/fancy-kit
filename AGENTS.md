# Repository instructions

- Follow `CONTRIBUTING.md` for language, documentation, testing, and review requirements.
- Decide who a statement is for before adding it to the repository, and keep the audiences separate:
  - **Users:** root and package `README.md` files describe how to consume the packages, supported behaviour, and stable operational constraints.
  - **Developers:** `CONTRIBUTING.md` and developer documentation under `docs/` describe architecture, implementation details, validation, and release work.
  - **Agents:** `AGENTS.md` records repository-specific working rules and constraints needed to perform changes safely.
  Do not copy incidental local diagnostics, handover state, or agent-only reasoning into user or developer documentation unless that audience gains a durable, actionable benefit from it.
- Preserve documented behavioural contracts when changing an existing API.
- Keep scripted UI responses instance-scoped through an explicit `UiInteractions` capability and driver; never store them in static members or module globals.
- Follow `test/e2e-obsidian/README.md` when changing visible Obsidian UI behaviour.
