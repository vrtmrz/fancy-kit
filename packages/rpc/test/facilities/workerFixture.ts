import type { MessageEventLike, MessagePortLike, WorkerRpcWorker } from "../../src/worker.js";

interface WorkerEvents {
  message: MessageEventLike;
  error: { message: string; error: unknown };
  messageerror: undefined;
}

/** Dedicated Worker fixture with queued delivery, native cloning, and explicit faults. */
export function createWorkerFixture() {
  const host: { [K in keyof WorkerEvents]: Set<(event: WorkerEvents[K]) => void> } = {
    message: new Set(), error: new Set(), messageerror: new Set(),
  };
  const workerListeners = new Set<(event: MessageEventLike) => void>();
  let terminationCount = 0;

  function post(listeners: Set<(event: MessageEventLike) => void>, data: unknown, transfer: never[]): void {
    const copy = structuredClone(data, { transfer });
    queueMicrotask(() => {
      if (terminationCount === 0) {
        for (const listener of [...listeners]) {
          listener({ data: copy });
        }
      }
    });
  }

  const worker: WorkerRpcWorker = {
    postMessage: (message, transfer) => post(workerListeners, message, transfer),
    addEventListener<K extends keyof WorkerEvents>(type: K, listener: (event: WorkerEvents[K]) => void) {
      host[type].add(listener);
    },
    removeEventListener<K extends keyof WorkerEvents>(type: K, listener: (event: WorkerEvents[K]) => void) {
      host[type].delete(listener);
    },
    terminate() {
      terminationCount++;
      workerListeners.clear();
    },
  };

  const port: MessagePortLike<never> = {
    postMessage: (message, transfer) => post(host.message, message, transfer),
    addEventListener: (_type, listener) => workerListeners.add(listener),
    removeEventListener: (_type, listener) => workerListeners.delete(listener),
  };

  return {
    worker,
    port,
    get terminationCount(): number { return terminationCount; },
    get hostListenerCount(): number { return host.message.size + host.error.size + host.messageerror.size; },
    crash(message: string, error: unknown) {
      for (const listener of [...host.error]) {
        listener({ message, error });
      }
    },
    failMessage() {
      for (const listener of [...host.messageerror]) {
        listener(undefined);
      }
    },
  };
}
