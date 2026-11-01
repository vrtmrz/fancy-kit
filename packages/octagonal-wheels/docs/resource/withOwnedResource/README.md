[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [resource](../README.md) / withOwnedResource

# Function: withOwnedResource()

```ts
function withOwnedResource<TResource, TResult>(
  resource: TResource,
  operation: (resource: TResource) => TResult | PromiseLike<TResult>,
): Promise<TResult>;
```

Defined in: packages/octagonal-wheels/src/resource.ts:81

Runs an operation with an owned resource and awaits cleanup in finally.

## Type Parameters

| Type Parameter                                                                |
| ----------------------------------------------------------------------------- |
| `TResource` _extends_ [`DisposableResource`](../DisposableResource/README.md) |
| `TResult`                                                                     |

## Parameters

| Parameter   | Type                                                                 | Description                                                    |
| ----------- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| `resource`  | `TResource`                                                          | An already acquired resource whose lifetime this scope owns.   |
| `operation` | (`resource`: `TResource`) => `TResult` \| `PromiseLike`\<`TResult`\> | Receives the same resource and may return a value or thenable. |

## Returns

`Promise`\<`TResult`\>

The operation's result after cleanup completes.

## Remarks

Operation failures still trigger cleanup. A cleanup failure takes precedence
over an operation failure, following ordinary finally semantics. The dispose
method retains its receiver. This scope does not acquire a resource, flush
pending work, or cancel work started outside the operation's returned result.
Do not give the same resource to overlapping ownership scopes.
