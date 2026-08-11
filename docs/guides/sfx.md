# Authored SFX programs

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Library producers and browser application authors  
Summary: Describes optional portable SFX selection, ordered actions, layering, and RTPC gain behavior.

## Purpose

The schema-v2 library may contain an optional `sfx` program. The program
describes what an event does after it is posted; it does not describe where
bytes come from. Each resolved sound leaf refers to a media ID in the same
library, so `CjsAudioMan` can still deliver that ID as an individual file, a
slice of a complete original bank, or an exact original-bank range.

Without `sfx`, a caller may still supply `eventMedia` as a flat
event-to-media fallback. Bank construction with `includeSfx: true` instead
derives `eventMedia` from the same validated typed graph. Events that cannot
be lowered are absent from both tables; heuristic container-byte reachability
is never used as an audible fallback.

## Shape

```js
{
    schemaVersion: 2,
    events: {
        weapon_fire: [
            {
                nodeId: "1",
                delayMs: 100,
                delayRangeMs: { min: -50, max: 100 },
                probability: 75,
                fadeInMs: 250,
                fadeCurve: 4
            }
        ]
    },
    programs: {
        weapon_fire: [
            { kind: "switch", group: "ship_size", value: "large" },
            {
                kind: "play",
                child: {
                    nodeId: "1",
                    delayMs: 100,
                    delayRangeMs: { min: -50, max: 100 },
                    probability: 75,
                    fadeInMs: 250,
                    fadeCurve: 4
                }
            },
            {
                kind: "stop",
                targetId: "2",
                targetFlags: 0,
                scope: "game-object",
                mode: "element",
                delayMs: 1000,
                transitionMs: 250,
                curve: 4,
                actionFlags: 6,
                exceptions: []
            }
        ]
    },
    nodes: {
        "1": {
            type: "switch",
            scope: "switch",
            group: "ship_size",
            cases: {
                small: { nodeId: "10" },
                large: { nodeId: "2" }
            },
            default: { nodeId: "10" }
        },
        "2": {
            type: "blend",
            children: [
                { nodeId: "10", gainDb: -3 },
                {
                    nodeId: "11",
                    gainCurves: [
                        {
                            rtpc: "weapon_intensity",
                            scope: "object",
                            points: [
                                { x: 0, gain: 0, interpolation: 5 },
                                { x: 1, gain: 1, interpolation: 9 }
                            ]
                        }
                    ]
                }
            ]
        },
        "10": {
            type: "sound",
            mediaId: "777",
            matchIds: [ "10", "2" ],
            spatial: true
        },
        "11": {
            type: "sound",
            mediaId: "778",
            playbackRate: 1,
            playCount: 2,
            loop: false,
            spatial: false
        }
    }
}
```

Node IDs and media IDs are positive unsigned 32-bit identities serialized as
strings. The validator rejects missing references and cycles before audio is
enabled.

SFX schema version 2 makes `programs` the ordered authoring source. When an
event has a program, its `events` entry must be exactly the projection of that
program's `play` actions. This keeps legacy root lookup available without
allowing the static roots and the executable program to disagree. Supplied
Stop, Pause, Resume, Voice Volume, bounded Bus-target Voice Volume, Bus
Volume, Voice Pitch, Voice LPF/HPF, and Set/Reset Game Parameter actions are
also qualified at validation time.
playback controls reject unsupported action flags, nonzero All targets, and
element-target exceptions. Voice Volume and Voice Pitch accept only exact
element targets and their decoded value contracts. Voice LPF/HPF Set accepts
an exact element target; Reset additionally retains the qualified element,
All, and All-Except modes. Bus Volume retains the complete valid v150 family:
global/object Set and Reset Element plus global Reset All and All-Except, with
bus-flagged targets and exceptions. Game Parameter actions
retain their authored object/global scope, absolute/relative value mode,
delay, transition, curve, and transition-bypass flag. Every portable Game
Parameter action carries its catalog default so unset relative values and
transition start points never guess zero; the library builder also requires an
exact parameter-name catalog match.

A Voice Volume action whose target flag names an Audio Bus is not Bus Volume.
Wwise applies it to voices feeding that Bus before Bus effects, while Bus
Volume controls the Bus stage itself; `0x0A03` must not be relabeled
`0x0C03`. EVE build 3453885 contains two game-object Bus-target Voice Volume
actions on Bus `3810872320` (`Cinematic_Ship_Intro_Transition_Delay`), whose
dry route has no Aux sends and has three active Wwise Delay effects:
`cinematic_ship_intro_begin` sets `-30 dB` immediately, while
`cinematic_ship_intro_climax` schedules `0 dB` after `6000 ms` with a
`2000 ms` transition. The portable `set-bus-voice-volume` action and browser
backend preserve this cross-event sequence on the posting game object. The
begin event stores `-30 dB`; later voices whose output Bus is `3810872320`
inherit it, and the climax action schedules the return to `0 dB`. The gain is
voice-owned and precedes the target Bus stage, so it is not shared with
unrelated emitters or routes.

This is deliberately bounded support: only absolute, non-randomized Set on an
exact game-object Element target is admitted, and the target must be every
affected Sound's first/output Bus with no NodeBase or Bus Aux send. Reset,
relative/randomized values, randomized timing, global scope, exceptions,
music targets, ancestor-Bus targets, and wet routes remain fail-closed. The
cinematic route still cannot enter the strict shared mixer because a parent
Voice Volume RTPC would cross the target Bus's three Delay effects. Its media
therefore uses the audible legacy fallback: the action envelope is retained,
but the rejected shared Delay and Peak Limiter character is omitted.

## Node behavior

| Type | Behavior |
| --- | --- |
| `sound` | Produces one media voice. Optional `loop` overrides event metadata, `playCount` preserves a finite authored repeat count, `playbackRate` controls the buffer source, `spatial` selects the panner (`true`) or flat SFX route (`false`), `dryVolumeCurve` retains the leaf's Wwise distance gain, `sourceEffects` retains one complete qualified effective static effect chain, and the qualified `voiceLimit` shape reserves a cap-one per-game-object instance before media acquisition. |
| `silence` | Produces no voice. This preserves authored empty switch/state cases without falling through to the default. |
| `timed-silence` | Produces one finite silent voice with authored `durationMs`. It owns lifecycle, routing, Stop matching, Continuous completion, and qualified voice-limit admission without acquiring media. |
| `random` | Chooses one weighted child. `mode: "shuffle"` exhausts a pool before refilling it; `avoidRepeat` excludes recent choices. |
| `sequence` | Chooses the next child for each post; `loop: false` produces no further leaves after the final child. |
| `switch` | Chooses a named case from a per-object switch or global state, with an optional `default`. Matching is case-insensitive. |
| `parallel` | Resolves every child into simultaneous voices. |
| `blend` | Resolves every child into simultaneous voices, normally with child gain curves for live crossfades. |

A stripped Step Switch Container whose group and default IDs are zero and whose
Children and Switch assignment lists are both empty lowers to `silence`. Wwise
builds no playable game-sync map for that shape. EVE banks may still retain
stale per-child switch parameters, but those records cannot select audio
without either list and are therefore inert. Preserving the silent action,
rather than rejecting the whole event, retains its delay metadata and keeps
its audible sibling actions intact. A silent node does not allocate a pending
browser selection, so its delay alone does not extend the playing ID lifetime
and cannot be paused or stopped while pending. This bounded graph rule restores
five jump-drive and cynosural events in EVE build 3453885 across empty nodes
`980357672`, `140917810`, `455538153`, and `394178349`. Other empty forms
remain fail-closed.

An event may have several roots; roots are parallel.

Play-action edges may carry `delayMs`, an optional randomized offset in
`delayRangeMs`, a percentage `probability`, and `fadeInMs` with an optional
`fadeInRangeMs` and Wwise `fadeCurve` from 0 through 8. Randomizer ranges are
offsets from the base value. One set of values is sampled for the Play action
and inherited by every sound leaf it selects. Delay is measured from the
event post, and the fade begins when the delayed source starts.

`programs` preserves the authored order of Play, Stop, Pause, Resume,
SetSwitch, SetState, Set/Reset Voice Volume, bounded Set Bus-target Voice
Volume, Set/Reset Bus Volume, Set/Reset Voice Pitch, Set/Reset Voice LPF/HPF,
and Set/Reset Game Parameter actions.
Switches update the posting game object; states update the global state table.
A switch or state setter therefore affects only later Play actions in the same
post when it is immediate. A fixed-delay setter instead enters the same
AudioContext-clock action queue as delayed Stop and Game Parameter actions. It
does not alter later Play selection early; when due, it updates the posting
game object's Switch or the global State and therefore also wakes any live
Continuous Switch/State session. An action-only program remains alive until
its last delayed setter executes and completes without creating a media voice.
Stop of that playing ID cancels its pending setters. Randomized delay,
probability, transition-bearing setters, and extra setter properties remain
fail-closed.

A Stop action has `scope: "game-object"` or `"global"`. `mode: "element"`
matches the target HIRC identity, while `"all"` and `"all-except"` apply to
all eligible SFX voices; Stop-All uses target ID `"0"`. Exceptions protect
any voice whose selected hierarchy path contains their target identity.
Builder-produced sound nodes retain omitted raw hierarchy parents in
`matchIds`, beginning with the sound node's own identity, so an element Stop
can still match a Sound through an Actor-Mixer that is not itself a playable
runtime node.

Stop delay is measured from the event post. `transitionMs`, its optional
randomizer, and `curve` control the authored fade before the voice halts.
Timing ranges are sampled once per post. Pending Play slots can be cancelled
before their media resolves, and delayed Stop-only events remain alive until
their action has executed. At equal scheduled times, authored action order is
preserved: Play then Stop is stoppable, while Stop then Play leaves the later
Play intact. Event metadata still carries conservative `eventsStoppedBy`
relationships for culling and static inspection, but an installed authored
program owns the actual Stop timing and avoids a duplicate fallback fade.

Pause and Resume use the same scope, target hierarchy, mode, action ordering,
and exception contract as Stop. Pause retains the target playing ID and media
position instead of reporting completion. Pauses stack, so a voice resumes
only after receiving the matching number of Resume actions. A matching Play
selection that is still acquiring media remains silent until resumed. Web
Audio buffer sources cannot restart, so the backend stops the disposable
source on Pause and creates a replacement at the preserved position on
Resume. Infinite loops retain their wrapped offset, while finite repeat counts
retain their aggregate remaining duration rather than restarting the authored
count. Delay and transition values use the same audio-clock scheduling path as
other program actions.

Set Voice Volume stores one dB contribution for the target HIRC element on
the affected game object. `valueMode: "absolute"` replaces that contribution;
`"relative"` adds to its interpolated current value. Reset Voice Volume
returns the contribution to `0 dB`. Contributions from distinct matching
Sound, container, and Actor-Mixer identities add through `matchIds` before
the final Wwise gain clamp, alongside authored hierarchy, State, and RTPC
volume. They never replace Play fades, Continuous crossfades, Stop fades,
emitter gain, or spatial attenuation.

Set Bus Volume stores a dB property state for the target Wwise bus on the
affected emitter generation. Absolute mode replaces the current value;
relative mode adds to its interpolated value; Reset returns it to `0 dB`.
Builder-produced sounds retain their inherited NodeBase `overrideBusId`, its
ordered dry Audio/Auxiliary Bus ancestry, and the summed authored base Bus
Volume. The route also retains summed bus Make-Up Gain when it occurs in that
dry ancestry, plus the Output Bus Volume on the NodeBase that supplies the
effective output-bus override. A descendant value without its own override is
not active. These contributions are applied after voice volume evaluation. A
dedicated bus gain stage applies the authored gains plus live state only to
voices whose route contains the target, without changing voice gain or the
application master, SFX, or music controls. Reset
All and All-Except use qualified exact stored bus identities; EVE currently
exercises Element.

A portable `sound` node may also carry `sourceEffects`, an ordered list of
static Parametric EQ, Wwise Delay, and qualified Wwise Compressor, Peak
Limiter, Flanger, Tremolo, Guitar Distortion, or Matrix Reverb records. The
builder walks the Sound's NodeBase
ancestry to the first effect
override, treating a root list as effective and an explicit empty override as
a replacement that clears the parent list. It emits the chain only when every
active slot is a control-free supported effect with an admitted static shape;
dynamics additionally require linked channels and timing within the Web Audio
adapter's bounds. Playback creates one Web Audio chain per physical voice
before the authored Voice LPF/HPF, gain, spatial/auxiliary split, and Audio Bus
effects.

Parametric EQ and Delay are browser DSP adaptations, not native Wwise filter
or Delay claims. Source Compressor and Peak Limiter are retained as authored
base records but realized only under the opt-in
`wwiseDynamics: "approximate-web-audio"` policy; strict mode or missing browser
dynamics/lookahead primitives omits the complete source chain and keeps the
voice audible and dry. Pinned wwiser proves the Peak Limiter layout.
Compressor's v150 field order remains the same explicitly empirical
interpretation used by the shared-bus adapter because pinned wwiser does not
decode Compressor parameters. Web Audio's fixed lookahead, automatic makeup,
detector/envelope law, ratio ceiling, and channel behavior therefore remain
non-equivalent to Wwise.

Qualified Flanger records are also retained as authored base records. They use
the independent `wwiseModulation: "approximate-web-audio"` opt-in; strict mode
or missing Gain, Delay, or required Oscillator support omits the complete
source chain and plays dry. Pinned wwiser proves the exact 59-byte v150 field
order. The browser stage implements a sine-driven unified comb approximation:
base delay plus `delay * depth` modulation, Blend/feedforward/feedback gains,
Wet/Dry mix, and output gain. It starts one voice-owned oscillator at the
first scheduled physical source start and stops it at final voice disposal.
This is not Wwise-equivalent DSP: the browser stage processes every decoded
channel even when Wwise authors Center/LFE bypass, clamps feedback to just
below unity, retains LFO phase while paused, and cuts delay/feedback state at
the decoded dry-source boundary. Shared-Bus Flanger remains unsupported.

Qualified Tremolo records reuse the same `wwiseModulation` policy. Pinned
wwiser identifies plug-in `0x00830003` and shows the corresponding modulation
and phase sequence inside Flanger, but does not decode Tremolo's own
parameters. The EVE corpus informs the 38-byte interpretation; it remains
empirical. Admission is explicitly limited to bank version 150, a control-free
sine waveform, bounded phase offset/mode/spread fields, and Center/LFE
processing.
Audiokinetic's
[Wwise Tremolo reference](https://www.audiokinetic.com/en/library/2024.1.1_8691/?id=wwise_tremolo_plug_in_effect&source=Help)
describes a unipolar carrier; the browser maps it to
`gain(t) = 1 - depth/2 + (depth/2) * sin(2*pi*f*t + phase)`, then
applies authored output gain. A nonzero global phase uses a custom
`PeriodicWave`; missing that primitive keeps the complete chain dry. The
portable record also retains Wwise's phase mode and spread, but the browser
uses one all-channel carrier and does not reproduce the authored per-channel
Left-Right, Front-Rear, Circular, or Random distribution. Its voice-owned
oscillator has the same start, pause, and disposal lifecycle as Flanger.
Native oscillator/channel law is not claimed. Smoothing and PWM remain
shape-validated but are neither stored nor applied because this adapter admits
only the sine carrier. Shared-Bus Tremolo remains unsupported.

Qualified static Guitar Distortion records use the independent
`wwiseDistortion: "approximate-web-audio"` opt-in. Pinned wwiser proves the
v150 126-byte layout: three pre-EQ bands, three post-EQ bands, distortion
type, Drive, Tone, Rectification, output gain, and Wet/Dry mix. The EVE subset
is control-free, uses Overdrive or Heavy, and is fully wet. Web Audio realizes
enabled EQ bands in authored order around a 4x-oversampled `WaveShaperNode`,
then applies output gain. The transfer curve is a deterministic normalized
`tanh` approximation whose drive scale differs for Overdrive and Heavy;
Rectification blends toward a full-wave curve. Authored Tone is retained but
not applied because neither wwiser nor the browser API supplies Wwise's tone
law. Strict mode, missing WaveShaper/biquad/gain primitives, dynamic controls,
other distortion types, other bank versions, non-fully-wet records, and
shared-Bus Guitar Distortion keep the complete source chain audible and dry.
This preserves topology and audible coloration, not Audiokinetic DSP parity.
The [Wwise effects reference](https://www.audiokinetic.com/library/edge/?id=effects&source=Help)
and [Web Audio WaveShaperNode](https://webaudio.github.io/web-audio-api/#waveshapernode)
describe the separate authored and browser surfaces.

Qualified static Matrix Reverb records use the independent
`wwiseReverb: "approximate-web-audio"` opt-in. Pinned wwiser proves plug-in
`0x00730003` and the exact 29-byte v150 default-delay layout: Reverb Time, HF
Ratio, delay count, Dry and Wet levels, Pre-Delay, Process LFE, and delay mode.
The builder admits only control-free, media-free records with a standard
4/8/12/16 delay count, Process LFE enabled, and the default-delay mode. Strict
mode or missing Gain, Delay, or Biquad primitives omits the complete chain and
keeps the voice audible and dry.

The browser stage preserves authored dry/wet decibel levels and Pre-Delay,
then uses a bounded four-line cyclic feedback-delay network. Its four spaced
delays come from Wwise's default table, feedback approximates the authored
Reverb Time as a nominal T60, and a fixed logarithmic low-pass mapping adapts
HF Ratio. The authored delay count remains in portable metadata but does not
allocate that many browser lines. Wwise's proprietary matrix, mixing,
damping, channel, and LFE laws are not reproduced. Pause/seek reuse browser
state, and natural completion disposes the stage at the decoded dry-source
boundary, cutting the reverb tail. Shared-Bus Matrix Reverb remains
unsupported.

Bypassed or rendered slots need no live stage. Pause and seek reuse the
voice-owned browser nodes instead of freezing or reconstructing native Wwise
plug-in state. Natural completion still follows the decoded dry source;
`DelayNode` has no Wwise tail-completion callback, so residual feedback is cut
when the voice is disposed. Mixed unsupported plug-in sequences, supported
effects with RTPC, State, property-value, or media controls, unsupported
independent channel routing outside the documented modulation approximations, and
unsupported plug-ins retain the previous dry-playback approximation rather
than applying part of an authored chain. EVE build 3453885 installs 2,740
qualified Sound leaves carrying 2,781 effect records: 262 use Parametric EQ,
87 use Wwise Delay, 2,033 use
Compressor, 73 use Peak Limiter, nine use Flanger across five retained events,
149 Tremolo stages occur on 148 Sounds across 80 retained events, 69 use
static Guitar Distortion across 23 retained events, 50 use static Matrix
Reverb across 22 retained
events, and 49 retain telemetry-only Meter records across 39 retained events.
The formerly dry eight Matrix leaves are now complete because their preceding
Tremolo ShareSet's 108-degree global phase is retained; its Random 66-degree
per-channel spread remains an explicit browser omission. Projected Matrix
Reverb now covers all five effect identities. Guitar Distortion covers 18
effect identities and
12 raw presets (11 audible decoded parameter sets); dynamic Guitar controls
remain dry. The Tremolo population contains 115 isolated chains, 14
Tremolo-to-EQ, two EQ-to-Tremolo, eight Tremolo-to-Matrix, six
Delay-to-Tremolo, two Tremolo-to-Delay, and one double-Tremolo chain over 64
effect identities and 18 distinct 38-byte parameter records. Those Peak
Limiter leaves all inherit Custom effect
`754157063` under `refinery_l_play`. A total of 486 retained events can reach
at least one Compressor leaf. The
Compressor population contains nine complete chain signatures, including
eight leaves where it precedes one qualified EQ. There are now 166 non-neutral
EQ chains. Sound `350811697` remains atomically dry because its preceding EQ
requires unsupported independent LFE routing. Twelve additional
static-Flanger leaves stay dry because their second slot is a dynamic
Parametric EQ; dynamic or unsupported mixed Tremolo chains remain dry too.

Set Voice Pitch stores one cents contribution for the target HIRC element.
`valueMode: "absolute"` replaces that contribution; `"relative"` adds to its
interpolated current value. Reset Voice Pitch returns the contribution to
zero cents. Contributions from distinct identities in the selected hierarchy
add to NodeBase, State, and RTPC pitch before conversion to a Web Audio
playback-rate ratio. A transition changes already-playing voices continuously
without restarting their buffers, and finite authored repeat timing follows
the changing playback rate.

Set Voice LPF and HPF store independent signed percentage contributions for
the target HIRC element. Absolute mode replaces the selected property's
contribution, while relative mode adds to its interpolated current value.
Reset Element returns one stored target contribution to zero. Reset All visits
every stored target contribution for that property, and All-Except retains
the exact stored target IDs listed by the action. Contributions from matching
Sound, container, and Actor-Mixer identities add to authored, State, and RTPC
filter values before the final `0..100` clamp. A Set action also provisions a
neutral Web Audio filter for matching leaves that have no authored filter, so
Set-before-Play and later action-only posts remain audible.

The exact-target interpretation of Voice Filter All-Except is the strongest
structural reading of the v150 action record and its object-owned property
state, but public Wwise documentation does not specify descendant behavior.
The inspected EVE actions are all element mode and carry no exceptions, so
All/All-Except behavior is broader qualified coverage pending an Authoring
Profiler experiment rather than an EVE parity claim.

Game-object scope changes only the posting emitter. Global scope changes all
currently registered emitters. The stored contribution affects voices that
are already playing and voices created by later posts, and survives after the
action-only posting ID completes. Unregistering an emitter ends that stored
generation; already-playing voices retain the retired generation's stored
contribution and finish any scheduled transition, while a newly registered
generation starts with neutral Voice Volume and Voice Pitch contributions.
Global Voice LPF/HPF actions additionally update a persistent global template:
an emitter registered later inherits the template's original transition
timeline and therefore joins its remaining fade or final value. A retired
generation keeps its independent filter map and is not changed by later
global filter actions.
Bus Volume uses the same per-generation isolation, while global actions also
update a persistent template for emitters registered later and continue to
affect live voices on retired generations. SFX and music routes include full
dry-output bus ancestry, authored base Bus Volume, and any bus Make-Up Gain on
that ancestry. The effective NodeBase Output Bus Volume remains a separate
authored contribution on the same collapsed route. Typed version-2 Bus RTPCs
are stored once per bus and distinguish `voice-volume` from `bus-volume`.
SFX adds Voice Volume on its own gain before the Bus Volume/effect stages;
both properties follow the complete dry ancestry. Built-in music evaluates
only Bus Volume and shared-mixer qualification rejects a music route that
would require the unimplemented music Voice Volume stage. Scaling-2 curve
outputs remain raw: runtime-audio interpolates first, then applies Wwise's
nonlinear dB conversion. Version-1 catalogs remain implicit Bus Volume.
Typed Audio Bus State tables use the same route ancestry. Their
matching global State values atomically add Bus Volume in decibels, Pitch in
cents, and signed LPF/HPF offsets across subscribed groups and buses, using the
catalog's STMG default or directed transition duration. Filters sum before one
final 0-100 clamp, so authored negative offsets remain meaningful. Pitch joins
the transport-aware playback-rate path and final +/-2400-cent clamp. State
transitions remain interruptible and new voices join the current blend.

The catalog keeps both the authored bus synchronization type and the
route-qualified effective type. Wwise applies a bus State immediately when
only Actor-Mixer Hierarchy sounds use that bus, even if authoring selected a
music synchronization point. The builder records that qualification as
`effectiveSyncType: 0` and rejects a non-immediate subscription on a route used
by music when the State changes a music-relevant property, because
runtime-audio does not yet own a music-grid scheduler for bus States. Wwise Bus
Pitch is excluded from music by definition. Typed Audio Bus auto-ducking uses
the same ancestry and one shared SFX
and music activity clock. A physical source activates every authored source
bus in its route at its scheduled Web Audio start, including silent samples;
pending media and authored graph silence do not activate it. The first active
source begins each target's Fade Out, overlapping sources on the same bus hold
one duck, and the last end starts Recovery followed by Fade In. Different
source buses add in decibels, and nonlinear fades interpolate in linear gain
with the authored Wwise curve. Voice Volume and Bus Volume targets remain
distinct in the portable catalog. Collapsed dry routes may schedule both on
their route gain; the qualified audible SFX Aux shape keeps Voice targets
before fan-out and schedules Bus targets independently on the complete dry and
wet legs.

This remains a focused audible adaptation rather than full Wwise bus
processing. Voice Volume is before the qualified dry/wet send split, while Bus
Volume ducking is after each leg's additive State filters. Static Parametric EQ
and static Wwise Delay have qualified shared-Bus adapters; general auxiliary
sends, nonlinear effects, meters, and effect-tail-driven bus activity remain deferred as
described in the
[routing reference](../reference/wwise-resource-routing.md).
Delay is measured from the action post. Value randomizers are signed offsets
sampled once, and transitions use the decoded Wwise curve from the authored
action time. Web Audio automation keeps those transitions continuous between
`RenderAudio()` calls. The builder fails closed for otherwise untyped object
targets. Bus actions remain portable even when the current asset set has no
matching route, so future banks can use the same valid action without
rebuilding policy. A Voice property element target absent from every loaded
SFX NodeBase cannot match a projected voice, so that action is omitted as a
no-op while the event's other authored actions remain usable.

Set Game Parameter writes a named object or global RTPC. Absolute mode replaces
the scope's current value; relative mode adds to its interpolated value at the
authored action time. Reset writes the catalog's authored default instead of
deleting the scope and falling through to another value. Delay and value
randomizers are sampled once per post, while a nonzero transition persists
after the posting ID completes. A later action rebases from the interpolated
value, and an external `SetRTPCValue()` or `SetGlobalRTPCValue()` first applies
overdue authored actions and then cancels the active transition for that same
scope and parameter.

Ordered capture uses an in-memory RTPC overlay, so an immediate parameter
action affects only later Play actions in that program without exposing a
partial update if program resolution fails. Already-playing voices receive
Web Audio automation for gain, pitch, low-pass, and high-pass RTPC properties;
pitch automation also participates in transport and finite-repeat timing.
Object-scoped values and transitions remain attached to a retired emitter
generation until its voices finish, while a replacement generation starts
clean.

The portable action model deliberately retains `bypassTransition` even though
the currently qualified EVE parameter targets use no internal STMG ramping.
Exact STMG inspection now supplies the builder's authoritative parameter
defaults, including Reset values and unset RTPC-curve fallbacks. The reader
also preserves all ramp policies and built-in bindings. Realizing those
manager-level policies is separate runtime work, not a reason to discard the
serialized flag or reject otherwise valid future banks.

Random and sequence state is kept independently per game object by default.
Set `scope: "global"` on either container to share its history or position
across all game objects.

`sequence` currently means Wwise-style step sequencing between posts. A
continuous container that schedules several children during one post requires
explicit timing data and is not inferred from a flat media table.

## Gain and RTPC curves

Nodes and child edges may carry `gainDb` and `gainCurves`. Gains on every edge
of the selected path add in decibels. A curve has:

- `rtpc`: the authored parameter name;
- `scope: "object"` or `"global"`; object scope falls back to the global value
  when no per-emitter value exists; and
- optional `defaultValue`, used when neither the requested object nor global
  RTPC has a value; and
- non-decreasing points using either decibel `{ x, gainDb }` values or
  normalized linear `{ x, gain }` values; and
- optional Wwise `interpolation` values from 0 through 9 on the point that
  begins each segment. Duplicate X values preserve authored discontinuities.

Values between points interpolate linearly and values outside the point range
clamp to the nearest endpoint. Authored interpolation shapes are applied when
present. Decibel values at or below -96 dB and linear gain zero become silence.
Changing an RTPC updates gain on already playing SFX voices without restarting
their buffers.

## State properties and transition timing

Nodes may carry additive Wwise State deltas in `stateProperties`. Each entry
names a global State Group and maps authored State names to relative volume,
pitch, low-pass, or high-pass changes:

```js
stateProperties: [
    {
        group: "combat",
        cases: {
            danger: {
                gainDb: -6,
                pitchCents: 1200
            }
        }
    }
]
```

Matching entries on every selected hierarchy level add to the static
`gainDb` and `pitchCents` values. An unset group or a current state with no
authored case contributes zero; the projected EVE tables therefore preserve
Wwise's initial `None` behavior. State-name matching is case-insensitive.
`SetState()` changes the logical State immediately, so later Play actions,
Switch/State routing, Continuous sessions, and music reevaluation see the new
value in authored order. The affected NodeBase property offsets follow the
STMG State Group's default transition time or an exact directed custom
override. Gain, playback rate, low-pass, and high-pass update on already
playing voices without restarting their buffers. New voices join the current
blend, and a second State change rebases from the in-progress property values.
Live State gain remains independent of an authored Stop envelope, so changes
continue to apply during an audible fade.

The optional graph-level `stateTransitions` array retains each numeric State
Group identity, its optional name, the complete known State ID/name catalog,
default duration, and every directed custom route. From/to numeric IDs remain
present when SoundBanksInfo cannot name an endpoint, so future tooling does not
lose the authored rule. Named and numeric group/State setters share one
canonical runtime value whenever the catalog supplies that alias.

The optional library-level `busStates` catalog carries its own normalized
`stateTransitions` subset. Installing a library merges that subset with the
SFX graph transition table by canonical State Group identity and rejects
conflicting definitions. This lets a library with music or bus data but no SFX
graph still realize the authored transition timeline.

Builder-produced version-2 cases unify Bus Volume, Pitch, LPF, and HPF values
under one State weight. Definitions must match wwiser's v150 accumulation and
dB flags, and filter-bearing builds must declare STMG additive behavior. An
active unsupported Bus State property fails the bus catalog closed instead of
silently projecting only part of an atomic State selection. Strict version-1
Bus Volume-only catalogs remain accepted when supplied by a caller.

The optional library-level `busDucking` catalog stores each source Audio Bus
once with its Recovery Time, Maximum Ducking Volume, and ordered target rules:

```js
busDucking: {
    schemaVersion: 1,
    sources: {
        "100": {
            recoveryMs: 1000,
            maxDuckVolumeDb: -96,
            targets: [{
                targetBusId: "200",
                volumeDb: -6,
                fadeOutMs: 250,
                fadeInMs: 500,
                curve: 4,
                targetProperty: "voice-volume"
            }]
        }
    }
}
```

The builder accepts only v150 Audio Bus sources and Audio Bus targets, exact
target properties 0 (Voice Volume) and 4 (Bus Volume), supported curves 0-9,
finite nonpositive dB values, nonnegative integer timings, and cycle-safe
non-parent targets. Auxiliary Bus sources and malformed or ambiguous rules
fail closed.

The optional library-level `busEffects` catalog stores routed static Wwise
Parametric EQ slots once per bus:

```js
busEffects: {
    schemaVersion: 1,
    buses: {
        "500": [ {
            effectId: "900",
            slotIndex: 1,
            type: "parametric-eq",
            bands: [ {
                index: 1,
                filterType: "peaking",
                gainDb: -13,
                frequencyHz: 120,
                q: 5,
            } ],
            outputGainDb: 0,
            processLfe: true,
        } ],
    },
}
```

The v150 adapter follows wwiser's 56-byte Parametric EQ layout, retains slot
and band order, and realizes enabled bands with Web Audio biquads. Routed EQs
with RTPC, State, property, or media
controls fail closed. `processLfe` must be true until the browser runtime owns
an independent LFE branch. Authored-neutral EQs remain in the catalog but do
not allocate browser nodes. A distributed EQ is emitted only when the complete
routed ancestry contains no active unsupported effect slot. Bypassed slots do
not block it; an active Compressor, Peak Limiter, reverb, Meter, or unknown
plug-in suppresses every distributed effect on that route so authored ordering
cannot be partially realized.

When the strict `busGraph` mixer qualifies the complete route, it decodes the
authoritative graph effect records and creates one ordered effect chain per
physical Bus, after SFX spatialization and music route envelopes. Common
ancestors and their effect nodes are shared across SFX/music category entries
and voices. Parametric EQ uses the source-proven 56-byte layout above. Static
Wwise Delay uses wwiser's 18-byte v150 layout: seconds, Feedback percent,
Wet/Dry percent, Output Level dB, Enable Feedback, and Process LFE. Its Web
Audio adapter owns one parallel dry/delayed split, an optional feedback loop,
and one output gain; `processLfe:false` remains blocked. The exact fields,
ordering, and shared lifetime are preserved, but neither `BiquadFilterNode`
nor `DelayNode` is claimed to be bit-equivalent to Wwise DSP. A blocked or
missing graph retains the distributed per-source Parametric EQ fallback.
Dynamic, mixed, media-backed, or otherwise unsupported effect sequences remain
barriers rather than being partially realized.

One bounded ordering proof admits an opted-in Peak-Limiter route when every
source-/route-local control belongs to a strict descendant of the first
audible effect Bus. Those controls already run before the shared topology, so
an ancestor limiter retains its authored order. A control on the same Bus or
an ancestor, an incoming duck target, or any other audible effect kind keeps
the whole route on fallback. EVE build 3453885 has four such routes: 36 SFX
leaves and 24 media across six event graphs. Only
`OSSE_Gallente_steamalter_play` becomes fully shared-routed; the other five
gain qualified branches while retaining separate blocked branches.

The default `wwiseDynamics: "strict"` policy keeps Wwise Compressor and Peak
Limiter out of shared routing. The source still plays through the existing SFX
destination, but the complete authored shared-bus path is omitted; qualified
coverage measures faithful bus admission rather than basic media audibility.

`wwiseDynamics: "approximate-web-audio"` admits only static, control-free,
channel-linked, Process-LFE records. It realizes each authored slot with a hard-
knee `DynamicsCompressorNode`, caps ratio at `20:1`, cancels Web Audio's
mandatory automatic makeup with a post gain, then applies authored output gain.
Dynamics attack/release must be within the browser's one-second limit and
Compressor attack zero remains a barrier. Peak Limiter uses zero attack and may add output
delay above Web Audio's fixed 6 ms latency. That delay does not extend the
detector lookahead. Detector, envelope, peak limiting, channel/LFE behavior,
ratio, and timing remain approximations; the independent master safety
compressor still follows the whole mix. The Peak Limiter layout is
source-proven, while the v150 Compressor field order is empirically
corroborated for the audited corpus rather than proven by the pinned wwiser
parser.

The builder and shared mixer also decode wwiser's exact 28-byte v150 Wwise
Meter layout. They omit a static, media-free, control-free Meter on a shared
Bus or in a complete source-local effect chain when downstream-volume
application is disabled and no Game Parameter is written. Such a Meter is
audio-transparent, though its monitoring behavior remains unsupported. The
default `wwiseMeterFeedback: "strict"` keeps a Meter with a Game Parameter
target as a shared-route barrier or leaves its complete source chain audible
and dry. Explicit `"omit-telemetry"` admits that Meter only when
downstream-volume application is disabled: audio crosses the slot, audible
source siblings retain authored order, but no Meter value is produced and any
authored feedback through the target Game Parameter is absent.
Downstream-volume Meter records remain barriers.

The builder separately identifies the v150 Audio Bus `MaxNumInstances` RTPC as
the `"voice-limits"` processing reason. `wwiseVoiceLimits: "strict"` keeps that
route blocked. Explicit `"ignore"` admits it when every other reason qualifies,
without applying the dynamic voice count or Wwise eviction policy. Libraries
built before this reason was introduced retain their generic
`"unsupported-rtpc"` barrier and must be rebuilt to use the opt-in.
Static Audio Bus maximum-instance, stealing, and virtual-voice policy is also
not enforced; this option changes only shared-route admission for the
separately classified dynamic RTPC barrier.

One independent v150 Sound policy is enforced before media acquisition:

```js
voiceLimit: {
    counterId: "602217068",
    scope: "game-object",
    maxInstances: 1,
    behavior: "reject-newest"
}
```

The builder emits this only for a Sound whose packed Advanced Settings are the
EVE `0x09` form (cap one, kill-newest tie break, local scope, ignore parent
limit, and no over-limit virtualization), whose effective inherited
below-threshold behavior is Continue, and whose effective priority path has no
randomizer, RTPC, or State mutation. The complete output-bus ancestry must
also have no static cap or `MaxNumInstances` RTPC. The per-object scope bit is
corroborated by wwiser's older explicit `bIsGlobalLimit` field and the paired
v150 `0x09`/`0x0d` corpus forms; a controlled Wwise golden pair is still the
remaining format-level proof.

Reservations count still-loading selections after their Play boundary. A
duplicate Sound on the same game object is rejected in deterministic selection
order without loading its media; another game object remains independent.
Cancellation, failed acquisition, Stop, and physical completion release the
reservation.
Continuous completion releases before selecting its successor; Trigger Rate
keeps its authored cadence while a duplicate choice is rejected, Continuous
Switch replaces an obsolete pending reservation before rerouting the same
Sound and stays dormant until its next control change.

Future admission is deliberately excluded: the builder omits `voiceLimit` from
Sounds reachable through a positive Play/Initial Delay, a positive Continuous
Delay, or Continuous Crossfade prefetch. The backend also rejects a custom
delayed limit, and fails a custom capped Crossfade traversal closed, instead of
reserving either too early. Wwise evaluates the
limit at the future playback boundary; prefetching media is not itself an
instance. Exact authored-time admission for those shapes remains unsupported.

This is not a general Wwise voice arbiter. Global Sound limits, caps above one,
priority-based stealing, project-wide maximum voices and volume threshold,
parent/container and Audio Bus limits, dynamic limit RTPCs, virtual queues,
below-threshold Kill/Virtual behavior, and virtual re-entry remain unsupported.

`buildFromBanks()` also emits a version-1 `busGraph` topology for every routed
SFX Sound and music track. Route records deduplicate dry ancestry plus effective
NodeBase user/reflections sends. Bus records retain their parent, exact v150
channel configuration and properties, authored auxiliary edges, processing
reasons, and every ordered effect slot including bypassed and unsupported
plug-ins. Effect records retain plug-in identity, parameter bytes as canonical
base64, control counts, and embedded plug-in media source IDs. The validator
rejects missing targets/effects/media, malformed ancestry, dry-parent cycles,
unreachable records, and out-of-range route references.

Each user/reflections send also carries a `dynamic` barrier flag when its
active slot has an authored randomizer, RTPC, or State property. The topology
keeps the static base value and refuses to imply that the dynamic contribution
is already realizable. A static user send may be omitted only when the complete
Auxiliary Bus return is proven to stay at or below Wwise's `-96 dB` silence
threshold. The proof includes authored gains, maximum installed RTPC and State
contributions, absolute or positive-relative Bus Volume action risk, inactive
effects, and the absence of another wet-path escape. This admits an inaudible route without
claiming that its auxiliary signal was rendered.

Aux inheritance follows wwiser's root rule: a root NodeBase's authored list is
effective even when its override bit is clear, because it has no parent. A
non-root node with a clear override bit inherits, while the first overriding
descendant replaces the inherited list. The catalog is the shared-runtime
foundation, not an audible approximation. Current playback can share a
complete static Parametric EQ/Delay sequence with Bus Volume RTPC and Immediate
State gain. Each physical Bus owns one post-effect fader that combines its
static Bus Volume with only that Bus's matching global RTPC and State gain;
the route aggregate is admitted only when it exactly equals the sum of those
physical Bus values. Voice Volume remains before the Bus, while Make-Up Gain,
effective NodeBase Output Bus Volume, and live Set/Reset Bus Volume actions
remain on the route-local stage. State Pitch remains source-local. State
LPF/HPF retain the additive whole-ancestry contract: ordinary and blocked
routes use their source-/track-local filter pair, while the exact audible SFX
Aux shape uses one independently evaluated filter pair for each complete dry
and wet path before the corresponding Bus-target duck gain.
`busVolumeActionControlled` likewise marks every Bus targeted by a retained Set
or Reset Bus Volume action. An audible effect combined with Voice Volume,
filtering or pitch, ducking, or action control remains blocked so per-voice
state and an effect tail cannot silently cross the shared Bus fader. The
auxiliary exceptions are the proven static-silence omission above and one exact
SFX-only user-send shape. The audible shape is one static finite send with
neutral send filters whose Auxiliary Bus return rejoins the dry ancestry. Its
route entry fans out after spatialization into the dry Bus and a dB-scaled wet
gain, then both branches reuse the same physical common ancestors. Bus-target
ducking is evaluated after the filters over each whole route leg, preserving a
source's collective maximum-duck floor. A source whose rules span Voice and
Bus targets on the split path, a wet-only duck source or Voice target,
branch-only Pitch, Bus Volume action targets, Make-Up/Output Bus Volume, effects other than the
feedback-free Meter omission, dynamic or multiple sends, Bus cascades, and
reflections fail closed before allocating nodes. Music and every other
incomplete auxiliary/effect path remain blocked.

Installation cross-checks every playable routed SFX Sound and music track
against its `busGraph` route, including dry ancestry and all three authored
gain fields. At browser-gesture enable time the audio system creates one
generation-scoped route controller and shares its stable route handles between
the SFX backend and built-in music engine. Sound selections retain their exact
leaf ID and music scheduling retains its exact track ID, so later realization
does not have to infer topology from a coincidentally equal dry path. The SFX
backend uses those handles to allocate one lazy branch per exact route and
spatial mode within an emitter generation. Voices on the same route and mode
share that branch; different routes never merge before it, and a 2D voice never
enters a 3D route panner. Placement, scaling, RTPC replay, retirement, and
disposal remain generation-scoped. Branch outputs still feed the existing SFX
destination unless the selected shared-mixer policy qualifies their complete
dry path.
Qualified branches feed the stable SFX category input after spatialization;
blocked branches retain the existing destination. The qualified static SFX Aux
shape is the only audible wet-path exception; it does not imply shared nonlinear
effects or general auxiliary routing.

A custom `applyRTPC` adapter continues to receive the legacy emitter target and
also receives one update per graph-backed route branch. Branch updates include
`busGraphRoute`; exactly one of `gain` or `flatGain` is populated according to
the route's spatial mode, and spatial branches include their exact `panner`.

The audio-system generation also owns a strict shared-Bus mixer. Its
qualification accepts only default-channel ancestry with no active Bus
positioning or HDR. Authored positioning/HDR
override flags are allowed only when their decoded values prove both features
inactive. Processing may include a complete source-proven static Parametric
EQ/Delay/Meter sequence with static Bus Volume, Bus Volume RTPC, and Immediate
State gain at exact per-Bus post-effect faders. The
matching RTPC/State catalog entry and live ducking source must be installed for
each declared control. An incoming duck target also counts as a route control,
even though Wwise declares that rule on its separate source Bus. Qualified
routes receive stable SFX and music category entries and share one node per
common Bus ancestor. Provably silenced static user sends allocate no wet nodes.
The exact audible SFX shape above allocates one send gain and one shared
Auxiliary return; all other auxiliary routes remain blocked. SFX and music category entries
remain separate so application volume controls cannot merge unrelated routes
prematurely. State LPF/HPF add across the complete ancestry before one final
clamp; the exact Aux shape preserves that rule separately on its dry and wet
legs. Audible effects still reject Voice Volume RTPCs, State pitch, ducking,
and Bus Volume action targets because those controls remain route- or
voice-local.
A blocked route returns no mixer input and
allocates no partial graph. Qualified SFX route branches now consume these
entries, including per-branch analyser stages that preserve aggregate emitter
metering without merging route identity. Qualified music tracks use one
transition lane per scheduled route and one Play-instance lane per exact route
before the stable music category input. Segment crossfades and instance stop
fades therefore remain route-local. Blocked music routes retain the legacy
segment, instance, and music-output path.

The bank builder projects only named, Immediate Volume, Pitch, and filter
state tables with their exact supported accumulation modes. A group containing
another property or accumulation mode is omitted whole, rather than partially
emulated, while the event and its other supported groups remain playable.
Active non-Immediate or unnamed groups still fail closed because their authored
selection behavior cannot be represented safely.

## Builder input

The optional builder accepts the graph directly as `sfx`, or as
`enrichment.sfx` alongside neutral event/culling metadata:

```js
const library = CjsAudioLibraryBuilder.build({
    indexEntries,
    soundbanksInfo,
    enrichment: {
        Events: eventMetadata,
        sfx: authoredSfxProgram
    }
});
```

When caller-provided bank access is available, `buildFromBanks()` can ask the
builder to project the conservative typed HIRC subset owned by
`runtime-resource`:

```js
const library = await CjsAudioLibraryBuilder.buildFromBanks({
    indexEntries,
    soundbanksInfo,
    includeSfx: true,
    language: "en-us",
    loadBank,
    onSfxDiagnostics(diagnostics)
    {
        console.info(diagnostics);
    }
});
```

`language` selects one localized bank variant before event-media and SFX HIRC
objects are merged. This is required because localized banks reuse object IDs
while pointing at different media.

For each completely lowered event, the builder also resolves version-150
NodeBase positioning through Sound and Actor-Mixer parents. It produces a
sparse `is2D` metadata patch: a resolved positioning owner without an authored
attenuation assignment is 2D; an event is 3D when any selected playable leaf
resolves an attenuation assignment. Actor-Mixers remain inheritance-only and
are never emitted as playable parallel nodes.

The same ancestry walk projects authored Stop actions into each playable
event's `eventsStoppedBy` metadata. A Stop action may target a Sound or one of
its parent Actor-Mixers; posting that stopping event then stops every matching
runtime event. Unmatched Stop targets are retained in
`diagnostics.stopRelationships.unresolved` instead of being guessed.

Known positioning is also retained as `spatial` on each sound leaf. This is
more precise than the event-wide metadata for mixed parallel/blend events:
one 3D leaf may use the emitter panner while its 2D sibling uses the flat SFX
route. A missing leaf value falls back to event `is2D`. Caller event metadata
still overrides the derived event-wide fallback; to override a known leaf,
provide or enrich the `sfx` graph itself.

Each resolved v150 attenuation also retains its scaling-type-2 dry-volume
curve as `{ scaling, points: [{ x, value, interpolation }] }` on that Sound
leaf. Distances stay in authored world units and values stay in Wwise's raw
decibel-curve representation so the runtime can perform interpolation before
scaling. The curve endpoint also supplies the conservative event culling
radius. Parallel leaves may therefore share an emitter and still attenuate
differently.

Missing parents, parent cycles, unsupported non-renderable NodeBase RTPC
controls or properties, and incomplete positioning data do not block otherwise
valid sound playback. Missing spatial data omits only the derived spatial patch
and adds diagnostics; non-renderable RTPC modifiers are ignored while supported
Volume, Pitch, filter, and InitialDelay curves remain exact. Missing,
unsupported, or Wwise `Use Project` dry-volume curves omit the leaf curve and
use the documented browser inverse-gain fallback. Mixed spatial events use the
largest complete leaf radius. Automatic bank projection is applied after
SoundbanksInfo metadata and before caller `metadata` and `enrichment`, so
explicit caller data remains authoritative.

Automatic construction currently accepts Wwise generator-version-150 codec
sounds, the qualified static Wwise Silence source shape, Play, Stop, Pause,
Resume, Set/Reset Voice Volume, Set/Reset Bus
Volume, Set/Reset Voice Pitch, Set/Reset Voice LPF/HPF, Play-Event,
SetSwitch and SetState actions, including their qualified fixed delays,
Random/Sequence containers without reverse restart, and named Step
Switch/State containers. Play actions retain
their authored delay, delay randomizer, probability, fade-in duration,
fade-in randomizer, and curve. Play-Event recursively inlines the referenced
event's playable program and merges its immediate setter, playback-control,
Voice Volume, Bus Volume, Voice Pitch, and Voice LPF/HPF actions; its delay,
delay randomizer, and probability wrap only the inlined playable roots.
Music-prefixed events retain Bus Volume actions while their music Play targets
stay owned by the music graph. A scheduled or gated
Play-Event that reaches any
non-play program is omitted rather than executing that action early.
Missing targets and cycles are diagnosed and omitted.
Successfully lowered nodes also retain inherited NodeBase Volume, Pitch, and
InitialDelay properties. Their independent authored random ranges are sampled
when that node is selected. An ordinary node is selected once per post, while
a Continuous child is selected again for each child batch. Volume accumulates
in decibels, Pitch becomes a Web Audio playback-rate ratio, and InitialDelay is
added to the Play action delay.
Hierarchy-only Actor-Mixer values are folded into the nearest playable node
without turning the mixer into a playable container.

A qualified Wwise Silence Sound follows its source ID to a v150
`CAkFxCustom` record with plug-in ID `0x00650002`, exactly 12 parameter bytes,
a positive fixed duration, and no random length, media, RTPC, State, or
property controls. It lowers to `timed-silence`; the browser loops one cached
one-frame zero buffer and schedules its physical stop at the logical authored
end. This keeps even EVE's 304.5-second pillar interval constant-memory while
preserving pause, seek, pitch/rate changes, Stop, Continuous advancement, and
completion. The empty inline source block is never treated as a default
one-second Silence when the referenced effect record exists. Randomized or
dynamic Silence remains fail-closed.

EVE build 3453885 uses eleven such leaves to restore the otherwise-audible
`worldobject_pillars_active_play`, five `jumpgate_suppressed_lvl_*` events,
`solar_array_outburst_play`, `solar_array_impact_play`, and
`solar_array_beam_play`. `in_game_video_stream_play` instead uses Wwise Audio
Input (`0x00C80002`): it has no bank media or authored duration and remains a
host-input barrier rather than receiving fabricated audio.
Layer/Blend containers with no Layer records, or only Layer records with no
child associations, lower to parallel playback. A Continuous validation flag
then has no child-admission region to evaluate. This covers the five
zero-record Hangar Layers and 22 association-free ship-engine Layers in EVE
build 3453885:
each owns parallel child lifetimes while its children retain their independent
Continuous Random/Delay schedulers. The affected Jita, Caldari, and Minmatar
Hangar Play branches target those layers directly; their structural State
ancestors remain available as Stop-match identities.
An associated Continuous Layer may lower to a pre-started browser blend only
when every direct child has an explicit non-empty region and is proven
infinite. All of those child sessions begin
with the Play action and remain alive until an authored Stop; the browser then
applies the authored normalized-gain and supported property RTPC curves live.
This preserves a dormant, RTPC-responsive container and prevents muted content
from exhausting, but it is deliberately approximate: Wwise starts and stops
children at each crossfade-region boundary, while runtime-audio keeps them
running at zero gain outside that region. Loop phase, Continuous Random timing,
voice count, and acquisition cost can therefore differ. A finite direct child
keeps the complete event fail-closed. Non-continuous Layer crossfade tracks
lower to live normalized-gain curves
when their controller is a named Game Parameter. Supported Layer property
RTPCs lower to live Volume, Pitch, low-pass, and high-pass curves on each
affected child. Initial Delay is rejected for the pre-started Continuous form
because later parameter changes cannot recreate Wwise's boundary-time delay
evaluation.
Transition and reset-after-stop policies authored on a Step Random/Sequence
container are Continuous-only and therefore do not alter its
one-child-per-post behavior.

Continuous Random/Sequence containers support Disabled, Delay, Trigger Rate,
Crossfade Amplitude, and Crossfade Power transitions. Disabled and Delay
advance after the complete selected child batch ends; Delay then applies its
independently sampled authored duration. Trigger Rate advances from the Web
Audio clock, samples one duration for each selected child that has a successor,
adds the selected child's Initial Delay, and permits earlier voices to overlap.
This per-boundary sampling is runtime-audio's deterministic Wwise-compatible
policy. Media acquisition does not serialize the cadence. If `RenderAudio()`
arrives after a boundary, the runtime issues that boundary once and rebases the
next one from current audio time instead of replaying a burst of missed
triggers. Silent selected branches still consume their interval; a selected
media leaf that cannot be acquired ends that traversal fail-closed.

An infinite Disabled-transition Continuous Random whose every playable direct
child is provably infinite cannot reach a second outer selection. The builder
therefore retains its one object-scoped Random choice without an outer
Continuous clock and lets the selected infinite child own playback.
Qualification accepts only direct looping Sounds, already-qualified infinite
Continuous Random/Sequence children, or a qualified pre-started Continuous
Layer and does not infer duration from media.
This is the same trapped-child reduction used by wwiser and restores the first
Play branch of EVE build 3453885's `worldobject_station_amarr_play`; the outer
container identity stays in every selected leaf's Stop ancestry.

Crossfade prepares the next single-voice child before its boundary and fails
closed if transactional preparation or media acquisition is unavailable. The
independently sampled authored duration is clamped to half the outgoing source
duration and its remaining play time. Amplitude uses opposing linear gain
ramps; Power uses equal-power sine/cosine curves. A speculative Random or
Sequence choice commits only when its successor becomes audible, so cancelled
or failed preparation does not consume that choice.

Continuous Switch/State containers are supported when `1st only` and
`Continue to play` are disabled and a Switch/State change stops the outgoing
object. The runtime follows each live game-sync decision, applies the authored
per-child Fade Out and Fade In times independently, and keeps a dormant
session through authored silence, natural completion, or temporarily missing
media so a later value can resume it. Nested Continuous Switch/State
containers are supported, including values that select the same final child;
the complete decision path determines whether playback restarts. Routes that
reach a non-switch Continuous container are rejected. This gate still applies
to a live Switch/State root whose branch reaches a zero-record
Continuous Layer containing Continuous Random/Sequence children; EVE's Hangar
Play actions target the qualifying branch nodes directly instead.

Continuous playback is object-scoped. Finite pass counts complete after every
overlapping tail ends, without waiting through a nonexistent final interval.
Break cancels pending and future selections while allowing active children to
finish their current iteration. Seek ignores only voices below a Trigger Rate
container, so unrelated siblings in the same event remain seekable. Active
Trigger Rate children receive runtime-audio's normal per-voice Stop fade; this
is a browser adaptation of Wwise's restricted Trigger Rate Stop propagation.
Duration RTPC modulation is not projected. Graphs whose minimum randomized
Trigger Rate interval is below 21 ms are rejected to avoid unbounded browser
voice production.

Two bounded nested clocks are supported. An infinite one-child Continuous
Sequence with a Delay may wrap a reset-on-play, one-pass Continuous Sequence
with a Trigger Rate. The parent-to-child edge must be plain, and the inner
scheduler container must carry no playback modifiers beyond its scope,
children, and Continuous settings. The inner voices keep their authored
overlapping cadence; after the final selection, the runtime waits for every
overlap tail and pending load, then samples the outer Delay and begins a fresh
inner pass. The outer Initial Delay applies only to the first pass. Stop and
Break retain the normal Trigger Rate contracts, and the outer container ID
remains the Stop target. This exact shape restores EVE build 3453885's
`upwell_hangar_armor_warning_play` and
`upwell_hangar_hull_warning_play`.

The second form is the narrow Jita incidentals topology: an infinite one-child
Continuous Random with a randomized Delay around a two-child, one-pass
amplitude Crossfade Sequence. Only static inner playback terms qualify. The
runtime applies the inner Initial Delay, crosses from the first child to the
second using the sampled authored duration, waits for both decoded dry voice
tails and pending loads, then samples the outer Delay and reapplies the inner
Initial Delay for the next pass. The authored playlist cursor is retained
because Reset Playlist at Each Play is disabled.

This makes EVE build 3453885's `jita_sfx_incidentals_level3_play` playable, but
it is deliberately not DSP- or tail-exact. Random step `211583824` inherits
static Wwise Delay ShareSet `2464647643`; its nine Sound children now receive
the authored 280 ms delay, 32.5-percent feedback, and 30.5-percent wet mix
through the browser Delay adaptation. The completion boundary still follows
decoded dry voices and therefore cuts the residual feedback tail. General
nested non-Switch Continuous clocks remain fail-closed.
Trigger Rate Pause does not freeze the cadence or carry a pause depth into
future child keys; the qualified Upwell consumers use Play and outer-container
Stop actions, so that broader behavior is not claimed as Wwise parity.

The builder normally omits an entire playable event when that event mixes
other unsupported actions or reaches an unsupported playable node; the
optional diagnostics callback explains each omission. Its
`approximatedEvents` list separately records the bounded partial-recovery
exception below. Sample Accurate Continuous
transitions, `1st only`, `Continue to play`, Play-to-End switch changes,
Play-and-Continue, playable Actor-Mixer approximation, associated Continuous
Layers with a finite direct child, Layer
property RTPC semantics outside the supported Volume, Pitch, low-pass, and
high-pass set, and other unqualified HIRC semantics are never silently
approximated.

The two EVE 3453885 XXL microwarpdrive `on` events use the qualified
pre-started form. Each outer thrust blend has three looping Sounds and one
infinite Trigger Rate Random child; its nested speed/direction blends also
reach only infinite children. Their live gain, Volume, Pitch, LPF, HPF, delayed
Voice Volume actions, and matching three-second `off` Stop fade are preserved.
Their inherited container effect chains remain unsupported: the bank assigns dynamic
Parametric EQ `1730584540`, Flanger `2328072489`, and Tremolo `1286274856`
ShareSets, while runtime-audio only projects complete static Parametric EQ and
Wwise Delay overrides. The browser
result is consequently drier and less modulated as well as pre-started.

EVE build 3453885's `ship_module_shield_drain_play` mixes two Play actions.
Action `960667829` reaches infinite Random `974515202`, whose 7000 ms amplitude
Crossfade has trackless Layer/Blend `211616663` as its only child. Wwise
[documents that Xfade fails when a Blend or Switch child plays](https://www.audiokinetic.com/en/public-library/2025.1.4_9062/?id=random_sequence_container_property_editor&source=Help).
Runtime-audio therefore omits that invalid action instead of inventing a
multi-voice crossfade. Its finite media `927964773` and `69501700`, infinite
replay, and Crossfade envelope do not run.

The same event's independent action `673588669` targets finite Sound
`603165888`, so the builder retains that action as a bounded audible fallback.
Media `278513022` plays once with its authored `-6 dB` and spatial properties.
The Sound's direct Wwise RoomVerb `402798902` remains unsupported and follows
the existing dry-playback fallback, so its reverb character and tail are
omitted. This exception requires exactly two plain Play actions, the audited
single-child infinite amplitude-Crossfade and trackless finite Layer shape,
and one independent finite codec Sound. An infinite or modified sibling and
all other Crossfade-to-Blend forms remain fail-closed.

For events that do lower, the builder walks every possible typed graph branch
and emits the exact set of reachable media IDs into `eventMedia`. This keeps
the flat catalog useful to tools without allowing a value that merely
resembled a WEM ID inside an undecoded payload to become audible.

The caller may instead obtain a complete built library from an API and skip
the builder. Runtime-audio performs no SFX metadata download or discovery.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Browser playback guide](browser-playback.md)
- [API reference](../reference/api.md)
