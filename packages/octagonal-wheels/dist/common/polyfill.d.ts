export declare const FallbackWeakRef: WeakRefConstructor;
export declare const FallbackFinalizationRegistry: FinalizationRegistryConstructor;
/**
 * FallbackWeakRef is a polyfill for WeakRef that uses a strong reference.
 * It is used when WeakRef is not available in the environment.
 */
export type FallbackWeakRef<T extends WeakKey> = WeakRef<T>;
/**
 * FallbackFinalizationRegistry is a polyfill for FinalizationRegistry that does nothing.
 * It is used when FinalizationRegistry is not available in the environment.
 */
export type FallbackFinalizationRegistry<T> = typeof FinalizationRegistry<T>;
