# Fancy Kit Harness

Fancy Kit Harness is an interactive catalogue and guided contract runner for Fancy Kit. Install a reviewed release into a dedicated test Vault by following its verified installer link. The installer requires [Screwdriver](https://github.com/vrtmrz/obsidian-screwdriver), copies a checked document to the Clipboard, and opens it in Obsidian. The Harness is not intended for an everyday Vault or for the Obsidian Community Plugins catalogue.

The installer asks for a Vault name or ID and initially suggests `fancy-kit-harness`. It remembers the selected value in that browser only. Confirm the dedicated Vault, choose **Copy and open in Obsidian**, then run `Screwdriver: Restore files from this note`. Reload Obsidian, enable **Fancy Kit Harness**, and open the Harness command.

The generated document restores only `main.js`, `manifest.json`, and `styles.css` below the Harness plug-in directory. It does not enable the plug-in, alter the community plug-in list, or supply a `data.json` file.

Open the `Fancy Kit Harness: Open harness` command or select its ribbon icon. On first start, choose the experience that should open by default:

- **Guided review** runs selected, automatic, or full contract reviews and displays the action, expected result, and collected evidence for each scenario.
- **Component showcase** exercises dialogs, typed selection, notices, progress, and other visual components individually.
- **Automated E2E** prepares the plug-in for an isolated test runner. It does not start a test merely because the mode is selected.

The start-up mode can be changed under **Settings → Community plugins → Fancy Kit Harness**. Review and showcase controls remain available together; the mode selects the initial emphasis and enables automation controls only when required.

## Current review scenarios

- Vault text creation, reading, appending, modification, and typed error behaviour.
- Vault frontmatter persistence and typed error behaviour.
- Nested logical screen wake-lock leases and cleanup.
- A guided mobile display and visibility review.

Vault scenarios create a unique owned fixture folder and remove it whether the scenario passes or fails. They do not scan or modify unrelated Vault content. Use a disposable dedicated test Vault as an additional safety boundary.

## Mobile wake-lock review

Set the device auto-lock timeout to a short known value, then choose a test duration longer than that timeout. Follow the displayed action and expected result without touching the screen during the countdown. The harness records browser-visible lifecycle evidence and asks separately whether the physical display remained awake.

A screen wake lock is best effort. It does not guarantee background execution, prevent the operating system from suspending Obsidian, or override device power policy.

## Reports and privacy

Reports contain scenario status, capability state, timing, and lifecycle events. They do not intentionally include the Vault name, Vault path, existing file names, existing file contents, or password values. Reports are not transmitted automatically; use **Copy report** when you want to attach one to a review.

## Project status

The Harness has its own `0.x` manifest version and GitHub release history. It is not an npm package. Its source, release assets, and installer are maintained from the Fancy Kit repository; the web installer verifies the exact versioned document before passing it to Obsidian.
