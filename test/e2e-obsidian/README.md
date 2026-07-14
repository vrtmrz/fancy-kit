# Real Obsidian harness and E2E

The public-source harness plug-in under `apps/obsidian-harness/` is an interactive catalogue, guided contract runner, and fixture for automated UI tests. It runs inside real Obsidian, is not an npm package, and is distributed separately as a BRAT-compatible plug-in.

The shared `@vrtmrz/obsidian-test-session` package installs the harness into a temporary Vault and isolated Obsidian profile. It writes Automation-mode `pluginData` before start, uses `obsidian-cli` only to deliver the Vault-open URI, then uses Playwright over Electron's DevTools endpoint for bootstrap and UI readiness. Harness story invocation, one-shot requests, state, and assertions remain local consumer code.

This suite is local-only. It is intentionally not part of the default CI gate.

The suite has been exercised on Linux and macOS. The shared runner contains Windows executable discovery paths, but this harness does not yet claim tested Windows support.

## Commands

Open the harness for manual visual and interaction checks:

```bash
npm run harness:open
```

Run the automated scenarios:

```bash
npm run test:e2e:obsidian:smoke
npm run test:e2e:obsidian:modes
npm run test:e2e:obsidian:dialogs
npm run test:e2e:obsidian:progress
npm run test:e2e:obsidian:notices
npm run test:e2e:obsidian:frontmatter
npm run test:e2e:obsidian:contracts
npm run test:e2e:obsidian:mobile
npm run test:e2e:obsidian:local-suite
```

The catalogue covers text and password prompts, typed selection, Markdown dialogs, keyed Notice updates, and progress Notice lifecycle behaviour. Contract scenarios verify owned-fixture Vault text and frontmatter behaviour, nested wake-lock leases, one-shot request consumption, and guided wake-lock evidence. The mobile scenario enables Obsidian's built-in mobile mode with `app.emulateMobile(true)`, waits for the mobile renderer and harness plug-in to reload, uses a 375 by 667 CSS-pixel viewport, and checks keyboard interaction, viewport containment, and horizontal overflow.

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
2. installs the built harness plug-in and its Automation-mode `data.json`;
3. launches Obsidian on a session-specific DevTools port;
4. enables the harness and invokes Automation-only story commands through the active renderer;
5. operates the real Modal, SuggestModal, and Notice DOM through Playwright;
6. reads story and contract results from the harness state;
7. terminates Obsidian and removes temporary state unless preservation is enabled.

Scripted `UiInteractions` responses are not configured in this workflow.

Mobile emulation reloads the renderer. The mobile scenario therefore waits for the replacement renderer, normalises its start-up overlay, reacquires the harness plug-in, and continues through Playwright.

## Adding a story

For each visible UI feature:

1. add focused unit tests for its state and contract;
2. add a deterministic harness story and catalogue card;
3. add stable class names or `data-testid` markers where semantic locators are insufficient;
4. operate the story through Playwright rather than a scripted driver;
5. assert both visible DOM state and the resulting application value.

Keep Automation-only commands unavailable in Review and Showcase modes. A pending run must be validated, removed from `data.json`, and saved before execution so an Obsidian reload cannot repeat it. All Vault scenarios must use a unique owned fixture root and clean it in `finally`.
