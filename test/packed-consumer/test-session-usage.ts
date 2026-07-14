/**
 * Compile-only consumer fixture for public test-session layout inspections.
 *
 * This file is copied into a temporary project that installs the packed
 * workspace tarballs. It must use public package entry points only.
 */
import type { Locator, Page } from "playwright";
import {
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
  inspectLocatorLayout,
  type LayoutAssertionOptions,
  type LocatorLayoutInspection,
} from "@vrtmrz/obsidian-test-session";

export async function inspectActions(
  page: Page,
  actions: Locator,
  options: LayoutAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  await assertLocatorWithinViewport(page, actions, options);
  await assertNoHorizontalOverflow(page, actions, options);
  return await inspectLocatorLayout(page, actions);
}
