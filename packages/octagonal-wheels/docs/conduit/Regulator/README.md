[**octagonal-wheels**](../../README.md)

---

[octagonal-wheels](../../modules.md) / [conduit](../README.md) / Regulator

# Variable: Regulator

```ts
const Regulator: {
  of: <T, U>(name: string) => RegulatorOf<T, U>;
};
```

Defined in: packages/octagonal-wheels/src/conduit/regulator.ts:150

## Type Declaration

### of

```ts
of: <T, U>(name: string) => RegulatorOf<T, U>;
```

Get a regulator

#### Type Parameters

| Type Parameter        |
| --------------------- |
| `T` _extends_ `any`[] |
| `U`                   |

#### Parameters

| Parameter | Type     | Description |
| --------- | -------- | ----------- |
| `name`    | `string` | -           |

#### Returns

[`RegulatorOf`](../RegulatorOf/README.md)\<`T`, `U`\>

<RegulatorOf<T, U>>

## Remarks

Get a regulator that allows you to regulate the number of concurrent processes.

## Param

**name**

## Returns

<RegulatorOf<T, U>>
