/**
 * Compile-only consumer fixture for public test-session layout inspections.
 *
 * This file is copied into a temporary project that installs the packed
 * workspace tarballs. It must use public package entry points only.
 */
import type { Locator, Page } from "playwright";
import {
  assertLocatorHasMinimumTouchTarget,
  assertLocatorWithinSafeArea,
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
  inspectLocatorLayout,
  type LayoutAssertionOptions,
  type LayoutInsets,
  type LocatorLayoutInspection,
  type SafeAreaAssertionOptions,
  type StartObsidianPluginSessionOptions,
  type TouchTargetAssertionOptions,
} from "@vrtmrz/obsidian-test-session";

export function withDeviceLocalState(
  options: StartObsidianPluginSessionOptions,
): StartObsidianPluginSessionOptions {
  return {
    ...options,
    localStorageEntries: {
      "example-plugin-device-schema": "3",
    },
  };
}

export async function inspectActions(
  page: Page,
  actions: Locator,
  options: LayoutAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  await assertLocatorWithinViewport(page, actions, options);
  await assertNoHorizontalOverflow(page, actions, options);
  return await inspectLocatorLayout(page, actions);
}

export async function inspectMobileCloseControl(
  page: Page,
  closeButton: Locator,
  safeAreaInsets: LayoutInsets,
  touchOptions: TouchTargetAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  const safeAreaOptions: SafeAreaAssertionOptions = {
    label: "dialogue close button",
    safeAreaInsets,
  };
  await assertLocatorWithinSafeArea(page, closeButton, safeAreaOptions);
  return await assertLocatorHasMinimumTouchTarget(
    page,
    closeButton,
    touchOptions,
  );
}
