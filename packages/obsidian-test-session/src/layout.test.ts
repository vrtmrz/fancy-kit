import type { Locator, Page } from "playwright";
import { describe, expect, it, vi } from "vitest";
import {
  assertLocatorWithinViewport,
  assertNoHorizontalOverflow,
  inspectLocatorLayout,
} from "./layout.js";

interface LayoutFixture {
  page: Page;
  locator: Locator;
  boundingBox: ReturnType<typeof vi.fn>;
  evaluate: ReturnType<typeof vi.fn>;
  pageEvaluate: ReturnType<typeof vi.fn>;
  waitForTimeout: ReturnType<typeof vi.fn>;
}

function layoutFixture({
  viewport = { width: 375, height: 667 },
  box = { x: 16, y: 24, width: 343, height: 100 },
  scroll = {
    clientWidth: 343,
    clientHeight: 100,
    scrollWidth: 343,
    scrollHeight: 100,
  },
}: {
  viewport?: { width: number; height: number } | null;
  box?: { x: number; y: number; width: number; height: number } | null;
  scroll?: {
    clientWidth: number;
    clientHeight: number;
    scrollWidth: number;
    scrollHeight: number;
  };
} = {}): LayoutFixture {
  const boundingBox = vi.fn().mockResolvedValue(box);
  const evaluate = vi.fn().mockResolvedValue(scroll);
  const pageEvaluate = vi
    .fn()
    .mockResolvedValue({ width: 1_024, height: 768 });
  const waitForTimeout = vi.fn().mockResolvedValue(undefined);
  return {
    page: {
      viewportSize: vi.fn(() => viewport),
      evaluate: pageEvaluate,
      waitForTimeout,
    } as unknown as Page,
    locator: { boundingBox, evaluate } as unknown as Locator,
    boundingBox,
    evaluate,
    pageEvaluate,
    waitForTimeout,
  };
}

describe("inspectLocatorLayout", () => {
  it("returns structured viewport and content overflow measurements", async () => {
    const fixture = layoutFixture({
      box: { x: -2, y: 20, width: 380, height: 700 },
      scroll: {
        clientWidth: 305,
        clientHeight: 700,
        scrollWidth: 437,
        scrollHeight: 720,
      },
    });

    await expect(
      inspectLocatorLayout(fixture.page, fixture.locator),
    ).resolves.toEqual({
      viewport: { width: 375, height: 667 },
      box: { x: -2, y: 20, width: 380, height: 700 },
      scroll: {
        clientWidth: 305,
        clientHeight: 700,
        scrollWidth: 437,
        scrollHeight: 720,
      },
      viewportOverflow: { left: 2, right: 3, top: 0, bottom: 53 },
      contentOverflow: { horizontal: 132, vertical: 20 },
    });
  });

  it("falls back to the renderer dimensions without a fixed viewport", async () => {
    const fixture = layoutFixture({ viewport: null });

    const inspection = await inspectLocatorLayout(
      fixture.page,
      fixture.locator,
    );

    expect(inspection.viewport).toEqual({ width: 1_024, height: 768 });
    expect(fixture.pageEvaluate).toHaveBeenCalledOnce();
  });
});

describe("assertNoHorizontalOverflow", () => {
  it("allows legitimate vertical viewport and content overflow", async () => {
    const fixture = layoutFixture({
      box: { x: 0, y: -20, width: 375, height: 800 },
      scroll: {
        clientWidth: 375,
        clientHeight: 667,
        scrollWidth: 375,
        scrollHeight: 900,
      },
    });

    await expect(
      assertNoHorizontalOverflow(fixture.page, fixture.locator, {
        timeoutMs: 0,
      }),
    ).resolves.toMatchObject({
      contentOverflow: { horizontal: 0, vertical: 233 },
    });
  });

  it("reports an element which extends past the horizontal viewport", async () => {
    const fixture = layoutFixture({
      box: { x: 16, y: 20, width: 365, height: 100 },
    });

    await expect(
      assertNoHorizontalOverflow(fixture.page, fixture.locator, {
        label: "scenario actions",
        timeoutMs: 0,
      }),
    ).rejects.toThrowError(
      /scenario actions extends past the horizontal viewport.*"right":6/u,
    );
  });

  it("reports content which requires horizontal scrolling", async () => {
    const fixture = layoutFixture({
      scroll: {
        clientWidth: 305,
        clientHeight: 100,
        scrollWidth: 437,
        scrollHeight: 100,
      },
    });

    await expect(
      assertNoHorizontalOverflow(fixture.page, fixture.locator, {
        label: "scenario actions",
        timeoutMs: 0,
      }),
    ).rejects.toThrowError(
      /scenario actions contains horizontal overflow.*"horizontal":132/u,
    );
  });

  it("retries a transient layout until it fits", async () => {
    const fixture = layoutFixture();
    fixture.boundingBox
      .mockResolvedValueOnce({ x: 0, y: 20, width: 400, height: 100 })
      .mockResolvedValue({ x: 0, y: 20, width: 375, height: 100 });

    await assertNoHorizontalOverflow(fixture.page, fixture.locator, {
      timeoutMs: 100,
      pollIntervalMs: 1,
    });

    expect(fixture.boundingBox).toHaveBeenCalledTimes(2);
    expect(fixture.waitForTimeout).toHaveBeenCalledOnce();
  });

  it("retries a transient measurement failure", async () => {
    const fixture = layoutFixture();
    fixture.evaluate.mockRejectedValueOnce(new Error("element was detached"));

    await assertNoHorizontalOverflow(fixture.page, fixture.locator, {
      timeoutMs: 100,
      pollIntervalMs: 1,
    });

    expect(fixture.evaluate).toHaveBeenCalledTimes(2);
    expect(fixture.waitForTimeout).toHaveBeenCalledOnce();
  });
});

describe("assertLocatorWithinViewport", () => {
  it("can inspect only the horizontal viewport axis", async () => {
    const fixture = layoutFixture({
      box: { x: 0, y: -50, width: 375, height: 800 },
    });

    await expect(
      assertLocatorWithinViewport(fixture.page, fixture.locator, {
        axes: "horizontal",
        timeoutMs: 0,
      }),
    ).resolves.toBeDefined();
  });

  it("inspects both viewport axes by default", async () => {
    const fixture = layoutFixture({
      box: { x: 0, y: 20, width: 375, height: 700 },
    });

    await expect(
      assertLocatorWithinViewport(fixture.page, fixture.locator, {
        label: "dialogue",
        timeoutMs: 0,
      }),
    ).rejects.toThrowError(
      /dialogue extends past the viewport.*"bottom":53/u,
    );
  });

  it("reports a missing visible bounding box", async () => {
    const fixture = layoutFixture({ box: null });

    await expect(
      assertLocatorWithinViewport(fixture.page, fixture.locator, {
        label: "dialogue",
        timeoutMs: 0,
      }),
    ).rejects.toThrowError(/dialogue has no visible bounding box/u);
  });

  it("rejects invalid retry controls before measuring", async () => {
    const fixture = layoutFixture();

    await expect(
      assertLocatorWithinViewport(fixture.page, fixture.locator, {
        pollIntervalMs: 0,
      }),
    ).rejects.toThrowError(RangeError);
    expect(fixture.boundingBox).not.toHaveBeenCalled();
  });

  it("rejects unknown axes supplied by JavaScript callers", async () => {
    const fixture = layoutFixture();

    await expect(
      assertLocatorWithinViewport(fixture.page, fixture.locator, {
        axes: "diagonal" as "both",
      }),
    ).rejects.toThrowError(/Unknown viewport axes: diagonal/u);
    expect(fixture.boundingBox).not.toHaveBeenCalled();
  });
});
