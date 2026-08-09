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
Bus Volume action state, global Voice/Bus Volume RTPC curves, and global Bus
Volume State contributions without changing the application SFX or music
sliders.
Qualified graph routes apply static Bus Volume, global Bus Volume RTPC, and
Immediate State gain at one shared post-effect fader per physical Bus. The
route-local stage retains Make-Up Gain, effective NodeBase Output Bus Volume,
Bus Volume actions, and collapsed-route ducking; SFX Voice Volume remains a
separate pre-Bus stage. The exact SFX Aux shape keeps Voice-target ducking
before its split and applies Bus-target ducking after the additive State filter
on each complete dry/wet leg.
It also projects v150 Audio Bus auto-ducking and coordinates actual scheduled
SFX and built-in music source activity through one shared clock.
Routed static Wwise Parametric EQ slots are projected into one portable catalog
and realized on the corresponding collapsed dry routes. Static Wwise Delay is
decoded directly from the portable graph and realized only at its shared Bus.
The strict shared
mixer also decodes source-proven v150 Wwise Meter records and may omit only
audio-transparent instances that cannot feed telemetry back into the graph.
It may likewise omit a static user-aux send only when the complete return is
proven to remain at or below Wwise's `-96 dB` silence threshold, or realize the
narrow exact SFX return shape documented below.

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

The dry-output route retains Bus Volume and Make-Up Gain when those properties
occur in the selected dry ancestry. A qualified shared graph moves only Bus
Volume to exact per-Bus post-effect faders. It separately applies the effective
NodeBase Output Bus Volume and evaluates every qualified scaling-2 Voice
Volume and Bus Volume RTPC on the route. SFX Voice Volume owns a distinct gain
before Bus Volume and effects; built-in music continues to consume Bus Volume
only. The builder keeps raw graph values because Wwise interpolates them
before converting `-1` to `-96.3 dB` and other values with
`20 * log10(value + 1)`. Keeping these contributions distinct preserves their
future placement when real bus and effect stages replace the collapsed gain.
Static v150 Parametric EQ and Wwise Delay are the implemented DSP adapters. Feedback-free
v150 Meter records have a qualified audio-transparent omission contract, but
Meter telemetry is not implemented. One qualified SFX-only static user send is
implemented when its neutral-filter Auxiliary return rejoins the dry ancestry;
all other audible auxiliary sends and complete ordered effect chaining, dynamic
effect controls, nonlinear effects, general wet-path duck placement,
effect-tail bus activity, Meter telemetry,
virtual-voice behavior, and spatial diffraction remain separate runtime
slices. Those
features need their complete effective send/property projection, qualified
plug-in adapters, and signal semantics; the typed catalogs do not imply that
playback is implemented.

Bus-target Voice Volume actions remain Voice Volume, not Bus Volume. The
bounded runtime form admits only an absolute, non-randomized game-object Set
whose target is the first/output Bus of every affected Sound and whose route
has no NodeBase or Bus Aux sends. One per-voice gain stores the posting
emitter's Bus-keyed state and sits before the route's Bus processing, including
for voices posted by a later event. Fixed delay and transition timing are
retained. Reset, global, relative/randomized, ancestor-Bus, wet, and music
forms remain barriers because they need broader target enumeration or
stage-aware insertion inside the Bus ancestry.

EVE build 3444265 has 104 Parametric EQ definitions. Exactly two static Custom
instances occur on realized dry routes: one reaches 3,717 SFX leaves and
applies a peaking band at `-13 dB`, `120 Hz`, `Q=5` plus an authored-neutral
high shelf; the other reaches 172 SFX leaves and is entirely neutral. Their
combined reach is 3,889 SFX leaves and zero music tracks. Neither routed
instance has RTPC, State, property-value, or media controls. Eleven EQ
definitions outside the qualified Audio Bus slots do have controls and are not
silently promoted; their SFX NodeBase effect slots remain unsupported.

The later EVE build 3453885 source-local path resolves the first effective
NodeBase effect override for every retained Sound. A descendant override
replaces its parent list, an explicit empty override clears it, and a root list
is effective even when its override bit is clear. Complete static,
control-free Parametric EQ/Wwise Delay chains are projected once per voice
before Voice LPF/HPF and the emitter/auxiliary split. The exact demo now
installs 317 qualified Sound leaves across 127 retained events: 238 EQ leaves
across 120 events and 79 Delay leaves across eight events. Of the EQ leaves,
150 are acoustically non-neutral. Five chains mixed with Wwise Tremolo and
five EQ leaves with live RTPC controls remain dry-playback approximations;
overlapping property-value, unsupported-plug-in, and independent-LFE barriers
are not partially applied.

The builder and shared mixer follow pinned wwiser's version-150 56-byte
parameter layout, validate exact boolean bytes and ShareSet/Custom slot
identity, preserve bus, slot, and band order, and reject routed
`processLfe:false` until an independent browser LFE branch exists. A fully
qualified graph route now realizes one ordered Web Audio EQ chain per Bus after
SFX spatialization or music route envelopes. Blocked and graphless paths retain
the distributed source-route fallback. The field decoding and graph placement
are exact, but Web Audio biquads are not claimed to be native Wwise DSP. EVE's
reachable EQ follows an active Compressor in Wwise slot order, so its chain
remains blocked rather than stacking a nonlinear stage per voice.

Pinned wwiser proves the v150 Wwise Delay's 18-byte layout: float32 Delay Time,
Feedback, Wet/Dry Mix, and Output Level followed by one-byte Enable Feedback
and Process LFE booleans. The shared adapter validates the ranges documented by
the [official Wwise Delay reference][wwise-delay], requires Process LFE until an
independent browser LFE branch exists, and rejects every dynamic, media, or
malformed record before allocating nodes. It realizes one shared Web Audio
dry/wet split, optional feedback loop, and output gain in authored Bus/slot
order. This is an explicit browser DSP adaptation, not a native Wwise claim.
The same stage may be voice-owned for a qualified source override. Its
post-source feedback tail is deliberately not a lifecycle clock: Web Audio
does not expose Wwise's plug-in tail completion, so disposal at decoded
dry-source completion cuts residual feedback. Pause and seek likewise reuse
browser node state rather than claiming native plug-in-state parity.

[wwise-delay]: https://www.audiokinetic.com/en/public-library/2025.1.3_9039/?id=wwise_delay_plug_in&source=Help

EVE build 3444265 contains seven active, static, control-free Delay Custom
instances on two buses and 14 SFX leaves. Every instance authors a one-second,
100-percent-wet delay with `processLfe:true`; six disable feedback while one
enables 45-percent feedback. Every affected dry route later crosses the
unsupported root Peak Limiter, and ten also cross audible auxiliary routing,
Compressor, and Parametric EQ stages. Delay support therefore unlocks no EVE
route by itself: the strict mixer retains all 14 barriers until the complete
ordered chain is qualified.

EVE build 3444265 authors 60 Bus Volume RTPC curves on 56 buses, driven by 18
Game Parameters. Every one of the 16,263 serialized SFX leaves and 2,484 music
tracks reaches at least one affected bus through its dry ancestry. All 60
curves use Game Parameter control type 0, additive accumulation 2, and dB
scaling 2, so the current per-route scalar is signal-equivalent on the dry
path. The catalog is stored once per bus rather than duplicated on every leaf.

The same build authors seven property-0 Voice Volume RTPC curves on seven
buses, all driven by `advanced_settings_atmosphere` (`3045458040`). They use
Game Parameter control type 0, additive accumulation 2, dB scaling 2, and
linear interpolation. Their raw reach is 2,797 SFX references and no music
references. Exactly 963 SFX references have no auxiliary send or other barrier
and cross only feedback-free Meter effects; those routes now realize the
control on a separate pre-bus gain. The remaining 1,834 stay blocked by
feedback-capable Meter, auxiliary, unsupported-RTPC, or ordered effect barriers.

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

Voice Volume and Bus Volume remain separate typed target properties. Voice
Volume applies before the qualified SFX dry/wet split, while Bus Volume targets
are evaluated after State filtering over each complete route leg. A duck source
that would place part of its collective maximum floor at Voice Volume and part
at Bus Volume fails closed, as does a duck source or Voice target on the
wet-only ancestry. This narrow placement proof does not claim general wet-path
equivalence: source-side effect tails may extend activity and unsupported Aux
shapes remain blocked.
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
The remaining general aux/effect slice must realize the effective auxiliary routing together
with its ordered qualified effect chains; routing those sends as dry parallel
copies would not be a parity implementation.

The portable `busGraph` checkpoint now preserves the complete reachable
topology. EVE 3444265 projects 14 authored bus aux
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
slots. Their sends are static, use neutral send filters, and their installed
RTPC/State upper bounds cannot amplify the return. The mixer therefore omits
only those provably silent paths and allocates no wet nodes for them. This adds
3,177 qualified SFX references and 2,347 music references: totals become 7,596
of 16,255 SFX and 2,349 of 2,484 music, across 50 SFX and seven music route
records. Absolute and positive-relative Bus Volume Set actions are projected as
`busVolumeMayIncrease` barriers so a future authored action cannot invalidate
the proof. Every Set or Reset Bus Volume target also carries the separate
`busVolumeActionControlled` marker. The strict mixer rejects that marker on an
audible effect ancestry even though static/global Bus gain now has exact
post-effect placement: Bus Volume actions are scoped to a playing instance or
game object and therefore cannot safely drive one physical fader shared by
unrelated voices and music. Otherwise an action could attenuate only new Delay
input while an existing feedback tail continued at the old gain.

Auxiliary Bus `3235074386` supplies the first exact audible return. Eleven SFX
references on routes 83 and 199 author one static neutral-filter send at `-14`
or `-20 dB`; their dry and wet branches rejoin at Bus `3161330387`. The route
entry fans out after spatialization. Each branch adds State LPF/HPF across its
complete ancestry before one final clamp, then applies its complete Bus-target
duck contribution before entering the physical buses and sharing the common
suffix. Voice Volume and Voice-target ducking remain before the split. This raises the qualified SFX
total to 7,607. Route 68 remains blocked: only its wet branch crosses Bus
`2609808943`, whose active State authors `-100` cents of Pitch, and one source
playback rate cannot pitch only the wet copy. It is exactly one SFX reference,
leaf `602217068`; supporting it requires synchronized dry and wet source lanes,
not merely relaxing the mixer gate.

The admitted EVE leaves are `308284283` on route 83 and `32756389`,
`179741258`, `180881900`, `311848135`, `552000032`, `746615656`, `859755539`,
`865594407`, `1046944186`, and `1049068182` on route 199. They are reached by
`triglavian_controlled_gate_inactive_ambience_play` and the four
`medium_structure_amarr_play`, `medium_structure_caldari_play`,
`medium_structure_gallente_play`, and `medium_structure_minmatar_play` events.

`1912148245` cascades to `518379211`; their audible paths contain ordered
Compressor, Parametric EQ, Convolution Reverb, and Peak Limiter stages. The
Convolution ShareSet `3019852427` references embedded source `154360724`, a
3,179,376-byte `PLUG` payload in `hangar.bnk`, not WEM. The catalog retains that
cross-bank media identity and opaque parameter block. Shared DSP placement and
a qualified PLUG decoder remain prerequisites for audible parity.

Pinned wwiser decodes the v150 Convolution Reverb's 57-byte parameter envelope,
but still labels its final float32 and byte unknown and does not decode `PLUG`
media. The EVE payload contains `hash`, `junk`, and `data` chunks; the apparent
48 kHz field inside `data` is not sufficient evidence for a PCM layout. Raw
effect media already survives library construction, install, tools-core range
acquisition, and HTTP delivery as `application/octet-stream`, so transport is
not the blocker. Complete built-in support first needs an independently
qualified PLUG-to-impulse decoder in runtime-resource, then a cancellation-safe
effect-media preparation seam in runtime-audio before the shared Bus graph is
realized. Passing the opaque payload to `decodeAudioData` or treating its data
chunk as PCM would be guesswork.

The ShareSet affects 508 SFX references on routes 53, 54, and 250. A strict
qualification simulation gives Convolution support zero immediate unlocks,
both alone and together with hypothetical Compressor and Peak Limiter support,
because all three routes still require the general audible auxiliary-return
topology and its complete wet-side gain/State placement.

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
only after that generation drains. A branch enters shared Bus topology only
when the strict mixer qualifies its complete path; every other branch retains
the legacy SFX destination.
Qualified music tracks now attach through separate per-segment transition
lanes and per-instance exact-route lanes. Those stages mirror authored
crossfades and Play/Stop fades before the shared music category input, while
blocked tracks retain the legacy music path.

The system owns a fail-closed shared mixer contract. It allocates stable
SFX/music category entries and one shared input node per common ancestor only
for strict default-channel paths plus the exact SFX Aux shape above.
Decoded positioning and HDR override metadata is neutral only when positioning
and HDR are both inactive; unknown flags and active behavior remain barriers.
Effect records are decoded from the authoritative graph bytes before any node
is allocated.

A qualified path may contain a complete static Parametric EQ/Delay sequence plus
feedback-free Meter omissions. Each physical Bus realizes one fader after its
ordered effects and before its parent; that fader owns its static Bus Volume,
global Bus Volume RTPC, and Immediate State gain. Qualification requires the
route's authored Bus-volume aggregate to exactly equal the sum of the physical
Bus values and requires live RTPC/State readers whenever those catalogs are
used. Make-Up Gain, effective NodeBase Output Bus Volume, and Bus Volume
actions stay on the existing per-voice or per-track stage. Voice Volume and
State Pitch stay source-local. Immediate State LPF/HPF retain one additive
whole-route filter pair; the exact SFX Aux path evaluates separate whole dry
and wet ancestries, followed by their Bus-target duck gains. Incoming
duck targets count as route controls even though the portable graph declares
each duck on its source Bus. Unsupported RTPC bindings, dynamic effect controls,
media, rendered slots, unsupported auxiliary sends, mixed/unknown effects, and any
voice-/route-local control crossing an audible shared effect remain barriers.

Qualified SFX branches now connect after their flat/spatial route stage to the
shared SFX category input. When analyser support exists, each qualified branch
uses its own analyser before that input and `GetGameObjLevel()` sums their sample
frames with the legacy emitter analyser. Blocked paths still connect to the
legacy SFX destination and allocate no partial mixer graph. Qualified music
routes likewise retain route identity through segment and instance envelope
lanes; their category volume is applied by the shared mixer rather than the
legacy music output. A full build-and-realize audit of EVE 3444265 qualifies
7,607 of 16,255 SFX references and 2,349 of 2,484 music references across its
262 dry-route records. Before silent-aux omission, the dry-only population was
4,419 SFX references and two music references. That SFX subtotal comprised
1,050 effect-free RTPC/State
references, 976 RTPC/State references with only feedback-free Meter stages, 76
effect-free RTPC/State/ducking references, and 1,354 RTPC/State/ducking
references with only feedback-free Meter stages, plus 963 Voice Volume RTPC
references whose effects are only feedback-free Meters. The additional 3,177
SFX and 2,347 music references cross only the three proven-silent static aux
returns. The final 11 SFX references use the exact audible return through
`3235074386`; no other audible send is rendered.

Pinned wwiser proves the v150 Wwise Meter's 28-byte layout: five float32 attack,
release, minimum, maximum, and hold values; four one-byte infinite-hold, mode,
scope, and downstream-volume fields; and one uint32 Game Parameter ID. The
shared mixer accepts exact boolean and Peak/RMS plus Global/GameObject enum
values. By default it omits the telemetry stage only when downstream-volume
application and the Game Parameter ID are both zero and the effect has no other
controls or media. EVE's main feedback-free Meter `651869473` reaches 12,678 SFX dry paths,
but only the subset with fully projected Voice/Bus Volume RTPC/State controls
and no other barrier qualifies. Meter `902247780` similarly qualifies only the
subset whose RTPC/State/ducking catalogs are complete. Other reachable EVE
Meters write nonzero Game Parameters and remain barriers under the default
`wwiseMeterFeedback: "strict"` policy. All active reachable nonzero Meter
targets feed audio-observable RTPCs: 34 unique dry-route records and 1,243 SFX
references cross those feedback paths. The only globally unconsumed nonzero
target belongs to an unreachable bypassed slot and unlocks no route. Meter
telemetry itself is not implemented.

The 1,243 feedback-Meter references are an overlapping upper ceiling, not an
immediate-unlock count. All reachable EVE Meters use Global scope, but both Peak
and RMS modes occur and one active record applies downstream volume. An exact
adapter therefore needs render-thread metering, an audio-rate Meter-to-Game-
Parameter feedback path, and downstream-aware topology; main-thread
`AnalyserNode` polling cannot preserve its timing. Pinned wwiser proves the
record layout, not the detector window or envelope law, so Wwise golden vectors
remain required before these stages can leave fail-closed qualification.

`wwiseMeterFeedback: "omit-telemetry"` is the explicit audible approximation
for the signal-transparent subset: it accepts a static Meter with a nonzero
Game Parameter target only when downstream-volume application is false, passes
the audio through the slot, and does not produce the target value. It adds 858
SFX references in the audited build while preserving every other qualification
gate. The one active downstream-volume Meter remains blocked.

Pinned wwiser's v150 property table identifies decimal Audio Bus RTPC parameter
`53` (`0x35`) as `MaxNumInstances`. EVE build 3444265 contains one such curve,
on bus `3168327127`, mapping control `3108463768` from `0 -> 1` and `100 ->
280`. The bus reaches 328 SFX references and also has a supported Bus Volume
RTPC. The builder therefore emits both `"rtpc"` and `"voice-limits"` reasons.
`wwiseVoiceLimits: "ignore"` omits the dynamic voice-count/eviction policy; it
adds no routes by itself because all 328 paths also cross a feedback Meter, but
adds the full 328 when combined with Meter telemetry omission. Together the
two explicit policies add 1,186 SFX references in the audited qualification
simulation. These are route-admission gains, not newly audible media voices.

EVE's reachable ordered graph contains five active 22-byte Wwise Compressors
and one active 22-byte Wwise Peak Limiter. All are static, channel-linked, and
configured to process LFE. The root limiter is ShareSet `3134687450` on bus
`4085017428`: threshold `-1 dB`, ratio `10`, lookahead `0.01 s`, release
`0.1 s`, and `0 dB` output. Pinned wwiser proves the limiter layout, and an
internal runtime decoder validates that static 22-byte record. Pinned wwiser
has no Compressor parameter parser; the coherent
Compressor field order therefore remains an empirical v150 corpus interpretation
rather than a source-proven adapter contract. The default `wwiseDynamics:
"strict"` policy keeps all six stages outside shared routing. The affected media
still uses the legacy audible route with authored dynamics omitted.

The explicit `"approximate-web-audio"` policy admits the static, linked,
Process-LFE subset. Web Audio's `DynamicsCompressorNode` has a fixed 6 ms
lookahead, automatic makeup and different detector/envelope behavior, and a
maximum ratio of 20 while one EVE Compressor authors 20.1. The adapter uses a
hard knee, compensates the mandatory makeup before authored output gain, and
pads limiter output latency above 6 ms where possible; it cannot extend the
native detector window. This is adapted route qualification, not exact Wwise
DSP. The backend's independent safety compressor is not an authored Wwise
limiter and is never reused as one.

A fail-closed qualification simulation that treats only these dynamics stages
as supported, while leaving every other route gate intact, bounds their EVE
build 3444265 payoff. Compressor support alone adds all 135 remaining music
references and no SFX. Peak Limiter support alone adds 36 SFX references.
Supporting both adds 144 SFX and 135 music references, moving combined adapted
qualification from 9,956/18,739 (53.1%) to 10,235/18,739 (54.6%) and bringing
built-in music to 100%. Of the Compressor-reachable SFX, most still cross
independent Aux or convolution barriers, so the raw reach of 3,889 SFX is not
an attainable dynamics-only gain.
