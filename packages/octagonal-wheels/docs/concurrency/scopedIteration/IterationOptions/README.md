[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [scopedIteration](../README.md) / IterationOptions

# Interface: IterationOptions

Defined in: packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:11

Admission limits for one iteration.

## Properties

| Property                                | Modifier   | Type     | Description                                                                    | Defined in                                                       |
| --------------------------------------- | ---------- | -------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| <a id="concurrency"></a> `concurrency?` | `readonly` | `number` | Positive safe integer; defaults to one. Each item's cleanup occupies its slot. | packages/octagonal-wheels/src/concurrency/scoped.iteration.ts:13 |
