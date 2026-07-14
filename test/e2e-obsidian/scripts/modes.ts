import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeHarnessCommand,
  startHarnessTestSession,
  stopHarnessTestSession,
  waitForHarnessState,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession({
      schemaVersion: 1,
      mode: null,
    });
    const { session } = testSession;
    await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      const modal = page
        .locator(".modal-container .modal")
        .filter({ hasText: "Choose how to use Fancy Kit Harness" })
        .last();
      await modal.waitFor({ state: "visible", timeout: 10_000 });
      const review = modal.locator(".setting-item").filter({
        hasText: "Guided review (recommended)",
      });
      await review.getByRole("button", { name: "Select" }).click();
      await modal.waitFor({ state: "hidden" });
    });
    await waitForHarnessState(
      session,
      (state) => state.mode === "review",
      "saved guided-review mode",
    );
    const data = JSON.parse(
      await readFile(
        join(
          testSession.vault.path,
          ".obsidian/plugins/fancy-kit-harness/data.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    if (data.mode !== "review" || "pendingRun" in data) {
      throw new Error(`Unexpected saved harness mode: ${JSON.stringify(data)}`);
    }
    await executeHarnessCommand(session, "open");
    await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      await page
        .getByRole("heading", { name: "Fancy Kit Harness" })
        .waitFor();
    });
    console.log("First-run mode selection and persistence passed.");
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
