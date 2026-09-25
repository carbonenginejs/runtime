# Audio library builder

`CjsAudioLibraryBuilder` produces the schema-v2 audio-library document.
`build()` catalogues caller-supplied values without opening banks.
`buildFromBanks()` also opens every catalogued bank through one caller
capability and projects typed HIRC data. `buildFromResources()` reads the
metadata FSD, index and SoundbanksInfo through fetch or an injected source,
then calls `buildFromBanks()`. The resource layer (`CjsBnkFormat.wwise`)
decodes every HIRC record; this folder only qualifies, names and lowers the
decoded values.

This page lists what bank projection admits, lowers, omits and diagnoses.
Per-method details live in the JSDoc of the named function.

## Pipeline of `buildFromBanks()`

1. A preliminary `build()` produces the bank table. `music: true` requires
   `music.bnk` and `music_essential.bnk` in it.
2. Every bank is inspected. `SelectLanguageInspections` picks one variant per
   bank ID (see *Language*).
3. When `includeSfx` or `music` is set, the typed Audio/Auxiliary Bus catalog
   is parsed. It feeds `busRtpcs`, `busStates`, `busDucking`, `busEffects`
   and `busGraph`.
4. Without `includeSfx`, `eventMedia` comes from the resource layer's
   byte-level `eventMediaFromBanks`. With `includeSfx`, that heuristic never
   runs.
5. With `includeSfx`, `createSfxGraph()` lowers named events. Diagnostics go
   to `onSfxDiagnostics`. When anything was lowered, the graph supplies
   `sfx`, the event-metadata projection, and `eventMedia` derived only from
   the lowered graph. Otherwise the library has no `eventMedia`.
6. With `music: true`, `createMusicGraph()` adds the music section.

`includeSfx` cannot be combined with a caller `sfx` or `enrichment.sfx`
graph.

## Failure scope

| Scope | Cause | Result |
| --- | --- | --- |
| Whole build throws | Bus parsing failure; invalid Bus RTPC curve; invalid or unsupported active Bus State definition; missing STMG transition data for a used Bus State group; non-additive STMG filter behavior with Bus State filters; invalid ducking rule; invalid routed Bus effect slot or failed effect parsing; missing or cyclic Bus ancestry on any routed Sound or Music Track; a NodeBase aux-inheritance cycle; unmatched requested language; music bank or music-event failures | `buildFromBanks()` rejects. No partial library is returned. |
| One event omitted | Any throw while lowering the event: unsupported node, action, form or name; missing target; cycle | Listed in `diagnostics.omittedEvents` with the reason. The event is absent from `events`, `programs` and `eventMedia`. |
| One event partly kept | The single bounded Crossfade-to-Layer shape (see *Bounded fallback*) | Listed in `diagnostics.approximatedEvents`. |
| Field omitted | Unqualified `sourceEffects`, `voiceLimit`, leaf `spatial`/`dryVolumeCurve`, NodeBase State group with an unsupported property or accumulation, non-Game-Parameter or non-renderable NodeBase RTPC | Only that field is absent. The node still plays. |
| Action omitted | Voice Volume, Pitch, or LPF/HPF element target absent from every loaded NodeBase | Dropped as a no-op. The event's other actions remain. |

An event whose only actions are of unknown types produces no program and is
not listed in diagnostics.

## Metadata precedence

`createAudioMetadata` merges in this order, each later layer replacing fields
of the same event, bank or media record:

1. SoundbanksInfo metadata;
2. the bank projection (`is2D`, `maxRadiusAttenuation`, `eventsStoppedBy`);
3. caller `metadata`;
4. caller `enrichment`.

Caller data therefore keeps final precedence over every derived event field.
To override a leaf's `spatial` value, supply or enrich the `sfx` graph itself.

## Language

`language` (default `en-us`) selects before any HIRC object is merged,
because localized banks reuse object IDs for different media. Per bank ID:

- a single variant without a language is shared and always kept;
- otherwise the exact language match wins, then a variant without a language,
  then (only when no language was requested) the first variant;
- if variant banks exist and none matches the requested language, the build
  throws.

## Event lowering

Only events named in the merged metadata are lowered, in ascending event ID.
Action order is preserved in `programs`; `events` holds the Play roots.

| Action (type >> 8) | Builder admission |
| --- | --- |
| Play `0x0403` | Target lowered as a node. Delay, delay randomizer, probability, fade-in, fade-in randomizer and curve (default 4) are kept on the edge. A Play whose target is a music node is left to the music graph. |
| Play-Event `0x2103` | Inlines the target event (recursive; cycles and missing targets throw). Without timing, the nested program is merged in order. With a delay, delay randomizer or probability, the nested roots are wrapped in one synthetic `parallel` node that carries the timing, and a nested program with any non-Play action throws. A Play-Event fade is not carried. |
| `0x0503` (Play and Continue) | Throws. |
| Stop `0x01`, Pause `0x02`, Resume `0x03` | Element, All or All-Except; game-object or global. Bus targets and bus exceptions throw. An element target must be nonzero. Action flags must be 6 (Stop, Resume) or 7 (Pause). Delay, transition, randomizers, probability and curve are kept. Element Stop targets feed `eventsStoppedBy`. |
| Set/Reset Voice Volume `0x0A`/`0x0B` | Exact element target, game-object or global, target flags 0. Absolute or relative value plus randomizer, delay, transition and their ranges are kept. A Bus-flagged target is admitted only in the bounded form below. |
| Set/Reset Voice Pitch `0x08`/`0x09` | Same as Voice Volume, but any Bus target throws. |
| Set/Reset Voice LPF `0x0E`/`0x0F`, HPF `0x20`/`0x30` | Set: element only. Reset: element, All or All-Except in either scope. All targets must be 0. Exceptions only on All-Except, non-bus and unique. No probability. `properties`/`ranges` may carry only IDs `0x39`/`0x3A`. A Reset may not carry a value. |
| Set/Reset Bus Volume `0x0C`/`0x0D` | Exact forms: Set `0x0C02`/`0x0C03` (global/object element); Reset `0x0D02`, `0x0D03`, `0x0D04` (global All), `0x0D08` (global All-Except). Target and exceptions must be Bus-flagged (flags 1). No probability. Kept even when no loaded route contains the target. |
| Set/Reset Game Parameter `0x13`/`0x14` | Element mode, game-object or global scope, nonzero non-bus target, no exceptions, no probability, `properties`/`ranges` only `0x39`/`0x3A`, boolean `bypassTransition`. The target must have a catalog name and a catalog default; the default is emitted on every action. Set needs an absolute or relative finite value and a range with `min <= max`. |
| SetSwitch `0x19`, SetState `0x12` | Named group and value required. Only a fixed delay is allowed: no delay randomizer, probability, transition or ranges; a delay must be mirrored exactly by one `0x39` property. |
| Anything else | Recorded; the event is omitted with `mixed event actions`. |

Untyped actions (no decoded `action` record, or a mismatched action name or
type) throw.

### Bounded Bus-target Voice Volume

A Voice Volume action whose target is an Audio Bus lowers to
`set-bus-voice-volume` only when all of these hold:

- Set (not Reset), absolute value, zero value randomizer;
- game-object scope, element mode, target flags exactly 1 and the decoded
  bus flag set, target is an `audio-bus`;
- no delay randomizer, transition randomizer, probability or exceptions;
- at least one loaded Sound routes through the Bus, and for every such Sound
  the Bus is the first (output) Bus of its dry path, the Sound's effective
  NodeBase has no user or reflections Aux send, and no Bus on the path has
  an Aux send.

Everything else throws, including ancestor-Bus targets. A `music_` event
that contains this action throws.

### Music-named events

The SFX lowering treats an event whose name starts with `music_` as music:
its Play, Stop and setter actions are dropped, and it keeps only Set/Reset
Bus Volume and game-object Pause/Resume All actions with target 0 and no
exceptions. The music graph itself does not use names (see *Music*).

## Node lowering

| Source | Lowered form |
| --- | --- |
| Codec Sound (plug-in type 1) | `sound`. Media must be in `media` or `embeddedMedia`. Loop count 0 becomes `loop: true`; a positive count becomes `playCount`. |
| Wwise Silence source | `timed-silence` with `durationMs`. The source ID must reference an effect record with plug-in `0x00650002`, exactly 12 parameter bytes, a finite positive duration, zero random range, and no media, RTPC, State or property values. A looping Silence Sound throws. The empty inline source block never implies a default duration. |
| Any other source plug-in | Throws (`source plug-in sound`). Wwise Audio Input is one such barrier. |
| Random / Sequence | `random` (weighted when authored; weight <= 0 children dropped; `shuffle` or `random` mode; `avoidRepeat`) or `sequence`. Reverse restart throws. Continuous containers become object-scoped. |
| Step Switch / State | `switch` with named cases and a `default` (a synthetic `silence` node when no case matches the default value). The group and every assigned value must be named. Fades, `1st only` or `Continue to play` throw. |
| Stripped empty Step Switch | `silence` when group type, group ID and default ID are all 0, it is not Continuous, and both the Children and Switch assignment lists are empty. Stale per-child parameters are ignored. Other empty forms throw. |
| Layer / Blend | `blend` when any association has gain points, else `parallel`. A Layer with no Layer records, or with no associations, is `parallel`. |
| Actor-Mixer | Never a node. Its values fold into the nearest playable node. A Play targeting one throws. |

### Continuous containers

| Rule | Code |
| --- | --- |
| Transitions admitted | Disabled, Crossfade Amplitude, Crossfade Power, Delay, Trigger Rate. Sample Accurate and any other mode throw. |
| Loop count | Randomized loop count throws; a count above 32767 throws. |
| Trigger Rate | Throws when `transitionTime + transitionTimeModMin < 21` ms. |
| Crossfade | Every Sound reachable from the playlist must be finite; a reachable Switch, Layer, nested Continuous container or infinite Sound throws. Finite Sounds are marked `loop: false`. |
| Continuous Switch | Every child needs a parameter with `1st only` off, `Continue to play` off and On-Switch mode Stop; per-child fade-out/in times are kept. A branch that reaches a non-Switch Continuous container throws. |
| Nested Continuous | Throws unless one of the three forms below applies. |
| Associated Continuous Layer | Pre-started approximation; conditions in `#LowerLayer`. |

The three nested forms:

- **Trapped child.** An infinite Continuous Random with Disabled transition
  whose children include a Continuous container and never complete (a
  looping Sound, an infinite Continuous Random/Sequence, or a pre-started
  Continuous Layer). The Random keeps one object-scoped choice and emits no
  `continuous` block; the selected child owns playback. Duration is never
  inferred from media.
- **Delay around Trigger Rate.** An infinite Continuous Sequence with Delay
  transition and one plain child edge, whose child is a Sequence with only
  `type`, `scope`, `children` and `continuous`, one pass, Trigger Rate, reset
  playlist on play, and no Continuous descendants.
- **Delay around Crossfade.** An infinite Continuous Random (random mode,
  reset on play) with Delay transition and one plain child edge, whose child
  is a two-child Sequence with one pass, Crossfade Amplitude, no playlist
  reset, no Continuous descendants, and only static playback terms (`gainDb`,
  `pitchCents`, `lowPass`, `highPass`, `initialDelayMs`).

### Layer rules

- A Layer curve needs Game Parameter control type 0 and a named controller.
- Gain points must lie in 0..1.
- Each association's Layer RTPCs must lower through `CreateSfxRtpcCurve`
  (Volume, Pitch, LPF, HPF, Initial Delay). Any other property throws.

### Bounded fallback

`IsBoundedCrossfadeLayerSiblingFallback` accepts one exact shape. The event
has two plain Play actions. The blocked action targets an infinite, global,
single-child amplitude-Crossfade Random (fixed 7000 ms transition, no
randomizers, avoid-repeat 1, unweighted, reset on play) whose only child is a
trackless, non-Continuous Layer of finite codec Sounds. The sibling action
targets an independent finite codec Sound. Only the blocked action is
dropped. Every other Crossfade-to-Blend form throws.

### Never approximated

These always throw and omit the event: Sample Accurate transitions,
`1st only`, `Continue to play`, Play-to-End or other non-Stop switch modes
on Continuous Switches, Play and Continue, playable Actor-Mixers, associated
Continuous Layers with a finite direct child or an Initial Delay RTPC, Layer
RTPCs outside Volume/Pitch/LPF/HPF/Initial Delay, reverse Sequences, and
general nested Continuous clocks.

## NodeBase properties

`CreateSfxNodeBasePlaybackProjection` walks from the node up to, but not
including, the nearest playable parent. Hierarchy-only Actor-Mixers are thus
folded into the nearest playable node.

- Volume (0) sums in dB, Pitch (1) in cents, LPF (2) and HPF (3) additively;
  Initial Delay (34) sums in seconds and is emitted in ms.
- Each authored random range is kept as a separate `*Ranges` entry, so each
  range is sampled independently when the node is selected.
- RTPCs on these five properties become `rtpcCurves` when the control is a
  named Game Parameter, the accumulation is additive (filters: filter
  accumulation) and the scaling matches (Volume: 2, others: 0). A wrong
  accumulation or scaling throws. Other properties and control types are
  ignored.
- State groups become `stateProperties` only when named and Immediate. A
  non-Immediate or unnamed group with active values throws. A group with any
  other property or accumulation is omitted whole.

## Spatial projection

For every lowered event:

- The positioning owner is the first NodeBase, walking up from the leaf, with
  its positioning override set. It is 2D when it has no attenuation
  assignment.
- A leaf with a known owner gets `spatial`. It also gets `dryVolumeCurve` when
  the attenuation's first curve (`curveToUse[0]`) has scaling 2 and finite,
  non-negative, sorted distances. Missing, unsupported or Use-Project curves
  omit the leaf curve.
- The event gets `is2D: 1` only when every leaf is 2D. It gets
  `maxRadiusAttenuation` (the largest curve endpoint) only when every 3D leaf
  has a complete curve.
- An event with an unknown owner (missing NodeBase, cycle, no serialized
  parent) keeps playing. Only its metadata patch is omitted and listed in
  `diagnostics.spatial.omitted`.

## Stop relationships

An element Stop target matches a lowered event when it is one of that event's
leaves or any leaf ancestor, including one unresolved missing parent. The
stopping event name is added to the stopped event's `eventsStoppedBy`.
Unmatched targets go to `diagnostics.stopRelationships.unresolved`. Sound
nodes keep the same ancestry as `matchIds` for runtime matching.

## Leaf bus route

The output Bus is the first `overrideBusId` found walking up the NodeBase
ancestry. The route keeps:

- `outputBusId` and the ordered dry `busPathIds`;
- `authoredBusVolumeDb`: the sum of Bus Volume along the dry path;
- `authoredBusMakeUpGainDb`: the sum of Make-Up Gain along the dry path;
- `authoredOutputBusVolumeDb`: Output Bus Volume (property `0x0D`) read only
  from the NodeBase that supplied the override.

A missing or cyclic Bus ancestor throws.

## Source effects

`CreateSfxSoundEffectProjection` walks up to the first NodeBase whose FX
override bit is set, or the root. A root list is effective even without the
bit. An explicit empty override clears the inherited list. Bypassed or
rendered slots are skipped. The chain is emitted only when every remaining
slot is Parametric EQ, Delay, Compressor, Peak Limiter, Flanger, Tremolo,
Guitar Distortion, Matrix Reverb, RoomVerb or Meter, and its parser admits
the record. Any other plug-in, a parse failure, a bypass-all flag on the
walked path, or invalid slot flags omits the whole chain; the voice plays
dry.

## Voice limit

`CreateSfxSoundVoiceLimitProjection` emits
`{ scope: "game-object", maxInstances: 1, behavior: "reject-newest" }` only
when:

- the Sound's own packed Advanced Settings flags are `0x09` and its maximum
  is 1;
- the NodeBase ancestry reaches a root (no missing parent or cycle);
- the effective below-threshold behavior is Continue (0). It comes from the
  first NodeBase that overrides virtual-voice behavior, else the root;
- no NodeBase on the priority path (up to and including the first priority
  override) has a Priority randomizer, RTPC or State value;
- every Bus on the dry path exists, has no static maximum-instance policy,
  and has no `MaxNumInstances` (53) RTPC.

`OmitFutureScheduledVoiceLimits` then removes it from Sounds reachable
through a positive Play delay (including its randomizer maximum), a positive
own Initial Delay or Initial Delay RTPC, a Continuous Delay with a positive
duration, or any Continuous Crossfade.

## Bus catalogs

| Catalog | Builder rules |
| --- | --- |
| `busRtpcs` (v2) | Only Bus RTPCs on property 0 (`voice-volume`) and 4 (`bus-volume`). Each needs control type 0, additive accumulation, scaling 2, a named parameter with a finite default, and non-empty sorted points with values in -1..1 and interpolation 0..9. |
| `busStates` (v2) | Per Bus, groups whose active values touch Pitch (1), LPF (2), HPF (3) or Bus Volume (4). Any other active property throws. Each value needs a definition with additive accumulation (filters: filter accumulation) and the dB flag set only for Bus Volume. The group and its states must be named. `filterBehavior: "additive"` is emitted when filters are used, and requires STMG filter behavior 0. |
| `busDucking` (v1) | Sources must be Audio Buses. Recovery is a non-negative integer; maximum duck is -200..0 dB. Targets must be Audio Buses, not the source or its ancestors, and not duplicated. Duck volume lies between the maximum and 0 dB. Fades are non-negative integers; curves 0..9; target property 0 (Voice Volume) or 4 (Bus Volume). |
| `busEffects` (v1) | Static Parametric EQ slots on routed Buses. See below. |
| `busGraph` (v1) | Emitted when any SFX or music route exists. See below. |

### Bus State sync type

Each group keeps its authored `syncType` and emits `effectiveSyncType: 0`.
A non-Immediate group on a Bus used by music, whose states change anything
other than Pitch, throws. Bus Pitch does not apply to music, and SFX-only
Buses apply State changes immediately.

### Distributed Bus EQ

For each routed Bus not flagged bypass-all, active (non-bypassed) slots are
collected. Slot flags above `0x03`, a missing effect or a ShareSet mismatch
throws. Any active non-EQ slot marks its Bus unsupported. Every Bus on a dry
path that crosses an unsupported Bus is excluded, so no EQ is emitted on that
route. The remaining EQs must be static (no media, RTPC, State or property
values).

### Bus graph

- Routes are deduplicated by their complete content: dry path, authored
  gains, and effective NodeBase user/reflections sends. `sfxRoutes` and
  `musicRoutes` map Sound and Music Track IDs to route indices.
- Buses are the closure of dry parents and Aux targets from every route.
  Each record keeps its type, parent, channel configuration, raw properties,
  positioning and HDR flags, Aux flags and sends, Bus Volume, Make-Up Gain,
  Output Bus Volume, and every ordered effect slot, including bypassed and
  unknown plug-ins.
- Effect records keep plug-in identity, parameter bytes as base64, control
  counts, and embedded media source IDs.
- `build()` marks each Bus targeted by a retained Bus Volume action with
  `busVolumeActionControlled`. It adds `busVolumeMayIncrease` when a Set is
  absolute or its maximum is above 0 dB.

Processing reasons per Bus: `auxiliary-bus`, `aux-sends`, `dynamic-aux`,
`effects` (any non-bypassed slot, unless bypass-all), `positioning`
(listener-relative), `hdr`, `rtpc` (property 0 or 4), `voice-limits`
(`MaxNumInstances` RTPC), `unsupported-rtpc` (any other RTPC property),
`state`, `ducking`.

Aux sends: user slots 0..3 read gain `0x08+n`, LPF `0x10+n` and HPF `0x14+n`
(filters 0..100); reflections read gain `0x1A`. A send is `dynamic` when a
randomizer, RTPC or State targets its properties. Inheritance follows
wwiser's root rule: a root NodeBase's list is effective with the override bit
clear; a non-root node with the bit clear inherits; the first overriding node
replaces the list.

## Music

- The music hierarchy is read from `music.bnk` and `music_essential.bnk`, in
  that order, so the essential bank replaces duplicate IDs.
- Music events come from every selected bank. An event is music when a Play
  or Stop targets a music node, or a Switch/State setter names a music
  argument group. Names and bank location are not used.
- A Music Track keeps only property-0 Voice Volume RTPCs, as global-scope
  curves. Each must be a named Game Parameter with additive accumulation and
  scaling 2; anything else on property 0 throws. Other Track RTPC properties
  are ignored.
- Music Pause/Resume must be game-object element or All (target 0) without
  flags, exceptions, delays, randomized transitions or probability. An event
  that mixes them with Play, Stop or setters throws. An element action whose
  target is not a postable music root is dropped. Repeated actions are kept
  in order, because their count sets the nested pause depth.
