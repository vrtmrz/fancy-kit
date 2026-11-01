[**octagonal-wheels**](../../../README.md)

---

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [processor](../README.md) / Notifier

# ~~Class: Notifier~~

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:21

## Deprecated

Use EventHub and waitFor instead.

## Constructors

### Constructor

```ts
new Notifier(): Notifier;
```

#### Returns

`Notifier`

## Properties

| Property                         | Type                                                                                 | Default value | Defined in                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------- |
| <a id="_p"></a> ~~`_p`~~         | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined`   | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:22 |
| <a id="isused"></a> ~~`isUsed`~~ | `boolean`                                                                            | `false`       | packages/octagonal-wheels/src/concurrency/processor\_v2.ts:23 |

## Accessors

### ~~nextNotify~~

#### Get Signature

```ts
get nextNotify(): Promise<void>;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:27

##### Returns

`Promise`\<`void`\>

## Methods

### ~~notify()~~

```ts
notify(): void;
```

Defined in: packages/octagonal-wheels/src/concurrency/processor\_v2.ts:24

#### Returns

`void`
