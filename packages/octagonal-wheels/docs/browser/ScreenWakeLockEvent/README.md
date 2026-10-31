[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [browser](../README.md) / ScreenWakeLockEvent

# Type Alias: ScreenWakeLockEvent

```ts
type ScreenWakeLockEvent =
  | {
      activeLeaseCount: number;
      label?: string;
      type: "lease-acquired";
    }
  | {
      activeLeaseCount: number;
      label?: string;
      type: "lease-released";
    }
  | {
      activeLeaseCount: number;
      type: "unsupported";
    }
  | {
      activeLeaseCount: number;
      type: "wake-lock-requested";
    }
  | {
      activeLeaseCount: number;
      type: "wake-lock-acquired";
    }
  | {
      activeLeaseCount: number;
      reason: ScreenWakeLockReleaseReason;
      type: "wake-lock-released";
    }
  | {
      activeLeaseCount: number;
      error: unknown;
      operation: "request" | "release";
      type: "wake-lock-error";
    };
```

Defined in: packages/octagonal-wheels/src/browser/wakeLock.ts:43

A lifecycle event emitted for diagnostics and test harnesses.

## Union Members

### Type Literal

```ts
{
  activeLeaseCount: number;
  label?: string;
  type: "lease-acquired";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of logical leases after the change.

#### label?

```ts
optional label?: string;
```

An optional diagnostic label supplied by the caller.

#### type

```ts
type: "lease-acquired";
```

A logical lease was added.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  label?: string;
  type: "lease-released";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of logical leases after the change.

#### label?

```ts
optional label?: string;
```

An optional diagnostic label supplied by the caller.

#### type

```ts
type: "lease-released";
```

A logical lease was removed.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  type: "unsupported";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of active logical leases.

#### type

```ts
type: "unsupported";
```

The platform does not expose a screen wake-lock provider.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  type: "wake-lock-requested";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of active logical leases.

#### type

```ts
type: "wake-lock-requested";
```

A platform wake lock is being requested.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  type: "wake-lock-acquired";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of active logical leases.

#### type

```ts
type: "wake-lock-acquired";
```

A platform wake lock is held.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  reason: ScreenWakeLockReleaseReason;
  type: "wake-lock-released";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of active logical leases.

#### reason

```ts
reason: ScreenWakeLockReleaseReason;
```

The cause observed by the manager.

#### type

```ts
type: "wake-lock-released";
```

A held platform wake lock was released.

---

### Type Literal

```ts
{
  activeLeaseCount: number;
  error: unknown;
  operation: "request" | "release";
  type: "wake-lock-error";
}
```

#### activeLeaseCount

```ts
activeLeaseCount: number;
```

The number of active logical leases.

#### error

```ts
error: unknown;
```

The value rejected or thrown by the platform.

#### operation

```ts
operation: "request" | "release";
```

The operation which failed.

#### type

```ts
type: "wake-lock-error";
```

A best-effort platform operation failed.
