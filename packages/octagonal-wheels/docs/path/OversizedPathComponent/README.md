[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [path](../README.md) / OversizedPathComponent

# Interface: OversizedPathComponent

Defined in: packages/octagonal-wheels/src/path.ts:34

A non-empty path component that exceeds a caller-supplied UTF-8 byte limit.

## Properties

| Property                           | Type     | Description                                    | Defined in                               |
| ---------------------------------- | -------- | ---------------------------------------------- | ---------------------------------------- |
| <a id="component"></a> `component` | `string` | The original component text.                   | packages/octagonal-wheels/src/path.ts:36 |
| <a id="utf8bytes"></a> `utf8Bytes` | `number` | The component's UTF-8 encoded length in bytes. | packages/octagonal-wheels/src/path.ts:38 |
