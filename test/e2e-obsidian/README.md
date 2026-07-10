# Real Obsidian showcase and E2E

The private showcase plug-in under `apps/obsidian-showcase/` is an interactive catalogue and a fixture for automated UI tests. It runs inside real Obsidian and is not included in a published package.

The E2E runner installs the showcase into a temporary vault and isolated Obsidian profile. It uses `obsidian-cli` for plugin commands and state inspection, and Playwright over Electron's DevTools endpoint for real UI interaction.

## Commands

Open the showcase for manual visual and interaction checks:

```bash
npm run showcase:open
```

Run the automated scenarios:

```bash
npm run test:e2e:obsidian:smoke
npm run test:e2e:obsidian:dialogs
npm run test:e2e:obsidian:progress
npm run test:e2e:obsidian:notices
npm run test:e2e:obsidian:mobile
npm run test:e2e:obsidian:local-suite
```

The catalogue currently covers text and password prompts, typed selection, Markdown dialogs, keyed Notice updates, and progress Notice lifecycle behaviour. The mobile scenario enables Obsidian's built-in mobile mode with `app.emulateMobile(true)`, waits for the mobile renderer and showcase plugin to reload, uses a 375 by 667 CSS-pixel viewport, and checks keyboard interaction, viewport containment, and horizontal overflow.

## Local prerequisites

Set `OBSIDIAN_BINARY` and optionally `OBSIDIAN_CLI` when they are not installed in a standard location:

```bash
export OBSIDIAN_BINARY=/path/to/obsidian
export OBSIDIAN_CLI=/path/to/obsidian-cli
```

On Linux, a reusable AppImage can be downloaded and extracted under `_testdata/obsidian` with:

```bash
npm run test:e2e:obsidian:install-appimage
```

Headless Linux automatically uses `xvfb-run` when available. Set `E2E_OBSIDIAN_KEEP_VAULT=true` to preserve temporary state for inspection.

## Runner lifecycle

For each session, the runner:

1. creates an isolated vault, HOME, XDG, and Electron user-data directory;
2. installs the built showcase plugin;
3. launches Obsidian on a session-specific DevTools port;
4. enables the showcase and invokes desktop story commands through `obsidian-cli`;
5. operates the real Modal, SuggestModal, and Notice DOM through Playwright;
6. reads the story result from the showcase fixture;
7. terminates Obsidian and removes temporary state unless preservation is enabled.

Scripted `UiInteractions` responses are not configured in this workflow.

Mobile emulation reloads the renderer and temporarily removes the CLI `eval` command. The mobile scenario therefore reacquires the reloaded showcase plugin through Playwright and invokes its fixture methods directly.

## Adding a story

For each visible UI feature:

1. add focused unit tests for its state and contract;
2. add a deterministic showcase command and catalogue card;
3. add stable class names or `data-testid` markers where semantic locators are insufficient;
4. operate the story through Playwright rather than a scripted driver;
5. assert both visible DOM state and the resulting application value.

Keep story state private to the showcase plugin. Production consumers must not expose an E2E bridge.
