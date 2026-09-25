# Audio library documents

This folder validates and installs the portable documents that audio
realization reads:

- `validateAudioLibraryDocument()` / `installAudioLibraryDocument()`
  (`audioLibraryDocument.js`): the complete `carbonenginejs.audioLibrary`
  document, schema version 2;
- `validateSfxGraph()` / `normalizeSfxGraph()` (`sfxGraph.js`): its `sfx`
  section, SFX schema version 2;
- `validateMusicLibrary()` / `installMusicLibrary()` (`musicLibrary.js`): the
  separate jukebox catalog;
- `CjsAudioLibrary`: hydration and loading of an audio-library document.

This README lists what the validators accept. It does not describe how the
builder chooses values or how the backend plays them. Some catalogs are
validated by helpers in `../internal/`: `indexBusDuckingCatalog()`
(`busDucking.js`), `indexBusEffectCatalog()` and
`normalizeStaticSourceEffectChain()` (`busEffects.js`), and
`normalizeBusGraphCatalog()` (`busGraph.js`). They are listed here because
they define parts of this document.

A catalog is descriptive. If the validator accepts a catalog, no route becomes
audible because of it. A shared-bus runtime realizes only the routes it
qualifies. Every other route stays on the legacy path.

## Identity forms

| Where | Accepted form |
| --- | --- |
| SFX node keys, `mediaId`, child `nodeId`, element `targetId` | A number, or a string of decimal digits, from 1 to 2^32-1. Normalized to its decimal string. |
| SFX All / All-Except `targetId` | Exactly `0`. |
| State `groupId`, `stateId`, `fromId`, `toId` | An unsigned 32-bit integer. Zero is allowed. |
| `busRtpcs` / `busStates` bus keys | Positive unsigned 32-bit. The key must already be canonical (`"007"` is rejected). |
| `busDucking`, `busEffects`, `busGraph` IDs | Canonical positive decimal string: `String(Number(id)) === id`. |
| `banks` key and `sourceID` | Both equal `` `${bankID}:${languageID}` ``. |
| music node keys | Canonical positive ID. |

## SFX program actions

`programs[event]` is a non-empty ordered array. For each event that has a
program, `events[event]` must equal the ordered list of its `play` children.
An event with a program but no `events` entry is compared with an empty root
list, so it is valid only if the program has no `play` action. Every name in
`events` or `programs` must also exist in `metadata.Events`.

Rules shared by every action kind:

- `delayMs` and `transitionMs` are finite and not negative.
- A `delayRangeMs` or `transitionRangeMs` range needs `max >= min`.
- `curve` is an integer from 0 to 9. It defaults to 4 when normalized.
- An `exceptions` array must be present on playback controls, Bus Volume and
  Voice LPF/HPF actions. Exception IDs are positive and unique.

| `kind` | `scope` | `mode` and target | Values | Also rejected |
| --- | --- | --- | --- | --- |
| `play` | none | `child`: one edge (a node ID or `{ nodeId, ... }`). `weight` is not allowed. | Play-edge timing (see `CjsSfxGraph`) | none |
| `stop`, `pause`, `resume` | `game-object` or `global` | `element` (target > 0, no exceptions), `all` or `all-except` (target 0). The validator does not reject exceptions on `all`. | `probability` 0..100 is allowed | `targetFlags` or exception `targetFlags` with bit 0 set (Bus target). `actionFlags`, when present, must be 7 for `pause` and 6 for `stop` or `resume`. |
| `set-voice-volume`, `reset-voice-volume` | `game-object` or `global` | `element` only. `targetFlags`, when present, must be 0. | Set: `valueMode` `absolute` or `relative`. `volumeDb` from -200 to 200. Optional `volumeRangeDb` whose sums with the base stay within ±200. | Reset with any value field. `probability`. |
| `set-bus-voice-volume` | `game-object` only | `element`. `targetFlags` must be 1. | `valueMode` `absolute`. `volumeDb` from -200 to 200. `volumeRangeDb` must be zero or absent. | `probability`, `delayRangeMs`, `transitionRangeMs`, `exceptions`. |
| `set-bus-volume`, `reset-bus-volume` | `game-object` or `global` | Set: `element`. Reset: `element`, `all` or `all-except`. `game-object` scope allows `element` only. `targetFlags` must be 1, also on each exception. Only `all-except` may list exceptions. | Set: `valueMode`, `busVolumeDb` from -200 to 200, optional `busVolumeRangeDb`. | Reset with any value field. `probability`. |
| `set-voice-pitch`, `reset-voice-pitch` | `game-object` or `global` | `element` only. `targetFlags`, when present, must be 0. | Set: `valueMode`, `pitchCents` from -2400 to 2400, optional `pitchRangeCents`. | Reset with any value field. `probability`. |
| `set-voice-low-pass`, `set-voice-high-pass`, `reset-voice-low-pass`, `reset-voice-high-pass` | `game-object` or `global` | Set: `element`. Reset: `element`, `all` or `all-except`. `targetFlags` must be 0 when present. Only `all-except` may list exceptions. | Set: `valueMode`, and `lowPass` or `highPass` (matching the kind) from -100 to 100, with optional `lowPassRange` or `highPassRange`. | A field of the other filter. Reset with any value field. `probability`. |
| `set-game-parameter`, `reset-game-parameter` | `game-object` or `global` | `rtpc` name. There is no target. | `defaultValue` (finite) is required on both. Set: `valueMode`, finite `gameParameterValue`, optional `gameParameterRange`. `bypassTransition` must be boolean when present. | Reset with any value field. `probability`. |
| `switch`, `state` | none | `group` and `value` names | Fixed `delayMs` only | `delayRangeMs`, `probability`, `transitionMs`, `transitionTimeMs`, `transitionRangeMs`, `properties`, `ranges`. |

Any other `kind` is rejected.

Extra checks for `set-bus-voice-volume`:

- In the SFX graph, some `sound` must list the target in `busPathIds`. Every
  such sound must have the target as its first (output) bus.
- In the complete document, a `busGraph` is required. The target must be an
  `audio-bus`. No affected sound's route may have a user or reflections Aux
  send, on the route itself or on any bus in its path. No music route may
  include the target.

## State transitions

The SFX graph's `stateTransitions` array and the `busStates` catalog's
`stateTransitions` array use the same record shape. `ValidateStateTransitions()`
checks both. The shape is the `CjsAudioStateTransitionGroup` typedef in
`sfxGraph.js`.

The `busStates` catalog must carry a non-empty `stateTransitions` array. Every
group in it must be used by at least one bus State group, and every bus State
group must have a transition group with the same ID and the same name
(case-insensitive). Every bus State case must appear in that group's `states`
list with the same ID and name.

The validator does not merge the two tables. `CjsAudioMan` merges the SFX
graph table and the `busStates` table when it installs a library. Groups are
matched by `groupId`. The same group ID with a different definition is an
error. Names are compared case-insensitively and lists are compared after
sorting. The merge lets a library with bus States but no SFX graph still keep
its transition timing.

## Bus catalogs

### `busRtpcs` (schema version 1 or 2)

`{ schemaVersion, buses: { [busId]: curve[] } }`. Each bus has a non-empty
curve list. A curve has:

- `curveId`: positive and unique on that bus;
- `rtpc`: a non-empty name;
- `defaultValue`: finite;
- `scaling`: exactly 2;
- `points`: non-empty and ordered by `x`. Each point has a finite `x`, a
  `value` from -1 to 1, and a required `interpolation` from 0 to 9.

In version 2 every curve has `property` set to `"voice-volume"` or
`"bus-volume"`. In version 1 `property` must be absent, and the curve means
Bus Volume.

### `busStates` (schema version 1 or 2)

`{ schemaVersion, stateTransitions, buses: { [busId]: group[] }, filterBehavior? }`.
Each bus has a non-empty group list. A group has:

- `groupId`: positive and unique on that bus;
- `group`: a name, unique on that bus (case-insensitive);
- `syncType`: an integer from 0 to 9;
- `effectiveSyncType`: must be 0;
- `states`: non-empty. Each state has a positive, unique `stateId` and a
  unique `state` name.

Each state carries at least one of these fields:

| Field | Range |
| --- | --- |
| `gainDb` | -200 to 200 |
| `pitchCents` | -2400 to 2400 |
| `lowPass` | -100 to 100 |
| `highPass` | -100 to 100 |

In version 2, `filterBehavior` may only be `"additive"`. It is required when
any state uses `lowPass` or `highPass`.

A version 1 catalog must declare `property: "bus-volume"`,
`accumulation: "additive"` and `unit: "db"`. Each of its states carries
exactly one field, `gainDb`.

### `busDucking` (schema version 1)

```js
busDucking: {
    schemaVersion: 1,
    sources: {
        "100": {
            recoveryMs: 1000,
            maxDuckVolumeDb: -96,
            targets: [ {
                targetBusId: "200",
                volumeDb: -6,
                fadeOutMs: 250,
                fadeInMs: 500,
                curve: 4,
                targetProperty: "voice-volume",
            } ],
        },
    },
}
```

- `recoveryMs`, `fadeOutMs` and `fadeInMs` are non-negative integers.
- `maxDuckVolumeDb` is from -200 to 0.
- `targets` is non-empty. Each target bus is unique for its source and is not
  the source itself.
- `volumeDb` is from `maxDuckVolumeDb` to 0.
- `curve` is from 0 to 9.
- `targetProperty` is `"voice-volume"` or `"bus-volume"`.

The validator does not check bus types, parent relationships or cycles.
Those checks belong to the builder.

### `busEffects` (schema version 1)

`{ schemaVersion: 1, buses: { [busId]: effect[] } }`. Each bus has a
non-empty chain. Only static `parametric-eq` records are accepted:

- `effectId`: a canonical positive ID;
- `slotIndex`: 0 to 3, unique in the chain. The chain is sorted by slot.
- `bands`: at most 3. Each band has:
  - `index` 0 to 2, unique;
  - `filterType`: `lowpass`, `highpass`, `bandpass`, `notch`, `lowshelf`,
    `highshelf` or `peaking`;
  - `gainDb` from -200 to 200;
  - positive `frequencyHz` and `q`.
- `outputGainDb`: from -200 to 200;
- `processLfe`: must be `true`;
- `rtpcCurves`: rejected at bus level.

### `busGraph` (schema version 1)

`{ schemaVersion: 1, effects, buses, routes, sfxRoutes, musicRoutes }`.

| Record | Fields the validator checks |
| --- | --- |
| `effects[effectId]` | `type` is `effect-custom` or `effect-share-set`. `parametersBase64` is canonical base64 whose decoded length equals `parameterByteLength`. `pluginId` equals `(pluginClassId << 16) \| (companyId << 4) \| pluginType`. `controls` holds non-negative `rtpcCount`, `statePropertyCount`, `stateGroupCount` and `propertyValueCount`. `media[]` holds `{ index 0..255 unique, sourceId }`, and each `sourceId` must exist in `embeddedMedia`. |
| `buses[busId]` | `type` is `audio-bus` or `auxiliary-bus`. `parentBusId` is optional and cannot be the bus itself. `channelConfig.raw` equals `channelCount \| configType << 8 \| channelMask << 12`. `positioning` and `hdr` booleans must agree with their `flags` bits. `properties[]` holds unique `{ id, rawValue }` entries. The typed `busVolumeDb` (property 0x04), `makeUpGainDb` (0x05) and `outputBusVolumeDb` (0x0D) must be present together with their property and equal its float32 value. `auxFlags` is a byte, and `bypassAllEffects` is a boolean. `effects[]` holds slots `{ slotIndex 0..3 unique, effectId, bypass, shareSet, rendered }`; `shareSet` must match the effect type. `requiresProcessing` uses only known reasons. `busVolumeMayIncrease` and `busVolumeActionControlled` are booleans when present. |
| sends | `userAuxSends[]`: `{ slotIndex 0..3 unique, targetBusId, gainDb, lowPass 0..100, highPass 0..100, dynamic }`. `reflectionsAuxSend`: `{ targetBusId, gainDb, dynamic }`. `dynamic` is a required boolean. It marks a send slot that has a randomizer, RTPC or State property, so its static `gainDb` is not the complete value. Every send must target an `auxiliary-bus`. |
| `routes[]` | `outputBusId`, and `busPathIds` beginning at that bus and following `parentBusId` to a root. Optional `userAuxSends`, `reflectionsAuxSend` and `authoredBusVolumeDb` / `authoredBusMakeUpGainDb` / `authoredOutputBusVolumeDb`. |
| `sfxRoutes`, `musicRoutes` | Canonical node ID mapped to a route index within range. |

Bus send flags:

- User sends require `auxFlags` bit 0x08.
- A non-root bus with user sends also requires bit 0x04.
- A non-root bus with a reflections send requires bit 0x10.

Some processing reasons are required by the bus data:

| Condition | Required reason |
| --- | --- |
| The bus is an auxiliary bus | `auxiliary-bus` |
| The bus has sends | `aux-sends` |
| The bus has a dynamic send | `dynamic-aux` |
| An effect slot is active and effects are not bypassed | `effects` |
| `listenerRelative` is set | `positioning` |
| HDR is enabled | `hdr` |

The graph as a whole is rejected when:

- a parent or send target is missing;
- dry parents form a cycle;
- a route is not referenced;
- a bus cannot be reached from any route;
- an effect is not referenced by any bus.

Checks against the rest of the document:

- The reasons `rtpc`, `state` and `ducking` must agree with the `busRtpcs`,
  `busStates` and `busDucking` catalogs for each bus. A bus with RTPC curves
  must carry `rtpc` or `unsupported-rtpc`.
- Every SFX `sound` and music track that has an `outputBusId` needs a route
  entry. The route's path and authored gains must equal the node's own.
- Every graph bus targeted by a `set-bus-volume` or `reset-bus-volume` action
  must set `busVolumeActionControlled: true`. `all` and `all-except` target
  every bus in the graph except the listed exceptions. An element target that
  is not in the graph is not checked.
- A `set-bus-volume` action can raise the level when it is `absolute`, or when
  `busVolumeDb` plus the range maximum is above 0. Its target buses must then
  also set `busVolumeMayIncrease: true`.

## Source effects (`sound.sourceEffects`)

`sourceEffects` is a non-empty ordered chain. An empty array is rejected.
`effectId` and `slotIndex` follow the same rules as in `busEffects`. Each
effect has one of these `type` values:

| `type` | Accepted document fields |
| --- | --- |
| `parametric-eq` | Same fields as `busEffects`. `processLfe` may also be `false`. `rtpcCurves` is optional. |
| `delay` | `delayTimeSeconds` from 0.001 to 1. `feedbackPercent` and `wetDryMixPercent` from 0 to 100. `outputGainDb` from float32(-96.3) to 0. A boolean `feedbackEnabled`. `processLfe: true`. |
| `compressor` | `thresholdDb` from float32(-96.3) to 0. `ratio` from 1 to 50. `attackSeconds` above 0 and up to 1. `releaseSeconds` from 0 to 1. `outputGainDb` from -24 to 24. `processLfe: true` and `channelLink: true`. |
| `peak-limiter` | Like `compressor`, with `lookaheadSeconds` from 0.001 to 0.02 and `releaseSeconds` from 0.001 to 1. |
| `flanger` | `delayTimeSeconds` from 0.0002 to 0.1. `blend` from 0 to 1. `feedforward` and `feedback` from -1 to 1. Depth and wet/dry from 0 to 100 percent. `modulationFrequencyHz` from float32(0.02) to 20000. `outputGainDb` from -24 to 24. Boolean `lfoEnabled`, `processCenter` and `processLfe`. `wetDryMixRtpcCurve` is optional. |
| `tremolo` | Depth from 0 to 100 percent. Frequency as in `flanger`. `waveform` is `sine`, `square` or `triangle`. `phaseMode` is `left-right`, `front-rear`, `circular` or `random`. Phase offset from -180 to 180 and spread from 0 to 180. `smoothingPercent` and `pwmPercent`. `outputGainDb` from -24 to 24. Boolean `processCenter` and `processLfe`. `rtpcCurves` is optional. `triangle` needs smoothing 0, offset 0, `left-right` and spread 0. `square` accepts only the default shape or smoothing 9, PWM 15, `circular` and spread 180, always with offset 0. |
| `guitar-distortion` | `preEqBands` and `postEqBands` with up to 3 bands each, like EQ bands. `distortionType` is `overdrive` or `heavy`. Drive, tone and rectification from 0 to 100 percent. `outputGainDb` from -24 to 24. `wetDryMixPercent` exactly 100. `driveRtpcCurve` is optional. |
| `matrix-reverb` | `reverbTimeSeconds` from 0.1 to 10. `hfRatio` from 0.5 to 10. `numberOfDelays` is 4, 8, 12 or 16. Dry and wet level from float32(-96.3) to 0. `preDelaySeconds` from 0 to 1. `processLfe: true` and `delayLengthsMode: "default"`. |
| `roomverb` | Validated by `normalizeWwiseRoomVerbEffect()` in `../internal/wwiseRoomVerb.js`. |
| `meter` | `attack`, `release` and `hold` from 0 to 10. `minimum` from float32(-96.3) to 0. `maximum` from float32(-96.3) to 12, and not below `minimum`. `mode` is `peak` or `rms`. `scope` is `global` or `game-object`. Boolean `infiniteHold` and `applyDownstreamVolume`. `gameParameterId` is an unsigned 32-bit integer. |

The validator accepts these curve forms. Every curve has non-empty points
ordered by `x`, with finite values and an interpolation from 0 to 9 (4 when
omitted).

- **EQ `rtpcCurves`**: a non-empty list.
  - Each curve names an `rtpc`, and its `scope` is `object` (the default) or
    `global`.
  - `bandIndex` must point at a band present in the effect.
  - `property` is `gainDb` (scaling 0 or 2) or `frequencyHz` (scaling 3).
  - `accumulation` is `exclusive` or `additive`.
  - `defaultValue` and `controlTransition` are optional.
  - Each band/property pair appears only once.

  The validator does not restrict which Game Parameter or which property the
  builder emits.
- **Tremolo `rtpcCurves`**: one or two object-scope curves.
  - `modulationDepthPercent` (additive, scaling 0) is required.
  - `modulationFrequencyHz` (exclusive, scaling 3) is the optional second
    curve.
  - Both curves share one `rtpc`, one `defaultValue` and one required
    `controlTransition`.
- **`controlTransition`**:
  `{ type: "filtering-over-time", rampUpSeconds, rampDownSeconds }`, with both
  ramps positive.
- **Flanger `wetDryMixRtpcCurve`**: must be exactly:
  - `rtpc: "ship_Distance"`;
  - `scope: "object"`;
  - `controlSource: "built-in-distance"`;
  - `property: "wetDryMixPercent"`;
  - `accumulation: "additive"`;
  - scaling 0 and `defaultValue` 0.

  `controlSource` marks the value as the built-in distance, not a
  user-settable RTPC.
- **Guitar Distortion `driveRtpcCurve`**: object scope, `additive`, scaling 0,
  with an optional `defaultValue` and `controlTransition`.
