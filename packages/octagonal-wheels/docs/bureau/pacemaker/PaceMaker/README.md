[**octagonal-wheels**](../../../README.md)

***

[octagonal-wheels](../../../modules.md) / [bureau](../../README.md) / [pacemaker](../README.md) / PaceMaker

# Class: PaceMaker

Defined in: [src/bureau/PaceMaker.ts:1](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L1)

## Constructors

### Constructor

```ts
new PaceMaker(interval: number): PaceMaker;
```

Defined in: [src/bureau/PaceMaker.ts:5](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L5)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `interval` | `number` |

#### Returns

`PaceMaker`

## Properties

| Property | Modifier | Type | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="_interval"></a> `_interval` | `public` | `number` | [src/bureau/PaceMaker.ts:2](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L2) |
| <a id="_minimumnext"></a> `_minimumNext` | `public` | `undefined` \| `number` | [src/bureau/PaceMaker.ts:3](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L3) |

## Accessors

### paced

#### Get Signature

```ts
get paced(): Promise<void>;
```

Defined in: [src/bureau/PaceMaker.ts:53](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L53)

The promise for waiting paced

##### Returns

`Promise`\<`void`\>

***

### pacedSinceMark

#### Get Signature

```ts
get pacedSinceMark(): Promise<void>;
```

Defined in: [src/bureau/PaceMaker.ts:59](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L59)

The promise for waiting paced since the last mark

##### Returns

`Promise`\<`void`\>

## Methods

### \_getPaced()

```ts
_getPaced(doMark: boolean): Promise<void>;
```

Defined in: [src/bureau/PaceMaker.ts:33](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `doMark` | `boolean` |

#### Returns

`Promise`\<`void`\>

***

### changeInterval()

```ts
changeInterval(interval: number): void;
```

Defined in: [src/bureau/PaceMaker.ts:14](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L14)

Change the interval of the pacing.
This will reset the minimum next pacing time.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `interval` | `number` |  |

#### Returns

`void`

***

### mark()

```ts
mark(now: number): void;
```

Defined in: [src/bureau/PaceMaker.ts:25](https://github.com/vrtmrz/octagonal-wheels/blob/main/src/bureau/PaceMaker.ts#L25)

Mark the current time as the basis for the next pacing.

#### Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `now` | `number` |  |

#### Returns

`void`
