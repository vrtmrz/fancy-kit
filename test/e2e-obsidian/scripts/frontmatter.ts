import { readFile } from "node:fs/promises";
import { join } from "node:path";
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
        requestId: "frontmatter-contract",
        scenarios: ["vault-frontmatter"],
      },
    });
    const { session } = testSession;
    await executeHarnessCommand(session, "e2e-start-pending-run");
    const state = await waitForHarnessState(
      session,
      (candidate) =>
        candidate.completedRequestId === "frontmatter-contract" &&
        !candidate.suite.running,
      "frontmatter contract completion",
    );
    const result = state.suite.results["vault-frontmatter"];
    if (result?.status !== "passed") {
      throw new Error(
        `Frontmatter contract failed: ${JSON.stringify(result)}`,
      );
    }
    if (state.pendingRun !== null || state.activeRequestId !== null) {
      throw new Error(
        `The one-shot request was not consumed: ${JSON.stringify(state)}`,
      );
    }
    const saved = JSON.parse(
      await readFile(
        join(
          testSession.vault.path,
          ".obsidian/plugins/fancy-kit-harness/data.json",
        ),
        "utf8",
      ),
    ) as Record<string, unknown>;
    if ("pendingRun" in saved || saved.mode !== "automation") {
      throw new Error(
        `The saved one-shot request was not consumed safely: ${JSON.stringify(saved)}`,
      );
    }
    console.log(
      "Real Obsidian frontmatter persistence, typed errors, and fixture cleanup passed.",
    );
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
