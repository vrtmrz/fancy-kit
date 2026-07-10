[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [concurrency](../../README.md) / [processor](../README.md) / Notifier

# ~~Class: Notifier~~

Defined in: [src/concurrency/processor\_v2.ts:21](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L21)

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

| Property | Type | Default value | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_p"></a> ~~`_p`~~ | [`PromiseWithResolvers`](../../../promises/PromiseWithResolvers/README.md)\<`void`\> | `undefined` | [src/concurrency/processor\_v2.ts:22](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L22) |
| <a id="isused"></a> ~~`isUsed`~~ | `boolean` | `false` | [src/concurrency/processor\_v2.ts:23](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L23) |

## Accessors

### ~~nextNotify~~

#### Get Signature

```ts
get nextNotify(): Promise<void>;
```

Defined in: [src/concurrency/processor\_v2.ts:33](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L33)

##### Returns

`Promise`\<`void`\>

## Methods

### ~~notify()~~

```ts
notify(): void;
```

Defined in: [src/concurrency/processor\_v2.ts:24](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/concurrency/processor_v2.ts#L24)

#### Returns

`void`
