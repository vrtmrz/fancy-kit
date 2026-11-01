[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [notation](../README.md) / formatDuration

# Function: formatDuration()

```ts
function formatDuration(deltaMs: number): string;
```

Defined in: packages/octagonal-wheels/src/notation/duration.ts:12

Formats a millisecond delta using compact seconds, minutes, hours, days, or years.

## Parameters

| Parameter | Type     | Description                   |
| --------- | -------- | ----------------------------- |
| `deltaMs` | `number` | The duration in milliseconds. |

## Returns

`string`

The duration with two decimal places and a unit suffix. Unit
thresholds are 60 seconds, 60 minutes, 24 hours, and 365 days; values are
rounded for display without promoting to the next unit.

## Remarks

Positive infinity is displayed as `∞y`. Other negative and non-finite
values follow JavaScript number comparison and Number.toFixed behaviour,
preserving their existing results.
