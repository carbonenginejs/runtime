# Wwise v150 routing support

Status: Experimental
Scope: `@carbonenginejs/runtime-resource` BNK readers consumed by `@carbonenginejs/runtime-audio`
Audience: Runtime-resource and runtime-audio maintainers
Summary: Defines implemented dry-output routing and the remaining Wwise bus-processing work.

## Current support

`runtime-resource` exposes typed complete v150 Audio Bus, Auxiliary Bus, Fx
ShareSet, and Fx Custom bodies and retains every music node's qualified
NodeBase. `runtime-audio` consumes the routing records only in its optional
builder. Portable SFX sounds and music tracks
carry their effective output bus, ordered cycle-safe ancestry, summed authored
base Bus Volume, summed Make-Up Gain, and the Output Bus Volume authored by the
NodeBase that supplies the effective output-bus override. Playback adds live
Bus Volume action state, global Bus Volume RTPC curves, and global Bus Volume
State contributions without changing the application SFX or music sliders.
It also projects v150 Audio Bus auto-ducking and coordinates actual scheduled
SFX and built-in music source activity through one shared clock.
Routed static Wwise Parametric EQ slots are projected into one portable catalog
and realized on the corresponding collapsed dry routes.

## Music NodeBase contract

All four v150 music HIRCs inherit output routing from
`CAkParameterNodeBase::NodeBaseParams`. The typed records retain the
existing exact music-tail validation and expose the retained prefix
as `nodeBase` using these ranges:

- Segment, Playlist, and Switch: `[1, anchor)`; byte zero is `uFlags`.
- Track: `[headEnd, typeAt)` or `[headEnd, simpleAt)`.

The audio builder walks `directParentId` from a leaf and selects the first
nonzero `overrideBusId`. Only that same NodeBase contributes Output Bus Volume;
a value stored on a descendant that does not override the output bus is not an
active routing contribution. Track `iLookAheadTime` is read as a signed `s32`.

## Audio, Auxiliary Bus, and effect contract

For bank version 150, HIRC 8 is Audio Bus, HIRC 18 (`0x12`) is Auxiliary Bus,
and HIRC 19 (`0x13`) is LFO. The reader accepts only HIRC 8 and 18 as
bus records; type 19 remains an LFO.

`inspectBNK()` removes the leading object ID, so the current entry payload
starts with:

```text
+0  u32 overrideBusId       // parent bus; zero means root
+4  u32 outputDeviceId      // root only
... AkPropBundle:
     u8 propertyCount
     u8 propertyIds[propertyCount]
     u32 propertyValues[propertyCount]
```

For a non-root bus the property count is at `+4`; for a root it is at `+8`.
The property-value array is parallel to the ID array. In v150, property
`0x04` is finite little-endian float32 Bus Volume. Keep an absent value as
`null`, distinct from authored zero. `0x0d` Output Bus Volume and `0x05`
Make-Up Gain are separate properties.

The BNK reader boundary exposes this typed bus catalog:

```js
buses: Map<id, {
    id,
    bank,
    type: "audio-bus" | "auxiliary-bus",
    overrideBusId,
    outputDeviceId,
    properties: [{ id, rawValue, floatValue }],
    busVolume,
    makeUpGain,
    outputBusVolume,
    positioning,
    aux,
    policy,
    channelConfig,
    hdr,
    recoveryTime,
    maxDuckVolume,
    ducks,
    fx,
    metadata,
    rtpcs,
    state,
}>
```

The typed catalog is limited to bank version 150 and consumes the complete bus
body exactly. It bounds-checks conditional fields, parallel property arrays,
positioning and aux routing, duck rules, ordered effect/metadata slots, RTPCs,
and state data. Duplicate or invalid properties, non-finite typed values,
truncation, and trailing data reject the typed record while preserving raw
inspection with a diagnostic. Absent projected gain values stay `null`,
distinct from authored zero. Children are derived by reversing parent links
rather than serialized into the record.

The same boundary exposes v150 HIRC 16 Fx ShareSet and HIRC 17 Fx Custom
records. Their generic typed form preserves plug-in identity, the exact opaque
parameter block, media index-to-source mappings, RTPC curves, state values, and
initial plug-in property values. The resource layer does not interpret opaque
plug-in parameters or media as audio.

Across EVE build 3444265's 29 audio banks, the exact-end readers decode all 133
serialized bus bodies and all 410 serialized effect bodies with no failures.
The later-bank-wins catalogs contain 130 buses and 381 effects. The effect
records cover 16 plug-in classes; the one Convolution Reverb ShareSet maps
media index zero to source 154360724, whose `PLUG` payload is opaque plug-in
media rather than WEM audio.

## Remaining work

The dry-output route applies Bus Volume and Make-Up Gain when those properties
occur in the selected dry ancestry. It separately applies the effective
NodeBase Output Bus Volume and evaluates every scaling-2 Bus Volume RTPC on the
route. The builder keeps raw graph values because Wwise interpolates them
before converting `-1` to `-96.3 dB` and other values with
`20 * log10(value + 1)`. Keeping these contributions distinct preserves their
future placement when real bus and effect stages replace the collapsed gain.
Static v150 Parametric EQ is the one implemented effect adapter. Auxiliary
sends and complete ordered effect chaining, dynamic effect controls, nonlinear
effects, wet-path duck placement, effect-tail bus activity, meters,
virtual-voice behavior, and spatial diffraction remain separate runtime
slices. Those
features need their complete effective send/property projection, qualified
plug-in adapters, and signal semantics; the typed catalogs do not imply that
playback is implemented.

EVE build 3444265 has 104 Parametric EQ definitions. Exactly two static Custom
instances occur on realized dry routes: one reaches 3,717 SFX leaves and
applies a peaking band at `-13 dB`, `120 Hz`, `Q=5` plus an authored-neutral
high shelf; the other reaches 172 SFX leaves and is entirely neutral. Their
combined reach is 3,889 SFX leaves and zero music tracks. Neither routed
instance has RTPC, State, property-value, or media controls. Eleven EQ
definitions outside the qualified Audio Bus slots do have controls and are not
silently promoted; their SFX NodeBase effect slots remain unsupported.

The builder follows pinned wwiser's version-150 56-byte parameter layout,
validates exact boolean bytes and ShareSet/Custom slot identity, preserves bus,
slot, and band order, and rejects routed `processLfe:false` until an independent
browser LFE branch exists. The current Web Audio realization distributes each
static EQ across source routes as an audible adaptation. It is not exact
shared-bus placement under downstream gain automation, moving spatialization,
or nonlinear stages. The audible EVE EQ follows an active Compressor in Wwise
slot order, so adding Compressor or Peak Limiter requires migration to a shared
ordered bus graph rather than stacking a nonlinear stage per voice.

EVE build 3444265 authors 60 Bus Volume RTPC curves on 56 buses, driven by 18
Game Parameters. Every one of the 16,263 serialized SFX leaves and 2,484 music
tracks reaches at least one affected bus through its dry ancestry. All 60
curves use Game Parameter control type 0, additive accumulation 2, and dB
scaling 2, so the current per-route scalar is signal-equivalent on the dry
path. The catalog is stored once per bus rather than duplicated on every leaf.

The same build authors 117 additive in-dB Bus Volume State values across 113
bus/State-Group occurrences on 60 buses and 42 distinct State Groups. Of those
buses, 49 occur on current dry routes; all 16,263 SFX leaves and all 2,484 music
tracks reach at least one affected bus. Matching groups and distinct buses add
their decibel contributions, while a missing State case remains neutral. The
portable catalog embeds the exact STMG default and directed transition rules so
runtime blending is interruptible and independent of the optional SFX graph.

That unified version-2 catalog also retains one Bus Pitch value (`-100` cents),
24 LPF values (`-70..100`) on 18 buses, and six HPF values (`20..45`) on four
buses. Pitch reaches 12,678 SFX leaves and no music tracks. LPF reaches 12,909
SFX leaves and 2,482 music tracks; routed HPF ancestry reaches 13,707 SFX leaves
and 2,482 music tracks. EVE's STMG filter behavior is additive. Runtime sums
signed weighted values across groups and buses before the final clamp, so the
negative LPF cases are not discarded early. SFX Pitch uses the existing
transport integration; built-in music deliberately ignores Audio Bus Pitch as
required by Wwise while applying LPF/HPF on its dry routes.

The same build authors 14 auto-ducking source buses and 36 links to 20 unique
target buses. Nine source buses occur on SFX dry routes, three occur on music
routes, and two are currently unreachable; 33 links can therefore activate.
All 20 targets occur on a realized SFX or music route. The target-property
split is 24 Voice Volume and 12 Bus Volume rules, with curves 1, 2, 4, 6, 7,
and 8, Recovery Times of 0, 1000, or 2000 ms, and fade pairs ranging from
100/5000 through 5000/3000 ms. The portable catalog preserves all 36 rules
rather than duplicating them onto 16,263 SFX leaves or 2,484 music tracks.

Runtime activity begins at the physical source's scheduled `start()` time,
not at event post or media acquisition. It is binary per source bus: overlaps
hold one duck and do not stack, while different source buses add. The last
source end starts Recovery and then the authored Fade In; reactivation during
Recovery cancels release, and reactivation during Fade In rebases into Fade
Out. Curves are evaluated with the shared Wwise interpolation table in linear
gain. The current Audiokinetic definition treats Maximum Ducking Volume as the
collective source-bus floor across its listed targets; a v150 differential
Authoring fixture remains desirable because older documentation used
target-oriented wording.

Voice Volume and Bus Volume remain separate typed target properties. The
present engine has no auxiliary-send or complete shared effect graph, so both
contributions are audibly combined only on its collapsed dry-route gain. This
does not claim
future wet-path equivalence: Voice Volume must also affect sends, Bus Volume
targets final bus volume, and source-side effect tails may extend activity.
See Audiokinetic's
[Auto-Ducking reference](https://www.audiokinetic.com/en/public-library/2025.1.3_9037/?id=auto_ducking_tab&source=Help)
and [voice pipeline](https://www.audiokinetic.com/en/library/edge/?id=understanding_voice_pipeline&source=Help).

All but one occurrence author Immediate synchronization. The exception is
State Group `video_overlay` (`2603658559`) on Audio Bus `2609808943`: State
`on` (`1651971902`) contributes `-96 dB` and authors Next Grid. That bus reaches
12,678 SFX leaves and no music tracks. Wwise documents that a bus containing
only Actor-Mixer Hierarchy sound objects ignores the authored music
synchronization point and applies the State immediately. The catalog therefore
preserves `syncType: 1` while recording `effectiveSyncType: 0`. The builder
rejects any future non-immediate bus State on a music route until a qualified
music-grid scheduler exists. See Audiokinetic's
[State-change synchronization rules](https://www.audiokinetic.com/en/public-library/2024.1.7_8863/?id=defining_points_within_music_objects_for_state_changes&source=Help).

The pinned wwiser source remains the binary-format guide for State property,
accumulation, and synchronization enums. Its report layer explicitly does not
model dynamic State synchronization timing, so the route-dependent effective
behavior above follows Audiokinetic's runtime semantics rather than a report
inference.

EVE build 3444265 contains three sounds with an effective nonzero Output Bus
Volume: `1030460440` (`+3 dB`), `315857869` (`+8 dB`), and `577594853`
(`+6 dB`). They all route through bus `3429521127`; its dry ancestry contains
only a Wwise Meter, which is signal-transparent. The current scalar realization
therefore produces the authored amplitude for these sounds while meter behavior
itself remains unsupported.

In EVE build 3444265, the two buses that author Make-Up Gain are Auxiliary
Buses. No SFX leaf or music track reaches either bus through its dry-output
ancestry. A structural walk finds 516 candidate SFX leaves, but eight descendants
replace the inherited user-aux list; the qualified effective count is 508.
Both routes contain effect processing. The Convolution Reverb also consumes an
opaque `PLUG` payload rather than WEM audio, and the complete paths include a
Wwise Peak Limiter. Consequently, the implemented dry route retains the correct
separate Make-Up Gain contract but does not yet make those EVE values audible.
The next aux/effect slice must realize the effective auxiliary routing together
with its ordered qualified effect chains; routing those sends as dry parallel
copies would not be a parity implementation.

The portable `busGraph` checkpoint now preserves the complete reachable
topology without making it audible. EVE 3444265 projects 14 authored bus aux
links from ten source buses to five targets. A wwiser-correct NodeBase walk
finds 3,645 SFX Sounds with effective direct user sends (4,288 send references);
root Actor-Mixer `513700882` is the important inheritance edge because its
clear override bit is still effective at the root. Eight descendants replace
that list, leaving 80 Sounds feeding Auxiliary Bus `2266223546`, whose authored
send to `518379211` is the fourteenth bus link. Music authors no direct NodeBase
send, though 2,482 tracks traverse bus `3991942870` and therefore its bus-level
send to `1475559705`.

The five wet targets divide cleanly. `3845478417`, `3243121821`, and
`1475559705` return through a `-96 dB` parent and have only bypassed EQ/Meter
slots. `1912148245` cascades to `518379211`; their audible paths contain ordered
Compressor, Parametric EQ, Convolution Reverb, and Peak Limiter stages. The
Convolution ShareSet `3019852427` references embedded source `154360724`, a
3,179,376-byte `PLUG` payload in `hangar.bnk`, not WEM. The catalog retains that
cross-bank media identity and opaque parameter block. Shared DSP placement and
a qualified PLUG decoder remain prerequisites for audible parity.

The shared-runtime seam resolves immutable route handles. One controller belongs
to each enabled audio-system generation and is shared by SFX and music;
install-time checks require every playable routed Sound/track to agree with its
catalog dry projection. Exact leaf and track IDs survive scheduling, while
library disposal invalidates the controller before the backend nodes are
disconnected.

SFX realization now keeps one lazy branch per exact route handle and spatial
mode inside each emitter generation. Same-route 3D voices share a synchronized
panner, different authored routes use different panners, and 2D signals remain
on a distinct flat branch. Branches retain the old generation's placement,
scaling, and object-RTPC snapshot across unregister/re-register and disconnect
only after that generation drains. They currently feed the same SFX destination
unless the strict mixer qualifies the complete path; no shared DSP is enabled.
Qualified music tracks now attach through separate per-segment transition
lanes and per-instance exact-route lanes. Those stages mirror authored
crossfades and Play/Stop fades before the shared music category input, while
blocked tracks retain the legacy music path.

The system now owns the first fail-closed shared mixer contract. It can allocate
stable SFX/music category entries and one shared unity node per common ancestor,
but only for effect-free dry audio-bus paths with default channel layout and no
authored processing reason. Barrier routes return `null` before allocating any
partial graph. On the real EVE catalog every normal route remains blocked by
dynamic controls and the active root Peak Limiter.

Qualified SFX branches now connect after their flat/spatial route stage to the
shared SFX category input. When analyser support exists, each qualified branch
uses its own analyser before that input and `GetGameObjLevel()` sums their sample
frames with the legacy emitter analyser. Blocked paths still connect to the
legacy SFX destination and allocate no partial mixer graph. Qualified music
routes likewise retain route identity through segment and instance envelope
lanes; their category volume is applied by the shared mixer rather than the
legacy music output. The current EVE
catalog qualifies zero of 16,255 SFX references and zero of 2,484 music
references across 262 routes, so this integration changes no EVE signal path.

EVE's reachable ordered graph contains five active 22-byte Wwise Compressors
and one active 22-byte Wwise Peak Limiter. All are static, channel-linked, and
configured to process LFE. The root limiter is ShareSet `3134687450` on bus
`4085017428`: threshold `-1 dB`, ratio `10`, lookahead `0.01 s`, release
`0.1 s`, and `0 dB` output. Pinned wwiser proves the limiter layout but has no
Compressor parameter parser; the coherent Compressor field order therefore
remains an empirical v150 corpus interpretation rather than a source-proven
adapter contract. Web Audio's `DynamicsCompressorNode` has a fixed 6 ms
lookahead, automatic makeup and different detector/envelope behavior, and a
maximum ratio of 20 while one EVE Compressor authors 20.1. Exact mode keeps all
six stages as barriers. The backend's independent safety compressor is not an
authored Wwise limiter and must never be reused as one.
