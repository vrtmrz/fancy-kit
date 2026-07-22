import { chromium } from "playwright";

/**
 * Closes each renderer page so Chromium can flush profile-backed state before
 * the process-tree fallback terminates the isolated Obsidian application.
 *
 * This is an internal session-lifecycle boundary rather than a package API.
 */
export async function closeObsidianRendererPages(
  remoteDebuggingPort: number,
): Promise<void> {
  const browser = await chromium.connectOverCDP(
    `http://127.0.0.1:${remoteDebuggingPort}`,
    { timeout: 2_000 },
  );
  try {
    const pages = browser.contexts().flatMap((context) => context.pages());
    await Promise.all(pages.map(async (page) => await page.close()));
  } finally {
    await browser.close().catch(() => undefined);
  }
}
