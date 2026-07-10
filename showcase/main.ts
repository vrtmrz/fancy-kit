import { ItemView, Plugin, Setting, type WorkspaceLeaf } from "obsidian";
import {
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
  showProgressNotice,
  type ProgressNotice,
} from "../src/index.ts";

const VIEW_TYPE = "vpk-showcase-view";

type ShowcaseResult = string | null | { id: string; label: string };

class ShowcaseView extends ItemView {
  constructor(leaf: WorkspaceLeaf, private readonly plugin: ShowcasePlugin) {
    super(leaf);
  }

  getViewType(): string {
    return VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Plugin Kit Showcase";
  }

  getIcon(): string {
    return "test-tube";
  }

  override async onOpen(): Promise<void> {
    const container = this.containerEl.children[1] as HTMLElement;
    container.empty();
    container.addClass("vpk-showcase");
    container.createEl("h1", { text: "Obsidian Plugin Kit" });
    container.createEl("p", {
      text: "Interactive stories backed by the same API used by the real Obsidian E2E suite.",
    });

    this.section(container, "Dialogs", [
      ["Text prompt", "Initial value, selection, Enter, Escape, and empty-string semantics.", "prompt-text"],
      ["Password prompt", "Password input without exposing the value in the catalogue.", "prompt-password"],
      ["Typed selection", "Select an object while preserving its identity.", "pick-one"],
      ["Markdown confirmation", "Literal action types and Markdown content.", "confirm-action"],
      ["Message", "A one-action informational Markdown dialog.", "show-message"],
    ]);
    this.section(container, "Progress", [
      ["Progress Notice", "Start a deterministic three-step progress Notice.", "progress-start"],
      ["Advance progress", "Advance the active progress story by one step.", "progress-step"],
      ["Cancel progress", "Cancel the active progress story.", "progress-cancel"],
    ]);

    const result = container.createDiv({ cls: "vpk-showcase__result" });
    result.dataset.testid = "showcase-last-result";
    result.createEl("strong", { text: "Last result: " });
    result.createSpan({ text: JSON.stringify(this.plugin.e2e.lastResult) });
  }

  private section(container: HTMLElement, title: string, stories: readonly (readonly [string, string, string])[]): void {
    container.createEl("h2", { text: title });
    const grid = container.createDiv({ cls: "vpk-showcase__grid" });
    for (const [name, description, story] of stories) {
      const setting = new Setting(grid).setName(name).setDesc(description).addButton((button) => {
        button.setButtonText("Run").onClick(() => void this.plugin.runStory(story));
      });
      setting.settingEl.dataset.testid = `story-${story}`;
    }
  }
}

export default class ShowcasePlugin extends Plugin {
  readonly e2e: {
    lastStory: string | null;
    lastResult: ShowcaseResult;
    progressState: string | null;
    progressValue: number;
  } = {
    lastStory: null,
    lastResult: null,
    progressState: null,
    progressValue: 0,
  };

  private activeProgress: ProgressNotice | undefined;

  override onload(): void {
    this.registerView(VIEW_TYPE, (leaf) => new ShowcaseView(leaf, this));
    this.addRibbonIcon("test-tube", "Open Plugin Kit Showcase", () => void this.openShowcase());
    this.addCommand({ id: "open", name: "Open showcase", callback: () => void this.openShowcase() });

    for (const story of [
      "prompt-text",
      "prompt-password",
      "pick-one",
      "confirm-action",
      "show-message",
      "progress-start",
      "progress-step",
      "progress-cancel",
    ]) {
      this.addCommand({
        id: `story-${story}`,
        name: `Story: ${story}`,
        callback: () => void this.runStory(story),
      });
    }
  }

  override onunload(): void {
    this.activeProgress?.hide();
  }

  async openShowcase(): Promise<void> {
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  }

  async runStory(story: string): Promise<void> {
    this.e2e.lastStory = story;
    switch (story) {
      case "prompt-text":
        this.setResult(
          await promptText(this.app, {
            title: "Device name",
            label: "Name",
            placeholder: "Enter a device name",
            initialValue: "desktop",
            selectInitialValue: true,
          }),
        );
        break;
      case "prompt-password":
        this.setResult(await promptPassword(this.app, { title: "Passphrase", label: "Passphrase" }));
        break;
      case "pick-one": {
        const items = [
          { id: "alpha", label: "Alpha" },
          { id: "beta", label: "Beta" },
          { id: "gamma", label: "Gamma" },
        ];
        this.setResult(
          await pickOne(this.app, {
            items,
            getText: (item) => item.label,
            placeholder: "Select a target",
          }),
        );
        break;
      }
      case "confirm-action":
        this.setResult(
          await confirmAction(this.app, {
            title: "Restore confirmation",
            message: "**3 files** will be restored. Continue?",
            actions: ["restore", "cancel"] as const,
            labels: { restore: "Restore", cancel: "Cancel" },
            defaultAction: "cancel",
          }),
        );
        break;
      case "show-message":
        await showMessage(this.app, { title: "Information", message: "The showcase is **ready**.", closeLabel: "OK" });
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
        if (this.activeProgress === undefined) {
          await this.runStory("progress-start");
        }
        this.activeProgress?.update({ note: `Step ${this.activeProgress.progress.value + 1}` });
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
      default:
        throw new Error(`Unknown showcase story: ${story}`);
    }
  }

  private setResult(result: ShowcaseResult): void {
    this.e2e.lastResult = result;
  }

  private setProgressState(state: string, value: number): void {
    this.e2e.progressState = state;
    this.e2e.progressValue = value;
  }
}
