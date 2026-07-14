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
- Treat `apps/obsidian-harness` as public BRAT-facing code. Keep Vault scenarios inside unique owned fixture roots, clean them in `finally`, and keep Automation mode as a convenience rather than a relaxed safety boundary.
- A `pendingRun` from plug-in data is one-shot: validate it, save its removal before execution, and never accept arbitrary commands, paths, credentials, or code through it.
- Keep Fancy Kit as the authoritative harness source. The separate `fancy-kit-harness` repository is a generated BRAT release projection, not a second source tree.

## Release work and user gates

- Treat `docs/releasing.md` as the developer and maintainer runbook. Keep agent-specific coordination, authority, and stopping rules here instead of adding them to that document.
- Obtain explicit user permission for each push and merge. Also obtain explicit permission before publishing, staging, approving, or promoting an npm release; permission for one operation does not imply permission for the next.
- When waiting for user review, state what needs review, where to review it, what response will allow work to continue, and which operations remain paused.
