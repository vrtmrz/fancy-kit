# Fancy Kit Harness

Fancy Kit Harness is an interactive catalogue and guided contract runner for Fancy Kit. Install a reviewed release into a dedicated test Vault by following its verified installer link. The installer requires [Screwdriver](https://github.com/vrtmrz/obsidian-screwdriver), copies a checked document to the Clipboard, and opens it in Obsidian. The Harness is not intended for an everyday Vault or for the Obsidian Community Plugins catalogue.

The installer asks for a Vault name or ID and initially suggests `fancy-kit-harness`. It remembers the selected value in that browser only. Confirm the dedicated Vault, choose **Copy and open in Obsidian**, then run `Screwdriver: Restore files from this note`. Reload Obsidian, enable **Fancy Kit Harness**, and open the Harness command.

The generated document restores only `main.js`, `manifest.json`, and `styles.css` below the Harness plug-in directory. It does not enable the plug-in, alter the community plug-in list, or supply a `data.json` file.

Open the `Fancy Kit Harness: Open harness` command or select its ribbon icon. On first start, choose the experience that should open by default:

- **Guided review** runs selected, automatic, or full contract reviews and displays the action, expected result, and collected evidence for each scenario. It selects the guided mobile scenario by default so a real-device review includes it unless you switch it off.
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

Set the device auto-lock timeout to a short known value, then choose a test duration longer than that timeout. Follow the displayed action and expected result without touching the screen during the countdown. The Harness first asks whether the wake lock kept the physical display awake. It then verifies that no Harness wake-lock lease remains and asks you to leave the device untouched until its normal policy switches the display off. Your answer records the physical result. Page-visibility events during this step are optional supporting evidence because embedded WebViews might not report screen power changes. Finally, the Harness separately records the background and return lifecycle.

A display that does not switch off is recorded as a failed post-release check, but is not by itself proof of a leaked wake lock. Device power policy, charging state, system accessibility settings, and other applications can affect auto-lock behaviour.

A screen wake lock is best effort. It does not guarantee background execution, prevent the operating system from suspending Obsidian, or override device power policy.

## Reports and privacy

The **Copy Markdown report** action produces GitHub-flavoured Markdown containing scenario status, capability state, timing, lifecycle events, Obsidian and Harness versions, the user agent, and screen dimensions. This makes the result suitable for pasting into a pull request or release review.

Reports do not intentionally include the Vault name, Vault path, existing file names, existing file contents, or password values. They are not transmitted automatically. Review the environment table before posting because the user agent and screen dimensions can identify a device or operating system.

## Project status

The Harness has its own `0.x` manifest version and GitHub release history. It is not an npm package. Its source, release assets, and installer are maintained from the Fancy Kit repository; the web installer verifies the exact versioned document before passing it to Obsidian.
