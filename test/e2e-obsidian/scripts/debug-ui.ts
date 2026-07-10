import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeShowcaseCommand,
  startShowcaseTestSession,
  stopShowcaseTestSession,
  type ShowcaseTestSession,
} from "../runner/showcase.ts";

async function waitUntilClosed(
  testSession: ShowcaseTestSession,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const done = () => resolve();
    testSession.session.app.process.once("exit", done);
    process.once("SIGINT", done);
    process.once("SIGTERM", done);
  });
}

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    await executeShowcaseCommand(testSession.session, "open");
    await withObsidianPage(
      testSession.session.remoteDebuggingPort,
      async (page) => {
        await page
          .getByRole("heading", { name: "Obsidian Plugin Kit" })
          .waitFor({ timeout: 10_000 });
      },
    );
    console.log(
      `Showcase opened in temporary vault: ${testSession.vault.path}`,
    );
    console.log("Close Obsidian or press Ctrl+C to stop.");
    await waitUntilClosed(testSession);
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
