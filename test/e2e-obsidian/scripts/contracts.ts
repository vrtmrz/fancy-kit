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
      mode: "automation",
      pendingRun: {
        requestId: "automatic-contracts",
        scenarios: [
          "vault-text",
          "vault-frontmatter",
          "wake-lock-nested",
        ],
      },
    });
    const { session } = testSession;
    await executeHarnessCommand(session, "open");
    await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      const review = page.locator('[data-testid="guided-review"]');
      await review.waitFor({ state: "visible" });
      const text = await review.textContent();
      if (!text?.includes("Action:") || !text.includes("Expected result:")) {
        throw new Error(
          `Guided instructions are incomplete: ${JSON.stringify(text)}`,
        );
      }
    });

    await executeHarnessCommand(session, "e2e-start-pending-run");
    const automatic = await waitForHarnessState(
      session,
      (state) =>
        state.completedRequestId === "automatic-contracts" &&
        !state.suite.running,
      "automatic contract completion",
    );
    for (const id of [
      "vault-text",
      "vault-frontmatter",
      "wake-lock-nested",
    ]) {
      if (automatic.suite.results[id]?.status !== "passed") {
        throw new Error(
          `Automatic contract did not pass: ${id}: ${JSON.stringify(automatic.suite.results[id])}`,
        );
      }
    }

    await executeHarnessCommand(session, "e2e-start-guided-short-test");
    const confirmation = await waitForHarnessState(
      session,
      (state) => state.guidedReview.step === "screen-confirmation",
      "guided screen confirmation",
    );
    if (confirmation.lastResult !== "timed-run-completed") {
      throw new Error(
        `The guided timed run did not complete: ${JSON.stringify(confirmation)}`,
      );
    }
    await executeHarnessCommand(session, "e2e-confirm-display-yes");
    const confirmed = await waitForHarnessState(
      session,
      (state) => state.guidedReview.step === "visibility-ready",
      "guided physical-display confirmation",
    );
    if (confirmed.guidedReview.timed.displayStayedAwake !== "yes") {
      throw new Error("The guided display confirmation was not recorded");
    }
    if (!confirmed.transcript.some(({ event }) => event === "lease-released")) {
      throw new Error("The wake-lock transcript did not record lease release");
    }
    console.log(
      "Real Obsidian Vault, wake-lock, one-shot automation, and guided instruction contracts passed.",
    );
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
