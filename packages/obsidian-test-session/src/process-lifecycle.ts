type CleanupKind = "process" | "temporary";
type SupportedSignal = "SIGHUP" | "SIGINT" | "SIGTERM";

interface ManagedCleanup {
  kind: CleanupKind;
  label: string;
  run: () => Promise<void>;
}

interface SignalTarget {
  on(signal: SupportedSignal, listener: () => void): unknown;
  off(signal: SupportedSignal, listener: () => void): unknown;
}

interface ProcessSignalCleanupOptions {
  signalTarget?: SignalTarget;
  exit?: (code: number) => void;
  report?: (message: string) => void;
}

const signalExitCodes: Readonly<Record<SupportedSignal, number>> = {
  SIGHUP: 129,
  SIGINT: 130,
  SIGTERM: 143,
};

/**
 * Coordinates resources owned by this package when the test runner process is
 * asked to terminate. Registration remains internal so importing the package
 * does not install process-level signal handlers.
 */
export class ProcessSignalCleanup {
  readonly #resources = new Set<ManagedCleanup>();
  readonly #signalTarget: SignalTarget;
  readonly #exit: (code: number) => void;
  readonly #report: (message: string) => void;
  readonly #handlers = new Map<SupportedSignal, () => void>();
  #handlingSignal = false;
  #processCleanup: Promise<boolean> | undefined;

  constructor(options: ProcessSignalCleanupOptions = {}) {
    this.#signalTarget = options.signalTarget ?? process;
    this.#exit = options.exit ?? ((code) => process.exit(code));
    this.#report = options.report ?? ((message) => console.error(message));
  }

  register(
    kind: CleanupKind,
    label: string,
    cleanup: () => Promise<void>,
  ): () => Promise<void> {
    let running: Promise<void> | undefined;
    const entry: ManagedCleanup = {
      kind,
      label,
      run: async () => {
        if (kind === "temporary" && this.#processCleanup) {
          const processesStopped = await this.#processCleanup;
          if (!processesStopped) {
            this.#report(
              `Keeping ${label} because an Obsidian process could not be stopped.`,
            );
            return;
          }
        }
        running ??= cleanup().then(
          () => {
            this.#resources.delete(entry);
            this.#removeHandlersIfIdle();
          },
          (error: unknown) => {
            running = undefined;
            throw error;
          },
        );
        await running;
      },
    };

    this.#resources.add(entry);
    this.#installHandlers();
    return entry.run;
  }

  async handleSignal(signal: SupportedSignal): Promise<void> {
    const exitCode = signalExitCodes[signal];
    if (this.#handlingSignal) {
      this.#exit(exitCode);
      return;
    }

    this.#handlingSignal = true;
    try {
      this.#processCleanup = this.#runProcessCleanup();
      const processesStopped = await this.#processCleanup;
      if (processesStopped) {
        await this.#runTemporaryCleanup();
      } else {
        for (const resource of this.#resources) {
          if (resource.kind === "temporary") {
            this.#report(
              `Keeping ${resource.label} because an Obsidian process could not be stopped.`,
            );
          }
        }
      }
    } catch (error: unknown) {
      this.#report(
        `Signal cleanup failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.#exit(exitCode);
    }
  }

  #installHandlers(): void {
    if (this.#handlers.size > 0) return;
    for (const signal of Object.keys(signalExitCodes) as SupportedSignal[]) {
      const handler = () => {
        void this.handleSignal(signal);
      };
      this.#handlers.set(signal, handler);
      this.#signalTarget.on(signal, handler);
    }
  }

  #removeHandlersIfIdle(): void {
    if (this.#resources.size > 0 || this.#handlingSignal) return;
    for (const [signal, handler] of this.#handlers) {
      this.#signalTarget.off(signal, handler);
    }
    this.#handlers.clear();
  }

  async #runProcessCleanup(): Promise<boolean> {
    const resources = [...this.#resources].filter(
      (resource) => resource.kind === "process",
    );
    const results = await Promise.allSettled(
      resources.map((resource) => resource.run()),
    );
    let succeeded = true;
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result?.status !== "rejected") continue;
      succeeded = false;
      const resource = resources[index];
      this.#report(
        `Could not stop ${resource?.label ?? "an Obsidian process"}: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`,
      );
    }
    return succeeded;
  }

  async #runTemporaryCleanup(): Promise<void> {
    const resources = [...this.#resources].filter(
      (resource) => resource.kind === "temporary",
    );
    const results = await Promise.allSettled(
      resources.map((resource) => resource.run()),
    );
    for (let index = 0; index < results.length; index += 1) {
      const result = results[index];
      if (result?.status !== "rejected") continue;
      const resource = resources[index];
      this.#report(
        `Could not remove ${resource?.label ?? "temporary Obsidian state"}: ${
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason)
        }`,
      );
    }
  }
}

const processSignalCleanup = new ProcessSignalCleanup();

export function registerProcessCleanup(
  label: string,
  cleanup: () => Promise<void>,
): () => Promise<void> {
  return processSignalCleanup.register("process", label, cleanup);
}

export function registerTemporaryCleanup(
  label: string,
  cleanup: () => Promise<void>,
): () => Promise<void> {
  return processSignalCleanup.register("temporary", label, cleanup);
}
