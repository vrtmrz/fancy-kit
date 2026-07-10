import { startShowcaseTestSession, stopShowcaseTestSession, type ShowcaseTestSession } from "../runner/showcase.ts";

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    console.log(
      `Showcase ready: ${testSession.session.readiness.pluginId}@${testSession.session.readiness.pluginVersion}`,
    );
    console.log(`Temporary vault: ${testSession.vault.path}`);
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
