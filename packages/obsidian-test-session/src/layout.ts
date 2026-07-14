import type { Locator, Page } from "playwright";

/** Width and height measured in CSS pixels. */
interface LayoutSize {
  /** Horizontal size. */
  width: number;
  /** Vertical size. */
  height: number;
}

/** Visible element rectangle measured in viewport CSS pixels. */
interface LayoutBox extends LayoutSize {
  /** Horizontal offset from the viewport's left edge. */
  x: number;
  /** Vertical offset from the viewport's top edge. */
  y: number;
}

/** Element client and scroll dimensions measured in CSS pixels. */
interface LayoutScrollSize {
  /** Width of the element's inner box. */
  clientWidth: number;
  /** Height of the element's inner box. */
  clientHeight: number;
  /** Width required by the element's complete content. */
  scrollWidth: number;
  /** Height required by the element's complete content. */
  scrollHeight: number;
}

/** Distance by which an element extends past each viewport edge. */
interface ViewportOverflow {
  /** Distance past the left edge. */
  left: number;
  /** Distance past the right edge. */
  right: number;
  /** Distance past the top edge. */
  top: number;
  /** Distance past the bottom edge. */
  bottom: number;
}

/** Excess scrollable content within an element. */
interface ContentOverflow {
  /** Excess horizontal content width. */
  horizontal: number;
  /** Excess vertical content height. */
  vertical: number;
}

/** Device safe-area insets measured in viewport CSS pixels. */
export interface LayoutInsets {
  /** Unsafe distance from the viewport's top edge. */
  top: number;
  /** Unsafe distance from the viewport's right edge. */
  right: number;
  /** Unsafe distance from the viewport's bottom edge. */
  bottom: number;
  /** Unsafe distance from the viewport's left edge. */
  left: number;
}

/** Optional controls for one layout inspection. */
export interface LocatorLayoutInspectionOptions {
  /**
   * Safe-area values which replace the corresponding measured CSS environment
   * values. Missing edges retain their measured values.
   *
   * Use this to model a target device when desktop mobile emulation reports
   * zero safe-area insets.
   */
  safeAreaInsets?: Partial<LayoutInsets>;
}

/** Structured snapshot used by layout assertions and failure diagnostics. */
export interface LocatorLayoutInspection {
  /** Active renderer viewport. */
  viewport: LayoutSize;
  /** Visible element rectangle, or `null` when the locator has no visible box. */
  box: LayoutBox | null;
  /** Element client and scroll dimensions. */
  scroll: LayoutScrollSize;
  /** Viewport overflow, or `null` when the locator has no visible box. */
  viewportOverflow: ViewportOverflow | null;
  /** Effective device safe-area insets. */
  safeAreaInsets: LayoutInsets;
  /**
   * Distance by which the locator enters an unsafe viewport edge, or `null`
   * when the locator has no visible box.
   */
  safeAreaOverflow: ViewportOverflow | null;
  /** Excess content within the element. */
  contentOverflow: ContentOverflow;
}

/** Common controls for retrying a layout assertion. */
export interface LayoutAssertionOptions {
  /** Human-readable subject included in a failure. Defaults to `locator`. */
  label?: string;
  /** Measurement tolerance in CSS pixels. Defaults to `1`. */
  tolerancePx?: number;
  /** Time allowed for a transient layout to settle. Defaults to `3000`. */
  timeoutMs?: number;
  /** Delay between measurements in milliseconds. Defaults to `50`. */
  pollIntervalMs?: number;
}

/** Axes which a viewport-containment assertion may inspect. */
export type ViewportAxes = "horizontal" | "vertical" | "both";

/** Controls for a viewport-containment assertion. */
export interface ViewportAssertionOptions extends LayoutAssertionOptions {
  /** Viewport axes to inspect. Defaults to `both`. */
  axes?: ViewportAxes;
}

/** Controls for a safe-area containment assertion. */
export interface SafeAreaAssertionOptions
  extends ViewportAssertionOptions, LocatorLayoutInspectionOptions {}

/** Controls for a minimum touch-target assertion. */
export interface TouchTargetAssertionOptions extends LayoutAssertionOptions {
  /** Minimum visible width in CSS pixels. Defaults to `44`. */
  minimumWidthPx?: number;
  /** Minimum visible height in CSS pixels. Defaults to `44`. */
  minimumHeightPx?: number;
}

interface ResolvedLayoutAssertionOptions {
  label: string;
  tolerancePx: number;
  timeoutMs: number;
  pollIntervalMs: number;
}

function finiteNonNegative(value: number, name: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite non-negative number`);
  }
  return value;
}

function finitePositive(value: number, name: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a finite positive number`);
  }
  return value;
}

function resolveOptions(
  options: LayoutAssertionOptions,
): ResolvedLayoutAssertionOptions {
  const pollIntervalMs = options.pollIntervalMs ?? 50;
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs <= 0) {
    throw new RangeError("pollIntervalMs must be a finite positive number");
  }
  return {
    label: options.label ?? "locator",
    tolerancePx: finiteNonNegative(options.tolerancePx ?? 1, "tolerancePx"),
    timeoutMs: finiteNonNegative(options.timeoutMs ?? 3_000, "timeoutMs"),
    pollIntervalMs,
  };
}

function resolveAxes(axes: ViewportAxes | undefined): ViewportAxes {
  if (
    axes === undefined ||
    axes === "horizontal" ||
    axes === "vertical" ||
    axes === "both"
  ) {
    return axes ?? "both";
  }
  throw new TypeError(`Unknown viewport axes: ${String(axes)}`);
}

interface RendererLayoutEnvironment {
  viewport: LayoutSize;
  safeAreaInsets: LayoutInsets;
}

async function rendererLayoutEnvironment(
  page: Page,
): Promise<RendererLayoutEnvironment> {
  const measured = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText = [
      "position:fixed",
      "top:0",
      "left:0",
      "width:0",
      "height:0",
      "visibility:hidden",
      "pointer-events:none",
      "padding-top:var(--safe-area-inset-top, env(safe-area-inset-top, 0px))",
      "padding-right:var(--safe-area-inset-right, env(safe-area-inset-right, 0px))",
      "padding-bottom:var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))",
      "padding-left:var(--safe-area-inset-left, env(safe-area-inset-left, 0px))",
    ].join(";");
    (document.body ?? document.documentElement).append(probe);
    try {
      const style = globalThis.getComputedStyle(probe);
      const toPixels = (value: string): number => {
        const parsed = Number.parseFloat(value);
        return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      };
      return {
        viewport: {
          width: globalThis.innerWidth,
          height: globalThis.innerHeight,
        },
        safeAreaInsets: {
          top: toPixels(style.paddingTop),
          right: toPixels(style.paddingRight),
          bottom: toPixels(style.paddingBottom),
          left: toPixels(style.paddingLeft),
        },
      };
    } finally {
      probe.remove();
    }
  });
  return {
    viewport: page.viewportSize() ?? measured.viewport,
    safeAreaInsets: measured.safeAreaInsets,
  };
}

function resolveSafeAreaInsets(
  measured: LayoutInsets,
  overrides: Partial<LayoutInsets> | undefined,
): LayoutInsets {
  return {
    top: finiteNonNegative(
      overrides?.top ?? measured.top,
      "safeAreaInsets.top",
    ),
    right: finiteNonNegative(
      overrides?.right ?? measured.right,
      "safeAreaInsets.right",
    ),
    bottom: finiteNonNegative(
      overrides?.bottom ?? measured.bottom,
      "safeAreaInsets.bottom",
    ),
    left: finiteNonNegative(
      overrides?.left ?? measured.left,
      "safeAreaInsets.left",
    ),
  };
}

function viewportOverflow(
  box: LayoutBox,
  viewport: LayoutSize,
): ViewportOverflow {
  return {
    left: Math.max(0, -box.x),
    right: Math.max(0, box.x + box.width - viewport.width),
    top: Math.max(0, -box.y),
    bottom: Math.max(0, box.y + box.height - viewport.height),
  };
}

function safeAreaOverflow(
  box: LayoutBox,
  viewport: LayoutSize,
  insets: LayoutInsets,
): ViewportOverflow {
  return {
    left: Math.max(0, insets.left - box.x),
    right: Math.max(0, box.x + box.width - (viewport.width - insets.right)),
    top: Math.max(0, insets.top - box.y),
    bottom: Math.max(0, box.y + box.height - (viewport.height - insets.bottom)),
  };
}

/**
 * Measures one locator without changing scroll position or waiting for layout stability.
 *
 * `Page.viewportSize()` is used when viewport emulation is active. A connected
 * Electron renderer without a fixed Playwright viewport falls back to
 * `window.innerWidth` and `window.innerHeight`.
 *
 * @param page - Renderer page containing the locator.
 * @param locator - Consumer-selected layout root or element.
 * @param options - Safe-area values for target-device simulation.
 * @returns Structured viewport, element, and overflow measurements.
 */
export async function inspectLocatorLayout(
  page: Page,
  locator: Locator,
  options: LocatorLayoutInspectionOptions = {},
): Promise<LocatorLayoutInspection> {
  const [environment, box, scroll] = await Promise.all([
    rendererLayoutEnvironment(page),
    locator.boundingBox(),
    locator.evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
    })),
  ]);
  const viewport = environment.viewport;
  const safeAreaInsets = resolveSafeAreaInsets(
    environment.safeAreaInsets,
    options.safeAreaInsets,
  );
  const layoutBox = box === null ? null : { ...box };
  return {
    viewport,
    box: layoutBox,
    scroll,
    viewportOverflow:
      layoutBox === null ? null : viewportOverflow(layoutBox, viewport),
    safeAreaInsets,
    safeAreaOverflow:
      layoutBox === null
        ? null
        : safeAreaOverflow(layoutBox, viewport, safeAreaInsets),
    contentOverflow: {
      horizontal: Math.max(0, scroll.scrollWidth - scroll.clientWidth),
      vertical: Math.max(0, scroll.scrollHeight - scroll.clientHeight),
    },
  };
}

async function waitForLayout(
  page: Page,
  locator: Locator,
  options: ResolvedLayoutAssertionOptions,
  issue: (inspection: LocatorLayoutInspection) => string | null,
  inspectionOptions: LocatorLayoutInspectionOptions = {},
): Promise<LocatorLayoutInspection> {
  const deadline = Date.now() + options.timeoutMs;
  let lastInspection: LocatorLayoutInspection | undefined;
  let lastIssue = "could not be measured";
  let cause: unknown;

  for (;;) {
    try {
      lastInspection = await inspectLocatorLayout(
        page,
        locator,
        inspectionOptions,
      );
      lastIssue = issue(lastInspection) ?? "";
      if (lastIssue === "") return lastInspection;
      cause = undefined;
    } catch (error) {
      lastInspection = undefined;
      cause = error;
      lastIssue = `could not be measured: ${
        error instanceof Error ? error.message : String(error)
      }`;
    }

    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await page.waitForTimeout(Math.min(options.pollIntervalMs, remaining));
  }

  const measurements =
    lastInspection === undefined ? "" : `: ${JSON.stringify(lastInspection)}`;
  throw new Error(`${options.label} ${lastIssue}${measurements}`, { cause });
}

/**
 * Asserts that one locator neither extends past the horizontal viewport nor
 * contains horizontally overflowing content.
 *
 * Vertical viewport and content overflow are intentionally allowed. Scroll the
 * locator into view first when the consumer wants to inspect an off-screen item
 * within a legitimate horizontal scroller.
 *
 * @param page - Renderer page containing the locator.
 * @param locator - Consumer-selected layout root or element.
 * @param options - Diagnostic label, tolerance, and retry controls.
 * @returns The successful final inspection.
 */
export async function assertNoHorizontalOverflow(
  page: Page,
  locator: Locator,
  options: LayoutAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  const resolved = resolveOptions(options);
  return await waitForLayout(page, locator, resolved, (inspection) => {
    const viewportOverflow = inspection.viewportOverflow;
    if (viewportOverflow === null) return "has no visible bounding box";
    if (
      viewportOverflow.left > resolved.tolerancePx ||
      viewportOverflow.right > resolved.tolerancePx
    ) {
      return "extends past the horizontal viewport";
    }
    if (inspection.contentOverflow.horizontal > resolved.tolerancePx) {
      return "contains horizontal overflow";
    }
    return null;
  });
}

/**
 * Asserts that one locator's visible bounding box remains within selected
 * viewport axes. Internal scrollable content is not inspected.
 *
 * @param page - Renderer page containing the locator.
 * @param locator - Consumer-selected layout root or element.
 * @param options - Axes, diagnostic label, tolerance, and retry controls.
 * @returns The successful final inspection.
 */
export async function assertLocatorWithinViewport(
  page: Page,
  locator: Locator,
  options: ViewportAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  const resolved = resolveOptions(options);
  const axes = resolveAxes(options.axes);
  return await waitForLayout(page, locator, resolved, (inspection) => {
    const overflow = inspection.viewportOverflow;
    if (overflow === null) return "has no visible bounding box";
    const horizontal =
      overflow.left > resolved.tolerancePx ||
      overflow.right > resolved.tolerancePx;
    const vertical =
      overflow.top > resolved.tolerancePx ||
      overflow.bottom > resolved.tolerancePx;
    if (
      (axes === "horizontal" && horizontal) ||
      (axes === "vertical" && vertical) ||
      (axes === "both" && (horizontal || vertical))
    ) {
      return axes === "both"
        ? "extends past the viewport"
        : `extends past the ${axes} viewport`;
    }
    return null;
  });
}

/**
 * Asserts that one locator's visible bounding box remains inside the selected
 * axes of the device safe area.
 *
 * Inherited Obsidian `--safe-area-inset-*` values are measured when present,
 * with CSS `env(safe-area-inset-*)` as the fallback. Consumers may override
 * individual insets to model a target device during desktop mobile emulation.
 * This assertion does not change consumer CSS or move the locator.
 *
 * @param page - Renderer page containing the locator.
 * @param locator - Consumer-selected interactive element or layout root.
 * @param options - Axes, safe-area overrides, diagnostic label, tolerance, and retry controls.
 * @returns The successful final inspection.
 */
export async function assertLocatorWithinSafeArea(
  page: Page,
  locator: Locator,
  options: SafeAreaAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  const resolved = resolveOptions(options);
  const axes = resolveAxes(options.axes);
  return await waitForLayout(
    page,
    locator,
    resolved,
    (inspection) => {
      const overflow = inspection.safeAreaOverflow;
      if (overflow === null) return "has no visible bounding box";
      const horizontal =
        overflow.left > resolved.tolerancePx ||
        overflow.right > resolved.tolerancePx;
      const vertical =
        overflow.top > resolved.tolerancePx ||
        overflow.bottom > resolved.tolerancePx;
      if (
        (axes === "horizontal" && horizontal) ||
        (axes === "vertical" && vertical) ||
        (axes === "both" && (horizontal || vertical))
      ) {
        return axes === "both"
          ? "extends into the device safe area"
          : `extends into the ${axes} device safe area`;
      }
      return null;
    },
    { safeAreaInsets: options.safeAreaInsets },
  );
}

/**
 * Asserts that one locator has at least the configured visible width and height.
 *
 * Both dimensions default to `44` CSS pixels for a practical mobile review
 * target. Consumers may select different thresholds for their own accessibility
 * and platform policy. This assertion measures the locator's bounding box; it
 * does not infer hit areas created by pseudo-elements or test for occlusion.
 *
 * @param page - Renderer page containing the locator.
 * @param locator - Consumer-selected interactive element.
 * @param options - Minimum dimensions, diagnostic label, tolerance, and retry controls.
 * @returns The successful final inspection.
 */
export async function assertLocatorHasMinimumTouchTarget(
  page: Page,
  locator: Locator,
  options: TouchTargetAssertionOptions = {},
): Promise<LocatorLayoutInspection> {
  const resolved = resolveOptions(options);
  const minimumWidthPx = finitePositive(
    options.minimumWidthPx ?? 44,
    "minimumWidthPx",
  );
  const minimumHeightPx = finitePositive(
    options.minimumHeightPx ?? 44,
    "minimumHeightPx",
  );
  return await waitForLayout(page, locator, resolved, (inspection) => {
    const box = inspection.box;
    if (box === null) return "has no visible bounding box";
    if (
      box.width + resolved.tolerancePx < minimumWidthPx ||
      box.height + resolved.tolerancePx < minimumHeightPx
    ) {
      return `is smaller than the minimum touch target (${box.width}×${box.height} CSS px; requires ${minimumWidthPx}×${minimumHeightPx} CSS px)`;
    }
    return null;
  });
}
