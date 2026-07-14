export const HARNESS_MODES = ["review", "showcase", "automation"] as const;
export type HarnessMode = (typeof HARNESS_MODES)[number];

export const HARNESS_SCENARIO_IDS = [
  "vault-text",
  "vault-frontmatter",
  "wake-lock-nested",
  "wake-lock-guided",
] as const;
export type ScenarioId = (typeof HARNESS_SCENARIO_IDS)[number];

export interface PendingHarnessRun {
  readonly requestId: string;
  readonly scenarios: readonly ScenarioId[];
}

export interface HarnessSettings {
  readonly schemaVersion: 1;
  readonly mode: HarnessMode | null;
  readonly pendingRun?: PendingHarnessRun;
}

export interface ParsedHarnessSettings {
  readonly settings: HarnessSettings;
  readonly invalidPendingRun?: unknown;
  readonly pendingRunError?: string;
}

const DEFAULT_SETTINGS: HarnessSettings = {
  schemaVersion: 1,
  mode: null,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseMode(value: unknown): HarnessMode | null {
  return typeof value === "string" &&
    HARNESS_MODES.includes(value as HarnessMode)
    ? (value as HarnessMode)
    : null;
}

function parsePendingRun(value: unknown):
  | { pendingRun: PendingHarnessRun }
  | { error: string } {
  if (!isRecord(value)) return { error: "pendingRun must be an object" };
  const requestId =
    typeof value.requestId === "string" ? value.requestId.trim() : "";
  if (requestId.length === 0)
    return { error: "pendingRun.requestId must be a non-empty string" };
  if (!Array.isArray(value.scenarios) || value.scenarios.length === 0)
    return { error: "pendingRun.scenarios must contain at least one scenario" };

  const scenarios: ScenarioId[] = [];
  for (const candidate of value.scenarios) {
    if (
      typeof candidate !== "string" ||
      !HARNESS_SCENARIO_IDS.includes(candidate as ScenarioId)
    ) {
      return { error: `Unknown harness scenario: ${String(candidate)}` };
    }
    const scenario = candidate as ScenarioId;
    if (!scenarios.includes(scenario)) scenarios.push(scenario);
  }
  return { pendingRun: { requestId, scenarios } };
}

export function parseHarnessSettings(value: unknown): ParsedHarnessSettings {
  if (!isRecord(value)) return { settings: DEFAULT_SETTINGS };
  const mode = parseMode(value.mode);
  if (!("pendingRun" in value)) {
    return { settings: { schemaVersion: 1, mode } };
  }

  if (value.schemaVersion !== 1) {
    return {
      settings: { schemaVersion: 1, mode },
      invalidPendingRun: value.pendingRun,
      pendingRunError: `Unsupported harness settings schema: ${String(value.schemaVersion)}`,
    };
  }

  const parsed = parsePendingRun(value.pendingRun);
  if ("pendingRun" in parsed) {
    return {
      settings: { schemaVersion: 1, mode, pendingRun: parsed.pendingRun },
    };
  }
  return {
    settings: { schemaVersion: 1, mode },
    invalidPendingRun: value.pendingRun,
    pendingRunError: parsed.error,
  };
}

export function serialiseHarnessSettings(
  settings: HarnessSettings,
  invalidPendingRun?: unknown,
): Record<string, unknown> {
  const data: Record<string, unknown> = {
    schemaVersion: 1,
    mode: settings.mode,
  };
  if (settings.pendingRun !== undefined) data.pendingRun = settings.pendingRun;
  else if (invalidPendingRun !== undefined)
    data.pendingRun = invalidPendingRun;
  return data;
}
