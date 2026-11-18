import { isPromiseLike } from "./envelopes.js";

/**
 * Invokes a handler and observes its outcome without deferring synchronous completion.
 * Synchronous invocation or completion failures reach onFailure immediately.
 * Promise rejection reaches onFailure asynchronously; a throw from asynchronous
 * onSuccess is not reclassified as a handler rejection. Completion callbacks
 * must not throw on the asynchronous path.
 */
export function invokeHandler(
  invoke: () => unknown,
  onSuccess: (value: unknown) => void,
  onFailure: (error: unknown) => void,
): void {
  try {
    const outcome = invoke();
    if (isPromiseLike(outcome)) {
      void Promise.resolve(outcome).then(onSuccess, onFailure);
    } else {
      onSuccess(outcome);
    }
  } catch (error) {
    onFailure(error);
  }
}
