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

async function viewportSize(page: Page): Promise<LayoutSize> {
  return (
    page.viewportSize() ??
    (await page.evaluate(() => ({
      width: globalThis.innerWidth,
      height: globalThis.innerHeight,
    })))
  );
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
 * @returns Structured viewport, element, and overflow measurements.
 */
export async function inspectLocatorLayout(
  page: Page,
  locator: Locator,
): Promise<LocatorLayoutInspection> {
  const [viewport, box, scroll] = await Promise.all([
    viewportSize(page),
    locator.boundingBox(),
    locator.evaluate((element) => ({
      clientWidth: element.clientWidth,
      clientHeight: element.clientHeight,
      scrollWidth: element.scrollWidth,
      scrollHeight: element.scrollHeight,
    })),
  ]);
  const layoutBox = box === null ? null : { ...box };
  return {
    viewport,
    box: layoutBox,
    scroll,
    viewportOverflow:
      layoutBox === null
        ? null
        : {
            left: Math.max(0, -layoutBox.x),
            right: Math.max(
              0,
              layoutBox.x + layoutBox.width - viewport.width,
            ),
            top: Math.max(0, -layoutBox.y),
            bottom: Math.max(
              0,
              layoutBox.y + layoutBox.height - viewport.height,
            ),
          },
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
): Promise<LocatorLayoutInspection> {
  const deadline = Date.now() + options.timeoutMs;
  let lastInspection: LocatorLayoutInspection | undefined;
  let lastIssue = "could not be measured";
  let cause: unknown;

  for (;;) {
    try {
      lastInspection = await inspectLocatorLayout(page, locator);
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
