[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [modification](../README.md) / createModificationHandler

# Function: createModificationHandler()

```ts
function createModificationHandler<TTarget, TSource, TExisting, TContent>(
  adapter: ModificationHandlerAdapter<TTarget, TSource, TExisting, TContent>,
): ModificationHandler<TTarget, TSource>;
```

Defined in: packages/octagonal-wheels/src/modification.ts:31

Creates a handler which reads the current target and processes one source modification.
Read failures alone invoke `adapter.onReadError`; fallback, decode, comparison, and write failures reject.
Each callback may return a value or a promise-like result and completes before the next starts.
A true comparison skips writing; otherwise the returned promise resolves to `changed` only
after the write completes. All callbacks receive the original target or source where declared.

Each invocation runs independently. The factory adds no locking, retries, rollback, cloning,
or persistence; the adapter owns storage and comparison policy, including read-error recovery.

## Type Parameters

| Type Parameter |
| -------------- |
| `TTarget`      |
| `TSource`      |
| `TExisting`    |
| `TContent`     |

## Parameters

| Parameter | Type                                                                                                                     | Description                                            |
| --------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------ |
| `adapter` | [`ModificationHandlerAdapter`](../ModificationHandlerAdapter/README.md)\<`TTarget`, `TSource`, `TExisting`, `TContent`\> | Operations retained by reference for every invocation. |

## Returns

[`ModificationHandler`](../ModificationHandler/README.md)\<`TTarget`, `TSource`\>

An asynchronous function which applies one source to one target.
