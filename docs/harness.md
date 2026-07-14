# Harness architecture

`apps/obsidian-harness` is the public Obsidian application used for component exploration, guided real-device review, and the repository's real Obsidian E2E suite. It is built from current workspace source and is not an npm-package consumption test. Package exports, declarations, tree-shaking, and tarball installation remain the responsibility of packed-consumer checks.

The application has one plug-in ID, `fancy-kit-harness`, and three start-up modes:

| Mode | Purpose | Behaviour |
| --- | --- | --- |
| `review` | Manual release-bundle and real-device review | Emphasises selectable contract scenarios and guided instructions. All current scenarios, including the mobile guided review, are selected initially. |
| `showcase` | Component exploration | Emphasises individual UI stories while retaining review controls. |
| `automation` | Isolated E2E sessions | Suppresses first-run selection, selects only automatic scenarios initially, and enables deterministic automation commands. It does not run tests merely by being selected. |

When no mode is stored, the plug-in asks after the Obsidian layout is ready. The selected value is saved through the normal Obsidian plug-in `data.json`. The settings tab can return the plug-in to the unselected state.

## One-shot automation requests

`@vrtmrz/obsidian-test-session` accepts an optional `pluginData` value and writes it before Obsidian starts. A consumer can select Automation mode and provide one pending scenario request:

```json
{
  "schemaVersion": 1,
  "mode": "automation",
  "pendingRun": {
    "requestId": "e2e-20260714-001",
    "scenarios": [
      "vault-text",
      "vault-frontmatter",
      "wake-lock-nested"
    ]
  }
}
```

Loading the plug-in validates the request but does not consume or start it. After Obsidian and the external driver are ready, `startPendingRun()` performs this sequence:

1. require Automation mode, a valid request, and an idle runner;
2. remove `pendingRun` from `data.json` and wait for that save to succeed;
3. record the request ID in memory and run the selected scenarios;
4. expose completion and scenario results under the same request ID.

Consuming before execution prevents an Obsidian reload from repeating Vault operations. Saving failure prevents execution. An unknown scenario leaves the original request unconsumed so the producer can correct it. The persistent Automation mode prevents a first-run prompt after a test-driven reload; the isolated Vault is disposed by the session owner.

Treat this data as a narrow declarative request, not a command channel. Do not accept arbitrary code, command IDs, paths, credentials, or scenario input values through it.

## Safety and ownership

- Every Vault scenario owns one unique fixture root and removes it in a `finally` block.
- Automation mode never relaxes fixture containment or cleanup.
- A mode or pending request never starts work before an explicit UI or driver action.
- Password story results are reduced to a non-secret completion marker.
- Copied reports omit Vault identity, existing content, and user-entered secrets.
- Copied reports use GitHub-flavoured Markdown and include low-entropy device evidence such as the user agent, viewport, screen dimensions, and touch capability. The Harness does not request high-entropy user-agent hints or transmit the report.
- Internal E2E commands are available only while Automation mode is active.

The guided wake-lock review separates three kinds of evidence: whether the wake lock kept the physical display awake, whether normal device auto-lock resumed after the Harness released every lease, and whether the platform wake lock reacquired after a background and return cycle. A failed post-release screen-off result is useful evidence, but is not conclusive proof of a leak because operating-system policy can also keep a display awake.

The component showcase and review runner share the same runtime APIs and binary. Keep visual stories safe enough for the public harness. Put deliberately malformed platform hosts, injected failures, and App-free edge cases in unit or contract tests instead.

## Distribution boundary

The Fancy Kit repository root represents an npm monorepo rather than a conventional Obsidian plug-in repository. `npm run release:prepare:harness` builds the application and creates `dist/fancy-kit-harness` containing:

- `main.js`, `manifest.json`, and `styles.css` as inspectable plug-in artefacts;
- `versions.json` and `SOURCE.json` as version and source provenance;
- a versioned `fancy-kit-harness-<version>-screwdriver.md` document;
- `INSTALLER.md`, whose HTTPS link includes the document SHA-256; and
- `SHA256SUMS` for all generated metadata and assets.

The Screwdriver document embeds only the three plug-in runtime files. It never contains `data.json`, `community-plugins.json`, or a caller-provided path. Publish it as an asset of the matching `harness-<version>` Fancy Kit release.

The Pages deployment copies all published Harness documents from their versioned release assets into a same-origin path. The installer accepts only a semantic Harness version and SHA-256, downloads that path, verifies the digest and restore-path allowlist, and then waits for explicit user confirmation. On installation it stores the selected Vault name or ID in browser-local storage, copies the document to the Clipboard, and opens a versioned note with `obsidian://new`. The default Vault value is `fancy-kit-harness`.

Fancy Kit remains the sole source tree. The Pages copy is a transport cache rebuilt from published release assets, not a source mirror or a release authority. A BRAT projection can be added later if external automatic updates justify its additional repository and release lifecycle.
