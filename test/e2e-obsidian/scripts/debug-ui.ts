import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeHarnessCommand,
  startHarnessTestSession,
  stopHarnessTestSession,
  type HarnessTestSession,
} from "../runner/harness.ts";

async function waitUntilClosed(
  testSession: HarnessTestSession,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    testSession.session.app.process.once("exit", done);
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
  });
}

async function main(): Promise<void> {
  let testSession: HarnessTestSession | undefined;
  try {
    testSession = await startHarnessTestSession();
    await executeHarnessCommand(testSession.session, "open");
    await withObsidianPage(
      testSession.session.remoteDebuggingPort,
      async (page) => {
        await page
          .getByRole("heading", { name: "Fancy Kit Harness" })
          .waitFor({ timeout: 10_000 });
      },
    );
    console.log(
      `Harness opened in temporary vault: ${testSession.vault.path}`,
    );
    console.log("Close Obsidian or press Ctrl+C to stop.");
    await waitUntilClosed(testSession);
  } finally {
    if (testSession !== undefined) await stopHarnessTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
