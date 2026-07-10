declare const __tag: unique symbol;

/**
 * Tagged Type: Wrapping type with a unique symbol to make types *INCOMPATIBLE* for the same type with different tags.
 * @example var id = TaggedType<string, 'DocumentID'> = "AAA" ;// This makes error
 * @example var id = TaggedType<string, 'DocumentID'> = "AAA" as TaggedType<string,"FileName"> ;// Also makes error
 */
export type TaggedType<T, U extends string> = T & { [__tag]: U };
