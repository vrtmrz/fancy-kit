/**
 * Compile-only consumer fixture mirroring the public usage guide.
 *
 * This file is copied into a temporary project that installs the packed
 * workspace tarballs. It must use public package entry points only.
 */
import { Plugin, type App, type TFile } from "obsidian";
import {
  confirmAction,
  pickOne,
  promptPassword,
  promptText,
  showMessage,
} from "@vrtmrz/obsidian-plugin-kit/dialog";
import { KeyedNoticeManager } from "@vrtmrz/obsidian-plugin-kit/notice";
import {
  ProgressFragment,
  showProgressNotice,
} from "@vrtmrz/obsidian-plugin-kit/progress";
import {
  createScriptedUiDriver,
  createUiTestHarness,
  createVaultTextTestHarness,
} from "@vrtmrz/obsidian-plugin-kit/testing";
import {
  createObsidianUi,
  type UiInteractions,
} from "@vrtmrz/obsidian-plugin-kit/ui";
import {
  createObsidianVaultTextAccess,
  type VaultTextAccess,
} from "@vrtmrz/obsidian-plugin-kit/vault";

type TemplateUi = Pick<UiInteractions, "promptText" | "showMessage">;

interface WorkflowServices {
  ui: TemplateUi;
  vault: VaultTextAccess;
}

export function createServices(app: App): WorkflowServices {
  return {
    ui: createObsidianUi(app),
    vault: createObsidianVaultTextAccess(app.vault),
  };
}

export class ExamplePlugin extends Plugin {
  private readonly notices = new KeyedNoticeManager();

  override async onload(): Promise<void> {
    const services = createServices(this.app);
    this.addCommand({
      id: "update-template",
      name: "Update template",
      callback: () => void updateTemplate(services),
    });
  }

  override onunload(): void {
    this.notices.dispose();
  }
}

export async function updateTemplate({ ui, vault }: WorkflowServices): Promise<void> {
  const name = await ui.promptText(
    { title: "Template name", initialValue: "Daily note" },
    "template-name",
  );
  if (name === null) return;

  await vault.modifyText("Templates/daily.md", `# ${name}\n`);
  await ui.showMessage(
    { title: "Template updated", message: "The template has been saved." },
    "template-updated",
  );
}

export async function useDirectDialogs(app: App, files: readonly TFile[]): Promise<void> {
  await promptText(app, {
    title: "Device name",
    initialValue: "desktop",
    selectInitialValue: true,
  });
  await promptPassword(app, { title: "Encryption password" });
  await pickOne(app, {
    items: files,
    getText: (file) => file.path,
    getDescription: (file) => `${file.stat.size} bytes`,
    placeholder: "Select a file",
  });
  await confirmAction(app, {
    title: "Restore confirmation",
    message: "Restore the selected files?",
    actions: ["restore", "cancel"] as const,
    labels: { restore: "Restore", cancel: "Cancel" },
    defaultAction: "cancel",
  });
  await showMessage(app, {
    title: "Restore complete",
    message: "The selected files have been restored.",
  });
}

type RestoreConfirmationUi = Pick<UiInteractions, "confirmAction">;

export async function confirmRestore(ui: RestoreConfirmationUi): Promise<boolean> {
  const action = await ui.confirmAction(
    {
      title: "Restore confirmation",
      message: "Restore the selected files?",
      actions: ["restore", "cancel"] as const,
      labels: { restore: "Restore", cancel: "Cancel" },
      defaultAction: "cancel",
    },
    "restore-files",
  );
  return action === "restore";
}

export async function exerciseAppFreeUi(): Promise<void> {
  const harness = createUiTestHarness([
    {
      kind: "confirmAction",
      interactionId: "restore-files",
      value: "restore",
    },
  ]);

  if (!(await confirmRestore(harness.ui))) throw new Error("Restore was not confirmed");
  if (harness.transcript[0]?.kind !== "confirmAction") {
    throw new Error("Confirmation was not recorded");
  }
  harness.assertDone();

  const observed = createUiTestHarness([
    {
      kind: "promptText",
      value: (request) => {
        if (request.options.title !== "Device name") throw new Error("Unexpected title");
        return "observed-device";
      },
    },
  ]);
  await observed.ui.promptText({ title: "Device name" });
  observed.assertDone();
}

export function createMixedUi(app: App): UiInteractions {
  const driver = createScriptedUiDriver([
    { kind: "promptText", interactionId: "device-name", value: "laptop" },
    { kind: "showMessage", interactionId: "review-result", passthrough: true },
  ]);
  return createObsidianUi(app, { driver });
}

export async function exerciseVaultHarness(): Promise<void> {
  const harness = createVaultTextTestHarness({
    files: { "Templates/note.md": "# {{title}}" },
  });

  const template = await harness.vault.readText("Templates/note.md");
  await harness.vault.createText("Notes/new.md", template.replace("{{title}}", "New"));
  if (harness.getFile("Notes/new.md") !== "# New") throw new Error("Unexpected content");
}

export function exerciseNoticesAndProgress(document: Document): void {
  const notices = new KeyedNoticeManager({ defaultDurationMs: 5_000 });
  notices.show("sync", "Synchronising...", { durationMs: false });
  notices.show("sync", "Synchronisation complete", { durationMs: 1_000 });
  notices.hide("sync");
  notices.dispose();

  const progress = showProgressNotice({ title: "Archiving files", total: 2 });
  progress.update({ note: "First file" });
  progress.increment();
  progress.complete();
  progress.hide();

  const fragment = new ProgressFragment({ document, total: 1 });
  document.body.append(fragment.fragment);
  fragment.increment();
}
