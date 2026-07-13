import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { withObsidianPage } from "@vrtmrz/obsidian-test-session";
import {
  executeShowcaseCommand,
  startShowcaseTestSession,
  stopShowcaseTestSession,
  waitForShowcaseState,
  type ShowcaseTestSession,
} from "../runner/showcase.ts";

const FIXTURE_PATH = "Frontmatter fixture.md";

async function main(): Promise<void> {
  let testSession: ShowcaseTestSession | undefined;
  try {
    testSession = await startShowcaseTestSession();
    const { session } = testSession;
    await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      await page.evaluate(async ({ path, content }) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              vault?: { create(path: string, content: string): Promise<unknown> };
            };
          }
        ).app;
        if (!obsidianApp?.vault) throw new Error("Obsidian Vault API is unavailable");
        await obsidianApp.vault.create(path, content);
      }, {
        path: FIXTURE_PATH,
        content: "---\ntags:\n  - existing\n---\nFixture\n",
      });
    });

    await executeShowcaseCommand(session, "e2e-update-frontmatter");
    const state = await waitForShowcaseState(
      session,
      (candidate) => candidate.frontmatterState !== null,
      "frontmatter fixture update",
    );
    if (state.frontmatterState !== "updated") {
      throw new Error(`Frontmatter fixture update failed: ${JSON.stringify(state)}`);
    }

    const cached = await withObsidianPage(session.remoteDebuggingPort, async (page) => {
      const handle = await page.waitForFunction((path) => {
        const obsidianApp = (
          globalThis as typeof globalThis & {
            app?: {
              vault?: { getAbstractFileByPath(path: string): unknown };
              metadataCache?: {
                getFileCache(file: unknown): { frontmatter?: Record<string, unknown> } | null;
              };
            };
          }
        ).app;
        const file = obsidianApp?.vault?.getAbstractFileByPath(path);
        if (!file) return null;
        const frontmatter = obsidianApp?.metadataCache?.getFileCache(file)?.frontmatter;
        if (frontmatter?.reviewed !== true) return null;
        return {
          reviewed: frontmatter.reviewed,
          tags: frontmatter.tags,
          failedCallbackWasWritten: frontmatter.failedCallbackWasWritten,
          asyncCallbackWasWritten: frontmatter.asyncCallbackWasWritten,
        };
      }, FIXTURE_PATH, { timeout: 10_000 });
      return await handle.jsonValue() as {
        reviewed: boolean;
        tags: unknown;
        failedCallbackWasWritten?: unknown;
        asyncCallbackWasWritten?: unknown;
      };
    });
    if (
      cached.reviewed !== true ||
      JSON.stringify(cached.tags) !== JSON.stringify(["new", "existing"]) ||
      cached.failedCallbackWasWritten !== undefined ||
      cached.asyncCallbackWasWritten !== undefined
    ) {
      throw new Error(`Unexpected cached frontmatter: ${JSON.stringify(cached)}`);
    }

    const source = await readFile(join(testSession.vault.path, FIXTURE_PATH), "utf8");
    if (
      !source.includes("reviewed: true") ||
      source.includes("failedCallbackWasWritten") ||
      source.includes("asyncCallbackWasWritten")
    ) {
      throw new Error(`Updated frontmatter was not serialised: ${JSON.stringify(source)}`);
    }
    console.log(
      "Real Obsidian frontmatter update, rollback, and MetadataCache reflection passed.",
    );
  } finally {
    if (testSession !== undefined) await stopShowcaseTestSession(testSession);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
