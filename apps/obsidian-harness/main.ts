import {
  App,
  ItemView,
  Modal,
  Notice,
  Platform,
  Plugin,
  PluginSettingTab,
  Setting,
  apiVersion,
  type WorkspaceLeaf,
} from "obsidian";
import {
  KeyedNoticeGroupManager,
  KeyedNoticeManager,
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
  showProgressNotice,
  type ProgressNotice,
} from "@vrtmrz/obsidian-plugin-kit";
import {
  createObsidianVaultFrontmatterAccess,
  createObsidianVaultTextAccess,
  VaultFrontmatterFileNotFoundError,
  VaultFrontmatterUnsupportedFileError,
  VaultTextFileExistsError,
  VaultTextFileNotFoundError,
} from "@vrtmrz/obsidian-plugin-kit/vault";
import {
  createScreenWakeLockManager,
  type ScreenWakeLockEvent,
  type ScreenWakeLockLease,
  type ScreenWakeLockManager,
} from "octagonal-wheels/browser/wakeLock";
import {
  parseHarnessSettings,
  serialiseHarnessSettings,
  type HarnessMode,
  type HarnessSettings,
  type ScenarioId,
} from "./settings.js";
import {
  describeOptionalVisibilityEvidence,
  formatHarnessMarkdownReport,
} from "./report.js";

const VIEW_TYPE = "fancy-kit-harness-wake-lock";
const MAX_TRANSCRIPT_ENTRIES = 200;
const DEFAULT_DURATION_SECONDS = 120;

type ShowcaseResult =
  string | null | { id: string; label: string; path: string };

type ScenarioMode = "automatic" | "guided";
type ScenarioStatus =
  | "idle"
  | "queued"
  | "running"
  | "waiting-for-user"
  | "passed"
  | "failed"
  | "inconclusive"
  | "cancelled";

interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  description: string;
  action: string;
  expected: string;
  mode: ScenarioMode;
}

interface ScenarioResult {
  status: ScenarioStatus;
  detail: string | null;
}

interface SuiteState {
  selected: ScenarioId[];
  running: boolean;
  current: ScenarioId | null;
  results: Record<ScenarioId, ScenarioResult>;
}

const SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: "vault-text",
    title: "Vault text contract",
    description:
      "Checks create, read, append, modify, duplicate-create, and missing-file behaviour through the packaged Obsidian adapter.",
    action:
      "Create temporary text fixtures in this dedicated Vault, exercise the contract, then remove every fixture.",
    expected:
      "Content and typed errors match the public contract, and the generated fixture folder is removed.",
    mode: "automatic",
  },
  {
    id: "vault-frontmatter",
    title: "Vault frontmatter contract",
    description:
      "Checks synchronous Markdown frontmatter updates and typed missing-file and unsupported-file errors.",
    action:
      "Create temporary Markdown and text fixtures, update frontmatter through Obsidian, then remove every fixture.",
    expected:
      "Obsidian persists the requested values, contract errors are typed, and the fixture folder is removed.",
    mode: "automatic",
  },
  {
    id: "wake-lock-nested",
    title: "Wake-lock lease contract",
    description:
      "Checks overlapping logical leases and reference counting without requiring physical platform support.",
    action: "Acquire two logical leases and dispose of them independently.",
    expected:
      "The lease count returns to its original value without a leaked lease.",
    mode: "automatic",
  },
  {
    id: "wake-lock-guided",
    title: "Mobile wake-lock review",
    description:
      "Guides the physical display and background-return checks that the WebView cannot complete by itself.",
    action:
      "Follow the displayed mobile instructions and confirm the physical result.",
    expected:
      "Automated lifecycle evidence and the separate physical-display decision are recorded in the report.",
    mode: "guided",
  },
];

const AUTOMATIC_SCENARIO_IDS = SCENARIOS.filter(
  ({ mode }) => mode === "automatic",
).map(({ id }) => id);
const ALL_SCENARIO_IDS = SCENARIOS.map(({ id }) => id);

function defaultScenarioIds(mode: HarnessMode | null): ScenarioId[] {
  return mode === "review"
    ? [...ALL_SCENARIO_IDS]
    : [...AUTOMATIC_SCENARIO_IDS];
}

function createScenarioResults(): Record<ScenarioId, ScenarioResult> {
  return Object.fromEntries(
    SCENARIOS.map(({ id }) => [id, { status: "idle", detail: null }]),
  ) as Record<ScenarioId, ScenarioResult>;
}

interface TranscriptEntry {
  at: string;
  event: string;
  detail?: unknown;
}

type GuidedStep =
  | "idle"
  | "preflight"
  | "timed-run"
  | "screen-confirmation"
  | "release-ready"
  | "release-waiting"
  | "visibility-ready"
  | "visibility-waiting"
  | "summary";

type GuidedOutcome =
  | "pending"
  | "passed"
  | "failed"
  | "inconclusive"
  | "unsupported"
  | "cancelled";

interface GuidedReviewState {
  step: GuidedStep;
  startedAt: string | null;
  completedAt: string | null;
  timed: {
    outcome: GuidedOutcome;
    durationSeconds: number;
    elapsedMilliseconds: number | null;
    maximumTimerDriftMilliseconds: number;
    displayStayedAwake: "yes" | "no" | "unsure" | null;
  };
  release: {
    outcome: GuidedOutcome;
    displaySwitchedOff: "yes" | "no" | "unsure" | null;
    hiddenObserved: boolean;
    returnedObserved: boolean;
    startedAt: string | null;
    completedAt: string | null;
    activeLeaseCountAtStart: number | null;
    sentinelHeldAtStart: boolean | null;
  };
  visibility: {
    outcome: GuidedOutcome;
    hiddenObserved: boolean;
    returnedObserved: boolean;
    reacquiredObserved: boolean;
    requestError: string | null;
  };
}

interface HarnessState {
  mode: HarnessMode | null;
  pendingRun: { requestId: string; scenarios: readonly ScenarioId[] } | null;
  pendingRunError: string | null;
  activeRequestId: string | null;
  completedRequestId: string | null;
  lastStory: string | null;
  lastAction: string | null;
  lastResult: ShowcaseResult;
  progressState: string | null;
  progressValue: number;
  remainingSeconds: number | null;
  transcript: TranscriptEntry[];
  guidedReview: GuidedReviewState;
  suite: SuiteState;
}

interface HarnessSnapshot extends HarnessState {
  platform: "mobile" | "desktop";
  secureContext: boolean;
  apiAvailable: boolean;
  visibility: string;
  supported: boolean;
  held: boolean;
  activeLeaseCount: number;
}

interface UserAgentData {
  readonly mobile?: boolean;
  readonly platform?: string;
  readonly brands?: readonly {
    readonly brand: string;
    readonly version: string;
  }[];
}

type HarnessNavigator = Navigator & {
  readonly wakeLock?: unknown;
  readonly userAgentData?: UserAgentData;
};

function createGuidedReviewState(): GuidedReviewState {
  return {
    step: "idle",
    startedAt: null,
    completedAt: null,
    timed: {
      outcome: "pending",
      durationSeconds: DEFAULT_DURATION_SECONDS,
      elapsedMilliseconds: null,
      maximumTimerDriftMilliseconds: 0,
      displayStayedAwake: null,
    },
    release: {
      outcome: "pending",
      displaySwitchedOff: null,
      hiddenObserved: false,
      returnedObserved: false,
      startedAt: null,
      completedAt: null,
      activeLeaseCountAtStart: null,
      sentinelHeldAtStart: null,
    },
    visibility: {
      outcome: "pending",
      hiddenObserved: false,
      returnedObserved: false,
      reacquiredObserved: false,
      requestError: null,
    },
  };
}

function describeError(error: unknown): string {
  return error instanceof Error
    ? `${error.name}: ${error.message}`
    : String(error);
}

function describeReportValue(value: unknown): string {
  if (value === null || value === undefined) return "Not recorded";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

async function waitWithSignal(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  if (signal.aborted)
    throw new DOMException("The operation was aborted", "AbortError");
  await new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, milliseconds);
    const onAbort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("The operation was aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

const MODE_LABELS: Record<HarnessMode, string> = {
  review: "Guided review",
  showcase: "Component showcase",
  automation: "Automated E2E",
};

class HarnessModeModal extends Modal {
  constructor(
    app: App,
    private readonly plugin: FancyKitHarnessPlugin,
  ) {
    super(app);
  }

  override onOpen(): void {
    this.setTitle("Choose how to use Fancy Kit Harness");
    this.contentEl.createEl("p", {
      text: "Use a dedicated test Vault. You can change this start-up mode later in the plug-in settings.",
    });
    this.addMode(
      "review",
      "Run selected, automatic, or guided real-device contract checks.",
      true,
    );
    this.addMode(
      "showcase",
      "Explore dialogs, notices, progress, and other Fancy Kit components individually.",
    );
    this.addMode(
      "automation",
      "Expose deterministic controls for an isolated automated E2E session.",
    );
  }

  override onClose(): void {
    this.contentEl.empty();
    this.plugin.handleModeModalClosed(this);
  }

  private addMode(
    mode: HarnessMode,
    description: string,
    recommended = false,
  ): void {
    new Setting(this.contentEl)
      .setName(`${MODE_LABELS[mode]}${recommended ? " (recommended)" : ""}`)
      .setDesc(description)
      .addButton((button) => {
        button.setButtonText("Select");
        if (recommended) button.setCta();
        button.onClick(() => void this.selectMode(mode));
      });
  }

  private async selectMode(mode: HarnessMode): Promise<void> {
    await this.plugin.setMode(mode);
    this.close();
    await this.plugin.openHarness();
  }
}

class HarnessSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: FancyKitHarnessPlugin,
  ) {
    super(app, plugin);
  }

  override display(): void {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "Fancy Kit Harness" });
    new Setting(this.containerEl)
      .setName("Start-up mode")
      .setDesc(
        "Select the initial view. Automation is intended for isolated test Vaults and does not run a test until a pending request is explicitly started.",
      )
      .addDropdown((dropdown) => {
        dropdown
          .addOption("", "Ask on next start")
          .addOption("review", MODE_LABELS.review)
          .addOption("showcase", MODE_LABELS.showcase)
          .addOption("automation", MODE_LABELS.automation)
          .setValue(this.plugin.mode ?? "")
          .onChange(
            (value) =>
              void this.plugin.setMode(
                value === "" ? null : (value as HarnessMode),
              ),
          );
      });

    const pending = this.plugin.e2e.pendingRun;
    new Setting(this.containerEl)
      .setName("Pending automated run")
      .setDesc(
        this.plugin.e2e.pendingRunError ??
          (pending === null
            ? "No one-shot automation request is pending."
            : `${pending.requestId}: ${pending.scenarios.join(", ")}`),
      );
  }
}

class WakeLockHarnessView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly plugin: FancyKitHarnessPlugin,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Fancy Kit Harness";
  }

  getIcon(): string {
    return "sun";
  }

  override async onOpen(): Promise<void> {
    this.render();
  }

  render(): void {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("fancy-kit-harness");
    container.createEl("h1", { text: "Fancy Kit Harness" });
    container.createEl("p", {
      text: "Review Fancy Kit contracts and explore the same components exercised by the real Obsidian E2E suite in this dedicated test Vault.",
    });

    container.createEl("p", {
      cls: "fancy-kit-harness__mode",
      text: `Start-up mode: ${this.plugin.mode === null ? "not selected" : MODE_LABELS[this.plugin.mode]}.`,
    });

    if (this.plugin.mode === "showcase") this.renderShowcase(container);
    if (this.plugin.mode === "automation") this.renderAutomation(container);

    this.renderScenarioRunner(container);

    const warning = container.createDiv({ cls: "fancy-kit-harness__warning" });
    warning.createEl("strong", { text: "Physical mobile check: " });
    warning.createSpan({
      text: "Keep Obsidian in the foreground and choose a duration longer than the device auto-lock timeout. This runner does not guarantee background execution.",
    });

    this.renderGuidedReview(container);
    this.renderStatus(container);
    const advanced = container.createEl("details", {
      cls: "fancy-kit-harness__advanced",
    });
    advanced.createEl("summary", { text: "Advanced controls" });
    this.renderTimedTest(advanced);
    this.renderExplicitLease(advanced);
    this.renderContractChecks(advanced);
    this.renderTranscript(container);
    if (this.plugin.mode !== "showcase") this.renderShowcase(container);
  }

  private renderAutomation(container: HTMLElement): void {
    const section = container.createDiv({
      cls: "fancy-kit-harness__automation",
    });
    section.dataset.testid = "automation-status";
    section.createEl("h2", { text: "Automated E2E" });
    const pending = this.plugin.e2e.pendingRun;
    section.createEl("p", {
      text:
        this.plugin.e2e.pendingRunError ??
        (pending === null
          ? "No one-shot test request is pending."
          : `Ready to start ${pending.requestId}: ${pending.scenarios.join(", ")}.`),
    });
    if (pending !== null && this.plugin.e2e.pendingRunError === null) {
      new Setting(section).addButton((button) => {
        button
          .setButtonText("Start pending run")
          .setCta()
          .onClick(() => void this.plugin.startPendingRun());
        button.buttonEl.dataset.testid = "automation-start-pending";
      });
    }
  }

  private renderShowcase(container: HTMLElement): void {
    const section = container.createDiv({ cls: "fancy-kit-harness__showcase" });
    section.dataset.testid = "component-showcase";
    section.createEl("h2", { text: "Component showcase" });
    section.createEl("p", {
      text: "Run individual UI stories backed by the same API used by the automated real-Obsidian suite.",
    });
    this.renderShowcaseSection(section, "Dialogs", [
      [
        "Text prompt",
        "Initial value, selection, Enter, Escape, and empty-string semantics.",
        "prompt-text",
      ],
      [
        "Password prompt",
        "Password input without retaining the value in the catalogue.",
        "prompt-password",
      ],
      [
        "Typed selection",
        "Select an object while preserving its identity.",
        "pick-one",
      ],
      [
        "Markdown confirmation",
        "Literal action types and Markdown content.",
        "confirm-action",
      ],
      [
        "Long Markdown confirmation",
        "Vertically stacked action labels, mobile safe areas, and owner-bound dismissal.",
        "confirm-action-long",
      ],
      [
        "Message",
        "A one-action informational Markdown dialog.",
        "show-message",
      ],
    ]);
    this.renderShowcaseSection(section, "Progress", [
      [
        "Progress Notice",
        "Start a deterministic three-step progress Notice.",
        "progress-start",
      ],
      [
        "Advance progress",
        "Advance the active progress story by one step.",
        "progress-step",
      ],
      [
        "Cancel progress",
        "Cancel the active progress story.",
        "progress-cancel",
      ],
    ]);
    this.renderShowcaseSection(section, "Notices", [
      [
        "Show keyed Notice",
        "Create a persistent Notice owned by an instance-scoped manager.",
        "notice-show",
      ],
      [
        "Update keyed Notice",
        "Update the same Notice and start its expiry.",
        "notice-update",
      ],
      [
        "Hide keyed Notice",
        "Hide and forget the keyed Notice explicitly.",
        "notice-hide",
      ],
      [
        "Start grouped Notice",
        "Create a persistent Notice with one named status row.",
        "notice-group-start",
      ],
      [
        "Add grouped result",
        "Add a second named row and an action without creating another Notice.",
        "notice-group-result",
      ],
      [
        "Finish grouped Notice",
        "Mark the grouped Notice complete and start its expiry.",
        "notice-group-finish",
      ],
    ]);

    const result = section.createDiv({ cls: "fancy-kit-harness__result" });
    result.dataset.testid = "showcase-last-result";
    result.createEl("strong", { text: "Last result: " });
    result.createSpan({ text: JSON.stringify(this.plugin.e2e.lastResult) });
  }

  private renderShowcaseSection(
    container: HTMLElement,
    title: string,
    stories: readonly (readonly [string, string, string])[],
  ): void {
    container.createEl("h3", { text: title });
    const grid = container.createDiv({ cls: "fancy-kit-harness__grid" });
    for (const [name, description, story] of stories) {
      const setting = new Setting(grid)
        .setName(name)
        .setDesc(description)
        .addButton((button) =>
          button
            .setButtonText("Run")
            .onClick(() => void this.plugin.runStory(story)),
        );
      setting.settingEl.dataset.testid = `story-${story}`;
    }
  }

  private renderScenarioRunner(container: HTMLElement): void {
    const suite = this.plugin.e2e.suite;
    const section = container.createDiv({ cls: "fancy-kit-harness__suite" });
    section.dataset.testid = "scenario-runner";
    section.createEl("h2", { text: "Test selection" });
    section.createEl("p", {
      text: "Run individual contracts, the automatic subset, or the complete review. Guided tests pause until the requested device action is complete.",
    });

    for (const scenario of SCENARIOS) {
      const row = section.createDiv({ cls: "fancy-kit-harness__scenario" });
      row.dataset.scenarioId = scenario.id;
      new Setting(row)
        .setName(scenario.title)
        .setDesc(`${scenario.description} Mode: ${scenario.mode}.`)
        .addToggle((toggle) => {
          toggle
            .setValue(suite.selected.includes(scenario.id))
            .setDisabled(suite.running)
            .onChange((selected) =>
              this.plugin.setScenarioSelected(scenario.id, selected),
            );
          toggle.toggleEl.dataset.testid = `scenario-select-${scenario.id}`;
        });
      const instructions = row.createDiv({
        cls: "fancy-kit-harness__scenario-instructions",
      });
      const action = instructions.createEl("p");
      action.createEl("strong", { text: "Action: " });
      action.createSpan({ text: scenario.action });
      const expectation = instructions.createEl("p");
      expectation.createEl("strong", { text: "Expected result: " });
      expectation.createSpan({ text: scenario.expected });
      const result = suite.results[scenario.id];
      const resultLine = instructions.createEl("p", {
        cls: `fancy-kit-harness__scenario-result is-${result.status}`,
      });
      resultLine.dataset.testid = `scenario-result-${scenario.id}`;
      resultLine.createEl("strong", { text: "Result: " });
      resultLine.createSpan({
        text:
          result.detail === null
            ? result.status
            : `${result.status} — ${result.detail}`,
      });
    }

    const scenarioActions = new Setting(section)
      .setName("Run tests")
      .setDesc(
        suite.running
          ? `Current scenario: ${suite.current ?? "finishing"}`
          : `${suite.selected.length} scenario(s) selected`,
      )
      .addButton((button) => {
        button
          .setButtonText("Run selected")
          .setCta()
          .setDisabled(suite.running || suite.selected.length === 0)
          .onClick(() => void this.plugin.runSelectedScenarios());
        button.buttonEl.dataset.testid = "scenario-run-selected";
      })
      .addButton((button) => {
        button
          .setButtonText("Run automatic")
          .setDisabled(suite.running)
          .onClick(() => void this.plugin.runScenarios(AUTOMATIC_SCENARIO_IDS));
        button.buttonEl.dataset.testid = "scenario-run-automatic";
      })
      .addButton((button) => {
        button
          .setButtonText("Run full review")
          .setDisabled(suite.running)
          .onClick(() => void this.plugin.runScenarios(ALL_SCENARIO_IDS));
        button.buttonEl.dataset.testid = "scenario-run-full";
      });
    scenarioActions.settingEl.addClass("fancy-kit-harness__scenario-actions");
  }

  private renderGuidedReview(container: HTMLElement): void {
    const review = this.plugin.e2e.guidedReview;
    const section = container.createDiv({ cls: "fancy-kit-harness__guided" });
    section.dataset.testid = "guided-review";
    section.createEl("h2", { text: "Guided mobile review" });

    const describeStep = (
      title: string,
      instruction: string,
      expected: string,
    ): void => {
      section.createEl("h3", { text: title });
      const action = section.createEl("p");
      action.createEl("strong", { text: "Action: " });
      action.createSpan({ text: instruction });
      const expectation = section.createEl("p");
      expectation.createEl("strong", { text: "Expected result: " });
      expectation.createSpan({ text: expected });
    };

    switch (review.step) {
      case "idle":
        describeStep(
          "Ready to review",
          "Start the guided review when the device and its auto-lock setting are available.",
          "The runner will explain each action, collect browser evidence, and ask only for results it cannot observe.",
        );
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Begin guided review")
            .setCta()
            .onClick(() => this.plugin.beginGuidedReview());
          button.buttonEl.dataset.testid = "guided-begin";
        });
        break;
      case "preflight":
        describeStep(
          "Step 1 of 4: prepare the device",
          `Set device auto-lock to less than ${this.plugin.durationSeconds} seconds, keep Obsidian in the foreground, and do not touch the display after starting.`,
          "The countdown should complete without the display switching off or the lock screen appearing.",
        );
        this.renderDurationSetting(section);
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Device ready — start test")
            .setCta()
            .onClick(() => void this.plugin.startGuidedTimedTest());
          button.buttonEl.dataset.testid = "guided-start-timed";
        });
        break;
      case "timed-run":
        describeStep(
          "Step 1 of 4: leave the device untouched",
          `Do not touch the device. Wait for the remaining ${this.plugin.e2e.remainingSeconds ?? 0} seconds.`,
          "The display remains awake, the countdown continues, and the runner releases its lease at the end.",
        );
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Cancel review")
            .onClick(() => this.plugin.cancelGuidedReview());
          button.buttonEl.dataset.testid = "guided-cancel";
        });
        break;
      case "screen-confirmation":
        describeStep(
          "Step 2 of 4: confirm the physical result",
          "Report what happened while the countdown was running.",
          "Choose Yes only if the display remained awake for the complete test without interaction.",
        );
        new Setting(section)
          .setName("Did the display stay awake throughout?")
          .addButton((button) => {
            button
              .setButtonText("Yes")
              .setCta()
              .onClick(() => this.plugin.recordDisplayResult("yes"));
            button.buttonEl.dataset.testid = "guided-display-yes";
          })
          .addButton((button) => {
            button
              .setButtonText("No")
              .onClick(() => this.plugin.recordDisplayResult("no"));
            button.buttonEl.dataset.testid = "guided-display-no";
          })
          .addButton((button) => {
            button
              .setButtonText("Unsure")
              .onClick(() => this.plugin.recordDisplayResult("unsure"));
            button.buttonEl.dataset.testid = "guided-display-unsure";
          })
          .settingEl.addClass("fancy-kit-harness__guided-actions");
        break;
      case "release-ready":
        describeStep(
          "Step 3 of 4: verify normal screen-off",
          "Start the check, leave Obsidian untouched, and wait for the normal device auto-lock timeout. Unlock the device and return to this view after the screen switches off.",
          "With no Harness wake-lock lease active, the operating system can switch the display off normally.",
        );
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Start without wake lock")
            .setCta()
            .onClick(() => this.plugin.startReleasedDisplayTest());
          button.buttonEl.dataset.testid = "guided-start-release";
        });
        break;
      case "release-waiting":
        describeStep(
          "Step 3 of 4: leave the device untouched",
          "Wait without touching the device. After the display switches off, unlock it, return to Obsidian, and record the result. If it remains on beyond the configured auto-lock timeout, choose No.",
          "The display switches off according to the device policy. Your answer is the result; page-visibility events are optional supporting evidence because an embedded WebView might not report screen power changes.",
        );
        new Setting(section)
          .setName("Did the display switch off after release?")
          .addButton((button) => {
            button
              .setButtonText("Yes")
              .setCta()
              .onClick(() => this.plugin.recordReleasedDisplayResult("yes"));
            button.buttonEl.dataset.testid = "guided-release-yes";
          })
          .addButton((button) => {
            button
              .setButtonText("No")
              .onClick(() => this.plugin.recordReleasedDisplayResult("no"));
            button.buttonEl.dataset.testid = "guided-release-no";
          })
          .addButton((button) => {
            button
              .setButtonText("Unsure")
              .onClick(() => this.plugin.recordReleasedDisplayResult("unsure"));
            button.buttonEl.dataset.testid = "guided-release-unsure";
          })
          .settingEl.addClass("fancy-kit-harness__guided-actions");
        break;
      case "visibility-ready":
        describeStep(
          "Step 4 of 4: background and return",
          "Tap Start, send Obsidian to the background for at least five seconds, then return to this view.",
          "The runner observes hidden and visible states, releases while hidden, and reacquires after returning when the platform supports it.",
        );
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Acquire lease and start")
            .setCta()
            .onClick(() => void this.plugin.startGuidedVisibilityTest());
          button.buttonEl.dataset.testid = "guided-start-visibility";
        });
        break;
      case "visibility-waiting":
        describeStep(
          "Step 4 of 4: perform the app switch",
          review.visibility.hiddenObserved
            ? "Return to Obsidian and wait while the runner collects the reacquisition result."
            : "Send Obsidian to the background now, wait at least five seconds, and then return.",
          "The transcript records visibility changes and the platform wake-lock lifecycle automatically.",
        );
        new Setting(section).addButton((button) => {
          button
            .setButtonText("Finish with current evidence")
            .onClick(() => void this.plugin.finishGuidedVisibilityTest());
          button.buttonEl.dataset.testid = "guided-finish-visibility";
        });
        break;
      case "summary":
        describeStep(
          "Review complete",
          "Inspect the collected evidence and copy the report for the pull request or release review.",
          "Automated checks and the physical-display confirmation are reported separately.",
        );
        this.renderGuidedSummary(section, review);
        new Setting(section)
          .addButton((button) => {
            button
              .setButtonText("Copy Markdown report")
              .setCta()
              .onClick(() => void this.plugin.copyReport());
            button.buttonEl.dataset.testid = "guided-copy-report";
          })
          .addButton((button) => {
            button
              .setButtonText("Start again")
              .onClick(() => void this.plugin.restartGuidedReview());
            button.buttonEl.dataset.testid = "guided-restart";
          });
        break;
    }
  }

  private renderGuidedSummary(
    container: HTMLElement,
    review: GuidedReviewState,
  ): void {
    const table = container.createEl("table", {
      cls: "fancy-kit-harness__status",
    });
    table.dataset.testid = "guided-summary";
    const rows: readonly (readonly [string, string])[] = [
      ["Physical display", review.timed.outcome],
      ["Post-release display", review.release.outcome],
      [
        "Post-release result",
        review.release.displaySwitchedOff ?? "Not recorded",
      ],
      [
        "Optional post-release visibility evidence",
        describeOptionalVisibilityEvidence(
          review.release.hiddenObserved,
          review.release.returnedObserved,
        ),
      ],
      [
        "Timed run elapsed",
        review.timed.elapsedMilliseconds === null
          ? "Not recorded"
          : `${review.timed.elapsedMilliseconds}ms`,
      ],
      [
        "Maximum timer drift",
        `${review.timed.maximumTimerDriftMilliseconds}ms`,
      ],
      ["Hidden observed", String(review.visibility.hiddenObserved)],
      ["Return observed", String(review.visibility.returnedObserved)],
      ["Wake lock reacquired", String(review.visibility.reacquiredObserved)],
      ["Visibility lifecycle", review.visibility.outcome],
    ];
    for (const [label, value] of rows) {
      const row = table.createEl("tr");
      row.createEl("th", { text: label });
      row.createEl("td", { text: value });
    }
  }

  private renderStatus(container: HTMLElement): void {
    container.createEl("h2", { text: "Status" });
    const status = this.plugin.snapshot();
    const table = container.createEl("table", {
      cls: "fancy-kit-harness__status",
    });
    table.dataset.testid = "wake-lock-status";
    const rows: readonly (readonly [string, string])[] = [
      ["Platform", status.platform],
      ["Secure context", String(status.secureContext)],
      ["Wake Lock API", String(status.apiAvailable)],
      ["Manager supported", String(status.supported)],
      ["Document visibility", status.visibility],
      ["Platform sentinel held", String(status.held)],
      ["Logical leases", String(status.activeLeaseCount)],
      [
        "Timed test remaining",
        status.remainingSeconds === null
          ? "Not running"
          : `${status.remainingSeconds}s`,
      ],
      ["Last action", status.lastAction ?? "None"],
      [
        "Last result",
        status.lastResult === null
          ? "None"
          : typeof status.lastResult === "string"
            ? status.lastResult
            : JSON.stringify(status.lastResult),
      ],
    ];
    for (const [label, value] of rows) {
      const row = table.createEl("tr");
      row.createEl("th", { text: label });
      const cell = row.createEl("td", { text: value });
      if (label === "Last result") {
        cell.addClass("fancy-kit-harness__result");
        cell.dataset.testid = "wake-lock-last-result";
      }
    }
  }

  private renderTimedTest(container: HTMLElement): void {
    container.createEl("h2", { text: "Recommended closure test" });
    this.renderDurationSetting(container);
    new Setting(container)
      .setName("Timed run()")
      .setDesc(
        "Acquires through run(), counts down, and releases through finally.",
      )
      .addButton((button) => {
        button
          .setButtonText("Start")
          .setCta()
          .setDisabled(this.plugin.isTimedTestRunning)
          .onClick(() => void this.plugin.runTimedTest());
        button.buttonEl.dataset.testid = "wake-lock-run-start";
      })
      .addButton((button) => {
        button
          .setButtonText("Cancel")
          .setDisabled(!this.plugin.isTimedTestRunning)
          .onClick(() => this.plugin.cancelTimedTest());
        button.buttonEl.dataset.testid = "wake-lock-run-cancel";
      });
  }

  private renderDurationSetting(container: HTMLElement): void {
    new Setting(container)
      .setName("Duration")
      .setDesc("Choose a duration longer than the device auto-lock timeout.")
      .addText((text) => {
        text.inputEl.type = "number";
        text.inputEl.min = "1";
        text.inputEl.max = "3600";
        text.setValue(String(this.plugin.durationSeconds));
        text.onChange((value) => this.plugin.setDurationSeconds(value));
        text.inputEl.dataset.testid = "wake-lock-duration";
      });
  }

  private renderExplicitLease(container: HTMLElement): void {
    container.createEl("h2", { text: "Advanced explicit lease" });
    new Setting(container)
      .setName("Split lifecycle")
      .setDesc(
        "Use only when one bounded callback cannot own the complete lifecycle.",
      )
      .addButton((button) => {
        button
          .setButtonText("Acquire")
          .setDisabled(this.plugin.hasExplicitLease)
          .onClick(() => void this.plugin.acquireExplicitLease());
        button.buttonEl.dataset.testid = "wake-lock-lease-acquire";
      })
      .addButton((button) => {
        button
          .setButtonText("Dispose")
          .setDisabled(!this.plugin.hasExplicitLease)
          .onClick(() => void this.plugin.disposeExplicitLease());
        button.buttonEl.dataset.testid = "wake-lock-lease-dispose";
      })
      .addButton((button) => {
        button
          .setButtonText("Abort")
          .setDisabled(!this.plugin.hasExplicitLease)
          .onClick(() => this.plugin.abortExplicitLease());
        button.buttonEl.dataset.testid = "wake-lock-lease-abort";
      });
  }

  private renderContractChecks(container: HTMLElement): void {
    container.createEl("h2", { text: "Runner checks" });
    new Setting(container)
      .setName("Nested lease contract")
      .setDesc("Checks reference counting without requiring platform support.")
      .addButton((button) => {
        button
          .setButtonText("Run check")
          .onClick(() => void this.plugin.runNestedLeaseCheck());
        button.buttonEl.dataset.testid = "wake-lock-nested-check";
      });
    new Setting(container)
      .setName("Diagnostic report")
      .setDesc(
        "Copies a Markdown report with device information, capability state, scenario results, and the transcript for review.",
      )
      .addButton((button) => {
        button
          .setButtonText("Copy Markdown report")
          .onClick(() => void this.plugin.copyReport());
        button.buttonEl.dataset.testid = "wake-lock-copy-report";
      })
      .addButton((button) => {
        button
          .setButtonText("Clear transcript")
          .onClick(() => this.plugin.clearTranscript());
        button.buttonEl.dataset.testid = "wake-lock-clear-transcript";
      });
  }

  private renderTranscript(container: HTMLElement): void {
    container.createEl("h2", { text: "Transcript" });
    const transcript = container.createEl("pre", {
      cls: "fancy-kit-harness__transcript",
    });
    transcript.dataset.testid = "wake-lock-transcript";
    transcript.setText(
      this.plugin.e2e.transcript.length === 0
        ? "No events recorded."
        : this.plugin.e2e.transcript
            .map((entry) => JSON.stringify(entry))
            .join("\n"),
    );
  }
}

export default class FancyKitHarnessPlugin extends Plugin {
  readonly e2e: HarnessState = {
    mode: null,
    pendingRun: null,
    pendingRunError: null,
    activeRequestId: null,
    completedRequestId: null,
    lastStory: null,
    lastAction: null,
    lastResult: null,
    progressState: null,
    progressValue: 0,
    remainingSeconds: null,
    transcript: [],
    guidedReview: createGuidedReviewState(),
    suite: {
      selected: [...AUTOMATIC_SCENARIO_IDS],
      running: false,
      current: null,
      results: createScenarioResults(),
    },
  };

  durationSeconds = DEFAULT_DURATION_SECONDS;
  private harnessSettings: HarnessSettings = { schemaVersion: 1, mode: null };
  private invalidPendingRun: unknown;
  private modeModal: HarnessModeModal | undefined;
  private wakeLock: ScreenWakeLockManager | undefined;
  private activeProgress: ProgressNotice | undefined;
  private readonly notices = new KeyedNoticeManager();
  private readonly groupedNotices = new KeyedNoticeGroupManager();
  private readonly dialogueController = new AbortController();
  private timedController: AbortController | undefined;
  private explicitController: AbortController | undefined;
  private explicitLease: ScreenWakeLockLease | undefined;
  private visibilityFinishTimeout: number | undefined;
  private guidedScenarioResolve: ((result: ScenarioResult) => void) | undefined;

  get mode(): HarnessMode | null {
    return this.harnessSettings.mode;
  }

  get isTimedTestRunning(): boolean {
    return this.timedController !== undefined;
  }

  get hasExplicitLease(): boolean {
    return this.explicitLease !== undefined && !this.explicitLease.released;
  }

  override async onload(): Promise<void> {
    const parsed = parseHarnessSettings(await this.loadData());
    this.harnessSettings = parsed.settings;
    this.invalidPendingRun = parsed.invalidPendingRun;
    this.e2e.mode = this.harnessSettings.mode;
    this.e2e.suite.selected = defaultScenarioIds(this.harnessSettings.mode);
    this.e2e.pendingRun = this.harnessSettings.pendingRun ?? null;
    this.e2e.pendingRunError = parsed.pendingRunError ?? null;
    this.wakeLock = createScreenWakeLockManager({
      onEvent: (event) => this.recordManagerEvent(event),
    });
    this.registerView(VIEW_TYPE, (leaf) => new WakeLockHarnessView(leaf, this));
    this.addSettingTab(new HarnessSettingTab(this.app, this));
    this.addRibbonIcon(
      "sun",
      "Open Fancy Kit Harness",
      () => void this.openHarness(),
    );
    this.addCommand({
      id: "open",
      name: "Open harness",
      callback: () => void this.openHarness(),
    });
    this.addCommand({
      id: "run-selected-scenarios",
      name: "Run selected contract scenarios",
      callback: () => void this.runSelectedScenarios(),
    });
    this.addCommand({
      id: "run-automatic-suite",
      name: "Run automatic contract suite",
      callback: () => void this.runScenarios(AUTOMATIC_SCENARIO_IDS),
    });
    this.addCommand({
      id: "run-full-review",
      name: "Run full contract review",
      callback: () => void this.runScenarios(ALL_SCENARIO_IDS),
    });
    for (const story of [
      "prompt-text",
      "prompt-password",
      "pick-one",
      "confirm-action",
      "confirm-action-long",
      "show-message",
      "progress-start",
      "progress-step",
      "progress-cancel",
      "notice-show",
      "notice-update",
      "notice-hide",
      "notice-group-start",
      "notice-group-result",
      "notice-group-finish",
    ]) {
      this.addAutomationCommand(`story-${story}`, `Story: ${story}`, () => {
        void this.runStory(story);
      });
    }
    this.addAutomationCommand(
      "e2e-run-short-test",
      "E2E: run short wake lock test",
      () => void this.runTimedTest(1),
    );
    this.addAutomationCommand(
      "e2e-start-guided-short-test",
      "E2E: start short guided wake lock test",
      () => {
        this.beginGuidedReview();
        this.durationSeconds = 1;
        void this.startGuidedTimedTest();
      },
    );
    this.addAutomationCommand(
      "e2e-confirm-display-yes",
      "E2E: confirm the guided display result",
      () => this.recordDisplayResult("yes"),
    );
    this.addAutomationCommand(
      "e2e-start-released-display-check",
      "E2E: start the post-release display check",
      () => this.startReleasedDisplayTest(),
    );
    this.addAutomationCommand(
      "e2e-confirm-released-display-yes",
      "E2E: confirm the post-release display result",
      () => this.recordReleasedDisplayResult("yes"),
    );
    this.addAutomationCommand(
      "e2e-run-automatic-suite",
      "E2E: run automatic contract suite",
      () => void this.runScenarios(AUTOMATIC_SCENARIO_IDS),
    );
    this.addAutomationCommand(
      "e2e-start-pending-run",
      "E2E: start pending run",
      () => void this.startPendingRun(),
    );
    this.registerDomEvent(document, "visibilitychange", () => {
      this.handleVisibilityChange();
    });
    this.app.workspace.onLayoutReady(() => {
      if (this.harnessSettings.mode === null) this.openModeSelection();
    });
    this.record("plugin-loaded", this.snapshot());
  }

  private addAutomationCommand(
    id: string,
    name: string,
    callback: () => void,
  ): void {
    this.addCommand({
      id,
      name,
      checkCallback: (checking) => {
        if (this.harnessSettings.mode !== "automation") return false;
        if (!checking) callback();
        return true;
      },
    });
  }

  override onunload(): void {
    this.dialogueController.abort();
    this.modeModal?.close();
    this.modeModal = undefined;
    this.activeProgress?.hide();
    this.notices.dispose();
    this.groupedNotices.dispose();
    this.timedController?.abort();
    this.explicitController?.abort();
    if (this.visibilityFinishTimeout !== undefined) {
      window.clearTimeout(this.visibilityFinishTimeout);
      this.visibilityFinishTimeout = undefined;
    }
    void this.explicitLease?.dispose();
    void this.wakeLock?.dispose();
    this.guidedScenarioResolve?.({
      status: "cancelled",
      detail: "The plug-in was unloaded during the guided scenario.",
    });
    this.guidedScenarioResolve = undefined;
    this.explicitLease = undefined;
    this.wakeLock = undefined;
  }

  async openHarness(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  private openModeSelection(): void {
    if (this.modeModal !== undefined) return;
    this.modeModal = new HarnessModeModal(this.app, this);
    this.modeModal.open();
  }

  handleModeModalClosed(modal: HarnessModeModal): void {
    if (this.modeModal === modal) this.modeModal = undefined;
  }

  async setMode(mode: HarnessMode | null): Promise<void> {
    const settings: HarnessSettings = { ...this.harnessSettings, mode };
    await this.saveData(
      serialiseHarnessSettings(settings, this.invalidPendingRun),
    );
    this.harnessSettings = settings;
    this.e2e.mode = mode;
    this.e2e.suite.selected = defaultScenarioIds(mode);
    this.refreshViews();
  }

  async startPendingRun(): Promise<void> {
    if (this.harnessSettings.mode !== "automation") {
      new Notice("Select Automated E2E mode before starting a pending run.");
      return;
    }
    if (this.e2e.pendingRunError !== null) {
      new Notice(`Pending run is invalid: ${this.e2e.pendingRunError}`);
      return;
    }
    const pending = this.harnessSettings.pendingRun;
    if (pending === undefined) {
      new Notice("No pending automation run is available.");
      return;
    }
    if (this.e2e.suite.running || this.e2e.activeRequestId !== null) {
      new Notice("An automation run is already active.");
      return;
    }

    const consumedSettings: HarnessSettings = {
      schemaVersion: 1,
      mode: this.harnessSettings.mode,
    };
    await this.saveData(serialiseHarnessSettings(consumedSettings));
    this.harnessSettings = consumedSettings;
    this.invalidPendingRun = undefined;
    this.e2e.pendingRun = null;
    this.e2e.activeRequestId = pending.requestId;
    this.e2e.completedRequestId = null;
    this.record("automation-request-consumed", {
      requestId: pending.requestId,
      scenarios: pending.scenarios,
    });
    this.refreshViews();

    try {
      await this.runScenarios(pending.scenarios);
      this.e2e.completedRequestId = pending.requestId;
    } finally {
      this.e2e.activeRequestId = null;
      this.refreshViews();
    }
  }

  async runStory(story: string): Promise<void> {
    this.e2e.lastStory = story;
    this.e2e.lastAction = "showcase-story";
    switch (story) {
      case "prompt-text":
        this.setResult(
          await promptText(
            this.app,
            {
              title: "Device name",
              label: "Name",
              placeholder: "Enter a device name",
              initialValue: "desktop",
              selectInitialValue: true,
            },
            { signal: this.dialogueController.signal },
          ),
        );
        break;
      case "prompt-password": {
        const result = await promptPassword(
          this.app,
          {
            title: "Passphrase",
            label: "Passphrase",
          },
          { signal: this.dialogueController.signal },
        );
        this.setResult(result === null ? null : "password-entered");
        break;
      }
      case "pick-one": {
        const items = [
          { id: "alpha", label: "Alpha", path: "Targets/alpha.md" },
          { id: "beta", label: "Beta", path: "Targets/beta.md" },
          { id: "gamma", label: "Gamma", path: "Targets/gamma.md" },
        ];
        this.setResult(
          await pickOne(
            this.app,
            {
              items,
              getText: (item) => item.label,
              getDescription: (item) => item.path,
              placeholder: "Select a target",
            },
            { signal: this.dialogueController.signal },
          ),
        );
        break;
      }
      case "confirm-action":
        this.setResult(
          await confirmAction(
            this.app,
            {
              title: "Restore confirmation",
              message: "**3 files** will be restored. Continue?",
              actions: ["restore", "cancel"] as const,
              labels: { restore: "Restore", cancel: "Cancel" },
              defaultAction: "cancel",
            },
            { signal: this.dialogueController.signal },
          ),
        );
        break;
      case "confirm-action-long":
        this.setResult(
          await confirmAction(
            this.app,
            {
              title: "Compatibility review",
              message:
                "Review the release notes and update the other devices before resuming synchronisation.",
              actions: ["resume", "pause"] as const,
              labels: {
                resume:
                  "I have reviewed this and updated my other devices — Resume synchronisation",
                pause: "Keep synchronisation paused",
              },
              actionLayout: "vertical",
              defaultAction: "pause",
            },
            { signal: this.dialogueController.signal },
          ),
        );
        break;
      case "show-message":
        await showMessage(
          this.app,
          {
            title: "Information",
            message: "The showcase is **ready**.",
            closeLabel: "OK",
          },
          { signal: this.dialogueController.signal },
        );
        this.setResult("closed");
        break;
      case "progress-start":
        this.activeProgress?.hide();
        this.activeProgress = showProgressNotice({
          title: "Showcase progress",
          note: "Ready",
          total: 3,
          hideOnCompleteMs: 750,
          hideOnCancelMs: 750,
          onComplete: ({ state, value }) => this.setProgressState(state, value),
          onCancel: ({ state, value }) => this.setProgressState(state, value),
        });
        this.setProgressState("running", 0);
        this.setResult("started");
        break;
      case "progress-step":
        if (this.activeProgress === undefined)
          await this.runStory("progress-start");
        this.activeProgress?.update({
          note: `Step ${(this.activeProgress?.progress.value ?? 0) + 1}`,
        });
        this.activeProgress?.increment();
        this.setProgressState(
          this.activeProgress?.progress.state ?? "missing",
          this.activeProgress?.progress.value ?? 0,
        );
        this.setResult(`step-${this.e2e.progressValue}`);
        break;
      case "progress-cancel":
        this.activeProgress?.cancel("Cancelled by the showcase");
        this.setProgressState(
          this.activeProgress?.progress.state ?? "missing",
          this.activeProgress?.progress.value ?? 0,
        );
        this.setResult("cancelled");
        break;
      case "notice-show":
        this.notices.show("showcase-scan", "Scanning Vault: 1", {
          durationMs: false,
        });
        this.setResult("notice-shown");
        break;
      case "notice-update":
        this.notices.show("showcase-scan", "Scanning Vault: 2", {
          durationMs: 750,
        });
        this.setResult("notice-updated");
        break;
      case "notice-hide":
        this.notices.hide("showcase-scan");
        this.setResult("notice-hidden");
        break;
      case "notice-group-start":
        this.groupedNotices.setItem("showcase-integrity", "checking", {
          message: "Checking for incomplete documents...",
        });
        this.setResult("notice-group-started");
        break;
      case "notice-group-result":
        this.groupedNotices.setItem("showcase-integrity", "result", {
          message: "No size mismatches found",
          action: {
            label: "Dismiss this notification",
            onSelect: () => {
              this.groupedNotices.hide("showcase-integrity");
              this.setResult("notice-group-dismissed");
            },
          },
        });
        this.setResult("notice-group-result-added");
        break;
      case "notice-group-finish":
        this.groupedNotices.finish("showcase-integrity", {
          durationMs: 750,
        });
        this.setResult("notice-group-finished");
        break;
      default:
        throw new Error(`Unknown showcase story: ${story}`);
    }
  }

  private setResult(result: ShowcaseResult): void {
    this.e2e.lastResult = result;
    this.refreshViews();
  }

  private setProgressState(state: string, value: number): void {
    this.e2e.progressState = state;
    this.e2e.progressValue = value;
    this.refreshViews();
  }

  setScenarioSelected(id: ScenarioId, selected: boolean): void {
    if (this.e2e.suite.running) return;
    const current = new Set(this.e2e.suite.selected);
    if (selected) current.add(id);
    else current.delete(id);
    this.e2e.suite.selected = SCENARIOS.map(
      ({ id: candidate }) => candidate,
    ).filter((candidate) => current.has(candidate));
    this.refreshViews();
  }

  async runSelectedScenarios(): Promise<void> {
    await this.runScenarios(this.e2e.suite.selected);
  }

  async runScenarios(ids: readonly ScenarioId[]): Promise<void> {
    const suite = this.e2e.suite;
    if (suite.running) {
      new Notice("A Fancy Kit scenario suite is already running.");
      return;
    }
    const selected = SCENARIOS.map(({ id }) => id).filter((id) =>
      ids.includes(id),
    );
    if (selected.length === 0) {
      new Notice("Select at least one scenario.");
      return;
    }

    suite.selected = [...selected];
    suite.running = true;
    suite.current = null;
    suite.results = createScenarioResults();
    for (const id of selected) suite.results[id].status = "queued";
    this.e2e.lastAction = "scenario-suite-started";
    this.e2e.lastResult = "running";
    this.record("scenario-suite-started", { selected });
    this.refreshViews();

    try {
      for (const id of selected) {
        suite.current = id;
        suite.results[id] = { status: "running", detail: null };
        this.record("scenario-started", { id });
        this.refreshViews();
        const result = await this.runScenario(id);
        suite.results[id] = result;
        this.record("scenario-completed", { id, ...result });
        this.refreshViews();
      }
      const failed = selected.filter(
        (id) => suite.results[id].status === "failed",
      );
      const inconclusive = selected.filter((id) =>
        ["inconclusive", "cancelled"].includes(suite.results[id].status),
      );
      this.e2e.lastAction = "scenario-suite-completed";
      this.e2e.lastResult =
        failed.length > 0
          ? `scenario-suite-failed:${failed.join(",")}`
          : inconclusive.length > 0
            ? `scenario-suite-inconclusive:${inconclusive.join(",")}`
            : "scenario-suite-passed";
      this.record("scenario-suite-completed", {
        failed,
        inconclusive,
      });
    } finally {
      suite.running = false;
      suite.current = null;
      this.refreshViews();
    }
  }

  private async runScenario(id: ScenarioId): Promise<ScenarioResult> {
    try {
      switch (id) {
        case "vault-text":
          return await this.runVaultTextContract();
        case "vault-frontmatter":
          return await this.runVaultFrontmatterContract();
        case "wake-lock-nested":
          return await this.runNestedLeaseContract();
        case "wake-lock-guided":
          return await this.runGuidedWakeLockScenario();
      }
    } catch (error) {
      return { status: "failed", detail: describeError(error) };
    }
  }

  private createFixtureRoot(): string {
    const suffix = Math.random().toString(36).slice(2, 10);
    return `Fancy Kit Harness ${Date.now()} ${suffix}`;
  }

  private async removeFixtureRoot(root: string): Promise<void> {
    const fixture = this.app.vault.getAbstractFileByPath(root);
    if (fixture !== null) await this.app.vault.delete(fixture, true);
    if (this.app.vault.getAbstractFileByPath(root) !== null) {
      throw new Error("The generated fixture folder was not removed");
    }
  }

  private async expectContractError(
    operation: () => Promise<unknown>,
    predicate: (error: unknown) => boolean,
    label: string,
  ): Promise<void> {
    try {
      await operation();
    } catch (error) {
      if (predicate(error)) return;
      throw new Error(
        `${label} returned an unexpected error: ${describeError(error)}`,
      );
    }
    throw new Error(`${label} did not reject`);
  }

  private async runVaultTextContract(): Promise<ScenarioResult> {
    const root = this.createFixtureRoot();
    const path = `${root}/contract.md`;
    const missingPath = `${root}/missing.md`;
    const vault = createObsidianVaultTextAccess(this.app.vault);
    await this.app.vault.createFolder(root);
    try {
      await vault.createText(path, "created");
      if ((await vault.readText(path)) !== "created") {
        throw new Error("createText/readText content did not match");
      }
      await vault.appendText(path, " + appended");
      if ((await vault.readText(path)) !== "created + appended") {
        throw new Error("appendText content did not match");
      }
      await vault.modifyText(path, "modified");
      if ((await vault.readText(path)) !== "modified") {
        throw new Error("modifyText content did not match");
      }
      await this.expectContractError(
        () => vault.createText(path, "duplicate"),
        (error) => error instanceof VaultTextFileExistsError,
        "duplicate createText",
      );
      await this.expectContractError(
        () => vault.readText(missingPath),
        (error) => error instanceof VaultTextFileNotFoundError,
        "missing readText",
      );
      await this.expectContractError(
        () => vault.modifyText(missingPath, "missing"),
        (error) => error instanceof VaultTextFileNotFoundError,
        "missing modifyText",
      );
      await this.expectContractError(
        () => vault.appendText(missingPath, "missing"),
        (error) => error instanceof VaultTextFileNotFoundError,
        "missing appendText",
      );
      return {
        status: "passed",
        detail:
          "Four operations and four typed error paths matched the contract.",
      };
    } finally {
      await this.removeFixtureRoot(root);
    }
  }

  private async runVaultFrontmatterContract(): Promise<ScenarioResult> {
    const root = this.createFixtureRoot();
    const markdownPath = `${root}/contract.md`;
    const textPath = `${root}/contract.txt`;
    const missingPath = `${root}/missing.md`;
    const frontmatter = createObsidianVaultFrontmatterAccess(this.app);
    await this.app.vault.createFolder(root);
    try {
      const markdown = await this.app.vault.create(
        markdownPath,
        "---\nexisting: true\n---\n# Contract fixture\n",
      );
      await this.app.vault.create(textPath, "not Markdown");
      await frontmatter.updateFrontmatter(markdownPath, (value) => {
        value.harness = "updated";
        value.count = 2;
      });

      let observed: Record<string, unknown> = {};
      await this.app.fileManager.processFrontMatter(markdown, (value) => {
        observed = { ...value };
      });
      if (
        observed.existing !== true ||
        observed.harness !== "updated" ||
        observed.count !== 2
      ) {
        throw new Error(
          `Persisted frontmatter did not match: ${JSON.stringify(observed)}`,
        );
      }
      await this.expectContractError(
        () => frontmatter.updateFrontmatter(missingPath, () => undefined),
        (error) => error instanceof VaultFrontmatterFileNotFoundError,
        "missing frontmatter update",
      );
      await this.expectContractError(
        () => frontmatter.updateFrontmatter(textPath, () => undefined),
        (error) => error instanceof VaultFrontmatterUnsupportedFileError,
        "non-Markdown frontmatter update",
      );
      return {
        status: "passed",
        detail: "Persistence and two typed error paths matched the contract.",
      };
    } finally {
      await this.removeFixtureRoot(root);
    }
  }

  private async runGuidedWakeLockScenario(): Promise<ScenarioResult> {
    if (this.guidedScenarioResolve !== undefined) {
      throw new Error("A guided wake-lock scenario is already waiting");
    }
    this.e2e.suite.results["wake-lock-guided"] = {
      status: "waiting-for-user",
      detail: "Follow the guided mobile instructions below.",
    };
    this.beginGuidedReview();
    this.refreshViews();
    return await new Promise<ScenarioResult>((resolve) => {
      this.guidedScenarioResolve = resolve;
    });
  }

  private completeGuidedScenario(result: ScenarioResult): void {
    const resolve = this.guidedScenarioResolve;
    this.guidedScenarioResolve = undefined;
    resolve?.(result);
  }

  private guidedScenarioResult(): ScenarioResult {
    const review = this.e2e.guidedReview;
    if (
      review.timed.outcome === "failed" ||
      review.release.outcome === "failed" ||
      review.visibility.outcome === "failed"
    ) {
      return {
        status: "failed",
        detail:
          "The wake-lock display, post-release display, or visibility lifecycle check failed.",
      };
    }
    if (
      review.timed.outcome === "passed" &&
      review.release.outcome === "passed" &&
      review.visibility.outcome === "passed"
    ) {
      return {
        status: "passed",
        detail:
          "The wake-lock display, post-release display, and visibility lifecycle checks passed.",
      };
    }
    return {
      status: "inconclusive",
      detail:
        "The collected platform evidence did not support a complete pass or failure.",
    };
  }

  setDurationSeconds(value: string): void {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    this.durationSeconds = Math.max(1, Math.min(3600, Math.round(parsed)));
    if (this.e2e.guidedReview.step === "preflight") {
      this.e2e.guidedReview.timed.durationSeconds = this.durationSeconds;
    }
  }

  beginGuidedReview(): void {
    this.e2e.guidedReview = createGuidedReviewState();
    this.e2e.guidedReview.step = "preflight";
    this.e2e.guidedReview.startedAt = new Date().toISOString();
    this.e2e.guidedReview.timed.durationSeconds = this.durationSeconds;
    this.e2e.lastAction = "guided-review-started";
    this.e2e.lastResult = "waiting-for-device";
    this.record("guided-review-started", {
      durationSeconds: this.durationSeconds,
    });
    this.refreshViews();
  }

  async restartGuidedReview(): Promise<void> {
    this.timedController?.abort();
    await this.disposeExplicitLease();
    this.beginGuidedReview();
  }

  async startGuidedTimedTest(): Promise<void> {
    const review = this.e2e.guidedReview;
    review.step = "timed-run";
    review.timed.durationSeconds = this.durationSeconds;
    review.timed.outcome = "pending";
    await this.runTimedTest(this.durationSeconds, true);
  }

  cancelGuidedReview(): void {
    const review = this.e2e.guidedReview;
    if (review.timed.outcome === "pending") review.timed.outcome = "cancelled";
    if (review.release.outcome === "pending")
      review.release.outcome = "cancelled";
    if (review.visibility.outcome === "pending")
      review.visibility.outcome = "cancelled";
    review.step = "summary";
    review.completedAt = new Date().toISOString();
    this.timedController?.abort();
    this.e2e.lastAction = "guided-review-cancelled";
    this.e2e.lastResult = "guided-review-cancelled";
    this.record("guided-review-cancelled");
    this.refreshViews();
    this.completeGuidedScenario({
      status: "cancelled",
      detail: "The guided review was cancelled.",
    });
  }

  recordDisplayResult(result: "yes" | "no" | "unsure"): void {
    const review = this.e2e.guidedReview;
    review.timed.displayStayedAwake = result;
    review.timed.outcome =
      result === "yes" ? "passed" : result === "no" ? "failed" : "inconclusive";
    review.step = "release-ready";
    this.e2e.lastAction = "physical-display-confirmation";
    this.e2e.lastResult = `display-stayed-awake-${result}`;
    this.record("physical-display-confirmed", { result });
    this.refreshViews();
  }

  startReleasedDisplayTest(): void {
    const review = this.e2e.guidedReview;
    if (review.step !== "release-ready") return;
    const wakeLock = this.requireWakeLock();
    review.release = {
      outcome: "pending",
      displaySwitchedOff: null,
      hiddenObserved: false,
      returnedObserved: false,
      startedAt: new Date().toISOString(),
      completedAt: null,
      activeLeaseCountAtStart: wakeLock.activeLeaseCount,
      sentinelHeldAtStart: wakeLock.held,
    };
    review.step = "release-waiting";
    this.e2e.lastAction = "post-release-display-started";
    this.e2e.lastResult = "waiting-for-screen-off";
    this.record("post-release-check-started", {
      activeLeaseCount: wakeLock.activeLeaseCount,
      sentinelHeld: wakeLock.held,
    });
    this.refreshViews();
  }

  recordReleasedDisplayResult(result: "yes" | "no" | "unsure"): void {
    const review = this.e2e.guidedReview;
    if (review.step !== "release-waiting") return;
    const leakedAtStart =
      (review.release.activeLeaseCountAtStart ?? 0) > 0 ||
      review.release.sentinelHeldAtStart === true;
    review.release.displaySwitchedOff = result;
    review.release.completedAt = new Date().toISOString();
    review.release.outcome = leakedAtStart
      ? "failed"
      : result === "yes"
        ? "passed"
        : result === "no"
          ? "failed"
          : "inconclusive";
    review.step = "visibility-ready";
    this.e2e.lastAction = "post-release-display-confirmation";
    this.e2e.lastResult = `display-switched-off-${result}`;
    this.record("post-release-display-confirmed", {
      result,
      outcome: review.release.outcome,
      activeLeaseCountAtStart: review.release.activeLeaseCountAtStart,
      sentinelHeldAtStart: review.release.sentinelHeldAtStart,
      hiddenObserved: review.release.hiddenObserved,
      returnedObserved: review.release.returnedObserved,
    });
    this.refreshViews();
  }

  async startGuidedVisibilityTest(): Promise<void> {
    const review = this.e2e.guidedReview;
    review.step = "visibility-waiting";
    review.visibility = {
      outcome: "pending",
      hiddenObserved: false,
      returnedObserved: false,
      reacquiredObserved: false,
      requestError: null,
    };
    this.e2e.lastAction = "guided-visibility-started";
    this.e2e.lastResult = "waiting-for-background";
    this.record("guided-visibility-started");
    await this.acquireExplicitLease();
    this.refreshViews();
  }

  async finishGuidedVisibilityTest(): Promise<void> {
    const review = this.e2e.guidedReview;
    if (review.step !== "visibility-waiting") return;
    if (this.visibilityFinishTimeout !== undefined) {
      window.clearTimeout(this.visibilityFinishTimeout);
      this.visibilityFinishTimeout = undefined;
    }
    const supported = this.wakeLock?.supported ?? false;
    await this.disposeExplicitLease();
    if (
      !review.visibility.hiddenObserved ||
      !review.visibility.returnedObserved
    ) {
      review.visibility.outcome = "inconclusive";
    } else if (!supported) {
      review.visibility.outcome = "unsupported";
    } else if (review.visibility.reacquiredObserved) {
      review.visibility.outcome = "passed";
    } else if (review.visibility.requestError !== null) {
      review.visibility.outcome = "failed";
    } else {
      review.visibility.outcome = "failed";
    }
    review.step = "summary";
    review.completedAt = new Date().toISOString();
    this.e2e.lastAction = "guided-review-completed";
    this.e2e.lastResult = `guided-review-${review.visibility.outcome}`;
    this.record("guided-review-completed", {
      timedOutcome: review.timed.outcome,
      releaseOutcome: review.release.outcome,
      visibilityOutcome: review.visibility.outcome,
    });
    this.refreshViews();
    this.completeGuidedScenario(this.guidedScenarioResult());
  }

  async runTimedTest(
    durationSeconds = this.durationSeconds,
    guided = false,
  ): Promise<void> {
    if (this.timedController !== undefined) {
      new Notice("A timed wake lock test is already running.");
      return;
    }
    const wakeLock = this.requireWakeLock();
    const controller = new AbortController();
    this.timedController = controller;
    this.e2e.lastAction = "timed-run";
    this.e2e.lastResult = "running";
    this.record("timed-run-started", { durationSeconds });
    this.refreshViews();
    const startedAt = Date.now();
    let maximumTimerDriftMilliseconds = 0;

    try {
      await wakeLock.run(
        async () => {
          const deadline = Date.now() + durationSeconds * 1000;
          while (true) {
            const remainingMilliseconds = Math.max(0, deadline - Date.now());
            this.e2e.remainingSeconds = Math.ceil(remainingMilliseconds / 1000);
            this.refreshViews();
            if (remainingMilliseconds === 0) break;
            const delayMilliseconds = Math.min(1000, remainingMilliseconds);
            const expectedResumeAt = Date.now() + delayMilliseconds;
            await waitWithSignal(delayMilliseconds, controller.signal);
            maximumTimerDriftMilliseconds = Math.max(
              maximumTimerDriftMilliseconds,
              Math.max(0, Date.now() - expectedResumeAt),
            );
          }
        },
        { signal: controller.signal, label: "timed-run" },
      );
      this.e2e.lastResult = "timed-run-completed";
      this.record("timed-run-completed", { durationSeconds });
      if (guided) this.e2e.guidedReview.step = "screen-confirmation";
    } catch (error) {
      if (isAbortError(error)) {
        this.e2e.lastResult = "timed-run-cancelled";
        this.record("timed-run-cancelled");
        if (guided && this.e2e.guidedReview.step !== "summary") {
          this.e2e.guidedReview.timed.outcome = "cancelled";
          this.e2e.guidedReview.step = "summary";
          this.e2e.guidedReview.completedAt = new Date().toISOString();
        }
      } else {
        this.e2e.lastResult = `timed-run-failed: ${describeError(error)}`;
        this.record("timed-run-failed", { error: describeError(error) });
        if (guided) {
          this.e2e.guidedReview.timed.outcome = "failed";
          this.e2e.guidedReview.step = "summary";
          this.e2e.guidedReview.completedAt = new Date().toISOString();
          this.completeGuidedScenario({
            status: "failed",
            detail: `The timed wake-lock test failed: ${describeError(error)}`,
          });
        }
      }
    } finally {
      if (guided) {
        this.e2e.guidedReview.timed.elapsedMilliseconds =
          Date.now() - startedAt;
        this.e2e.guidedReview.timed.maximumTimerDriftMilliseconds =
          maximumTimerDriftMilliseconds;
      }
      if (this.timedController === controller) this.timedController = undefined;
      this.e2e.remainingSeconds = null;
      this.refreshViews();
    }
  }

  cancelTimedTest(): void {
    this.timedController?.abort();
  }

  async acquireExplicitLease(): Promise<void> {
    if (this.hasExplicitLease) return;
    const controller = new AbortController();
    this.explicitController = controller;
    this.explicitLease = await this.requireWakeLock().acquire({
      signal: controller.signal,
      label: "explicit-runner-lease",
    });
    this.e2e.lastAction = "explicit-acquire";
    this.e2e.lastResult = this.explicitLease.released
      ? "explicit-lease-inert"
      : "explicit-lease-acquired";
    this.record("explicit-lease-acquired", {
      released: this.explicitLease.released,
    });
    this.refreshViews();
  }

  async disposeExplicitLease(): Promise<void> {
    const lease = this.explicitLease;
    if (lease === undefined) return;
    await lease.dispose();
    this.explicitLease = undefined;
    this.explicitController = undefined;
    this.e2e.lastAction = "explicit-dispose";
    this.e2e.lastResult = "explicit-lease-disposed";
    this.record("explicit-lease-disposed");
    this.refreshViews();
  }

  abortExplicitLease(): void {
    if (this.explicitLease === undefined) return;
    this.explicitController?.abort();
    this.explicitLease = undefined;
    this.explicitController = undefined;
    this.e2e.lastAction = "explicit-abort";
    this.e2e.lastResult = "explicit-lease-aborted";
    this.record("explicit-lease-aborted");
    this.refreshViews();
  }

  async runNestedLeaseCheck(): Promise<void> {
    this.e2e.lastAction = "nested-check";
    this.e2e.lastResult = "running";
    this.record("nested-check-started");
    try {
      await this.runNestedLeaseContract();
      this.e2e.lastResult = "nested-check-passed";
      this.record("nested-check-passed");
    } catch (error) {
      this.e2e.lastResult = `nested-check-failed: ${describeError(error)}`;
      this.record("nested-check-failed", { error: describeError(error) });
    } finally {
      this.refreshViews();
    }
  }

  private async runNestedLeaseContract(): Promise<ScenarioResult> {
    const wakeLock = this.requireWakeLock();
    const baseline = wakeLock.activeLeaseCount;
    let first: ScreenWakeLockLease | undefined;
    let second: ScreenWakeLockLease | undefined;
    try {
      first = await wakeLock.acquire({ label: "nested-first" });
      second = await wakeLock.acquire({ label: "nested-second" });
      if (wakeLock.activeLeaseCount !== baseline + 2) {
        throw new Error(
          `Expected ${baseline + 2} leases, got ${wakeLock.activeLeaseCount}`,
        );
      }
      await first.dispose();
      first = undefined;
      if (wakeLock.activeLeaseCount !== baseline + 1) {
        throw new Error(
          `Expected ${baseline + 1} lease, got ${wakeLock.activeLeaseCount}`,
        );
      }
      await second.dispose();
      second = undefined;
      if (wakeLock.activeLeaseCount !== baseline) {
        throw new Error(
          `Expected ${baseline} leases, got ${wakeLock.activeLeaseCount}`,
        );
      }
      return {
        status: "passed",
        detail: "Two overlapping leases returned to the baseline count.",
      };
    } finally {
      await first?.dispose();
      await second?.dispose();
    }
  }

  async copyReport(): Promise<void> {
    const report = this.createMarkdownReport();
    try {
      await navigator.clipboard.writeText(report);
      this.e2e.lastAction = "copy-report";
      this.e2e.lastResult = "report-copied";
      this.record("report-copied");
      new Notice("Markdown Harness report copied.");
    } catch (error) {
      this.e2e.lastResult = `report-copy-failed: ${describeError(error)}`;
      this.record("report-copy-failed", { error: describeError(error) });
      new Notice(
        "Could not copy the Harness report. The transcript remains visible.",
      );
    }
    this.refreshViews();
  }

  createMarkdownReport(): string {
    const snapshot = this.snapshot();
    const browserNavigator = navigator as HarnessNavigator;
    const userAgentData = browserNavigator.userAgentData;
    const brands = userAgentData?.brands
      ?.map(({ brand, version }) => `${brand} ${version}`)
      .join(", ");
    const lastResult =
      snapshot.lastAction === "showcase-story"
        ? "Showcase result omitted from report."
        : describeReportValue(snapshot.lastResult);
    return formatHarnessMarkdownReport({
      generatedAt: new Date().toISOString(),
      environment: [
        { label: "Harness version", value: this.manifest.version },
        { label: "Obsidian API version", value: apiVersion },
        { label: "Platform", value: snapshot.platform },
        { label: "User agent", value: browserNavigator.userAgent },
        {
          label: "Navigator platform",
          value: browserNavigator.platform || "Not exposed",
        },
        {
          label: "User-agent client hints",
          value:
            userAgentData === undefined
              ? "Not exposed"
              : [
                  userAgentData.platform ?? "unknown platform",
                  `mobile=${String(userAgentData.mobile ?? false)}`,
                  brands || "brands not exposed",
                ].join("; "),
        },
        {
          label: "Viewport",
          value: `${window.innerWidth} × ${window.innerHeight} CSS px`,
        },
        {
          label: "Screen",
          value: `${screen.width} × ${screen.height} CSS px`,
        },
        {
          label: "Device pixel ratio",
          value: String(window.devicePixelRatio),
        },
        {
          label: "Maximum touch points",
          value: String(browserNavigator.maxTouchPoints),
        },
        { label: "Secure context", value: String(snapshot.secureContext) },
        { label: "Wake Lock API", value: String(snapshot.apiAvailable) },
      ],
      scenarios: SCENARIOS.map(({ id, title, mode }) => ({
        id,
        title,
        mode,
        status: snapshot.suite.results[id].status,
        detail: snapshot.suite.results[id].detail,
      })),
      guidedReview: [
        { label: "Current step", value: snapshot.guidedReview.step },
        {
          label: "Wake-lock display",
          value: snapshot.guidedReview.timed.outcome,
        },
        {
          label: "Display stayed awake",
          value:
            snapshot.guidedReview.timed.displayStayedAwake ?? "Not recorded",
        },
        {
          label: "Post-release display",
          value: snapshot.guidedReview.release.outcome,
        },
        {
          label: "Display switched off",
          value:
            snapshot.guidedReview.release.displaySwitchedOff ?? "Not recorded",
        },
        {
          label: "Optional post-release visibility evidence",
          value: describeOptionalVisibilityEvidence(
            snapshot.guidedReview.release.hiddenObserved,
            snapshot.guidedReview.release.returnedObserved,
          ),
        },
        {
          label: "Visibility lifecycle",
          value: snapshot.guidedReview.visibility.outcome,
        },
      ],
      currentState: [
        { label: "Mode", value: snapshot.mode ?? "Not selected" },
        { label: "Document visibility", value: snapshot.visibility },
        { label: "Manager supported", value: String(snapshot.supported) },
        { label: "Platform sentinel held", value: String(snapshot.held) },
        {
          label: "Logical leases",
          value: String(snapshot.activeLeaseCount),
        },
        { label: "Last action", value: snapshot.lastAction ?? "None" },
        { label: "Last result", value: lastResult },
      ],
      transcript: snapshot.transcript,
    });
  }

  clearTranscript(): void {
    this.e2e.transcript.length = 0;
    this.e2e.lastAction = "clear-transcript";
    this.e2e.lastResult = "transcript-cleared";
    this.refreshViews();
  }

  snapshot(): HarnessSnapshot {
    const wakeLock = this.wakeLock;
    const browserNavigator = navigator as HarnessNavigator;
    return {
      mode: this.e2e.mode,
      pendingRun:
        this.e2e.pendingRun === null
          ? null
          : {
              requestId: this.e2e.pendingRun.requestId,
              scenarios: [...this.e2e.pendingRun.scenarios],
            },
      pendingRunError: this.e2e.pendingRunError,
      activeRequestId: this.e2e.activeRequestId,
      completedRequestId: this.e2e.completedRequestId,
      lastStory: this.e2e.lastStory,
      platform: Platform.isMobile ? "mobile" : "desktop",
      secureContext: globalThis.isSecureContext ?? false,
      apiAvailable:
        browserNavigator.wakeLock !== undefined &&
        browserNavigator.wakeLock !== null,
      visibility: document.visibilityState,
      supported: wakeLock?.supported ?? false,
      held: wakeLock?.held ?? false,
      activeLeaseCount: wakeLock?.activeLeaseCount ?? 0,
      lastAction: this.e2e.lastAction,
      lastResult: this.e2e.lastResult,
      progressState: this.e2e.progressState,
      progressValue: this.e2e.progressValue,
      remainingSeconds: this.e2e.remainingSeconds,
      transcript: [...this.e2e.transcript],
      suite: {
        selected: [...this.e2e.suite.selected],
        running: this.e2e.suite.running,
        current: this.e2e.suite.current,
        results: Object.fromEntries(
          SCENARIOS.map(({ id }) => [id, { ...this.e2e.suite.results[id] }]),
        ) as Record<ScenarioId, ScenarioResult>,
      },
      guidedReview: {
        ...this.e2e.guidedReview,
        timed: { ...this.e2e.guidedReview.timed },
        release: { ...this.e2e.guidedReview.release },
        visibility: { ...this.e2e.guidedReview.visibility },
      },
    };
  }

  private requireWakeLock(): ScreenWakeLockManager {
    if (this.wakeLock === undefined)
      throw new Error("The wake lock manager is not loaded");
    return this.wakeLock;
  }

  private recordManagerEvent(event: ScreenWakeLockEvent): void {
    const review = this.e2e.guidedReview;
    if (
      review.step === "visibility-waiting" &&
      review.visibility.returnedObserved
    ) {
      if (event.type === "wake-lock-acquired") {
        review.visibility.reacquiredObserved = true;
        this.scheduleVisibilityFinish(250);
      } else if (
        event.type === "wake-lock-error" &&
        event.operation === "request"
      ) {
        review.visibility.requestError = describeError(event.error);
        this.scheduleVisibilityFinish(250);
      } else if (event.type === "unsupported") {
        this.scheduleVisibilityFinish(250);
      }
    }
    this.record(event.type, event);
    this.refreshViews();
  }

  private handleVisibilityChange(): void {
    const visibilityState = document.visibilityState;
    this.record("visibility-change", { visibilityState });
    const review = this.e2e.guidedReview;
    if (review.step === "release-waiting") {
      if (visibilityState === "hidden") {
        review.release.hiddenObserved = true;
      } else if (
        visibilityState === "visible" &&
        review.release.hiddenObserved
      ) {
        review.release.returnedObserved = true;
      }
    } else if (review.step === "visibility-waiting") {
      if (visibilityState === "hidden") {
        review.visibility.hiddenObserved = true;
      } else if (
        visibilityState === "visible" &&
        review.visibility.hiddenObserved
      ) {
        review.visibility.returnedObserved = true;
        this.scheduleVisibilityFinish(2_000);
      }
    }
    this.refreshViews();
  }

  private scheduleVisibilityFinish(delayMilliseconds: number): void {
    if (this.visibilityFinishTimeout !== undefined) {
      window.clearTimeout(this.visibilityFinishTimeout);
    }
    this.visibilityFinishTimeout = window.setTimeout(() => {
      this.visibilityFinishTimeout = undefined;
      void this.finishGuidedVisibilityTest();
    }, delayMilliseconds);
  }

  private record(event: string, detail?: unknown): void {
    this.e2e.transcript.push({ at: new Date().toISOString(), event, detail });
    if (this.e2e.transcript.length > MAX_TRANSCRIPT_ENTRIES) {
      this.e2e.transcript.splice(
        0,
        this.e2e.transcript.length - MAX_TRANSCRIPT_ENTRIES,
      );
    }
  }

  private refreshViews(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      if (leaf.view instanceof WakeLockHarnessView) leaf.view.render();
    }
  }
}
