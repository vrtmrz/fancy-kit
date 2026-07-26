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
  enablePluginAndSave,
  ensurePluginLoaded,
  inspectLocatorLayout,
  type LayoutAssertionOptions,
  type LayoutInsets,
  type LocatorLayoutInspection,
  type SafeAreaAssertionOptions,
  type ObsidianPluginSessionLifecycle,
  type StartObsidianPluginSessionOptions,
  type TouchTargetAssertionOptions,
} from "@vrtmrz/obsidian-test-session";

export async function startControlledPlugin(
  remoteDebuggingPort: number,
  pluginId: string,
): Promise<void> {
  await enablePluginAndSave(remoteDebuggingPort, pluginId);
}

export async function keepLoadedPluginRunning(
  remoteDebuggingPort: number,
  pluginId: string,
): Promise<void> {
  await ensurePluginLoaded(remoteDebuggingPort, pluginId);
}

export function withDeviceLocalState(
  options: StartObsidianPluginSessionOptions,
): StartObsidianPluginSessionOptions {
  const lifecycle: ObsidianPluginSessionLifecycle = {
    beforePluginStart: async ({ pluginStartup }) => {
      if (pluginStartup !== "controlled")
        throw new Error("Expected controlled plug-in start-up");
    },
  };
  return {
    ...options,
    localStorageEntries: {
      "example-plugin-device-schema": "3",
    },
    lifecycle,
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
