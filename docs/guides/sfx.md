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
Stop, Pause, Resume, Voice Volume, Bus Volume, Voice Pitch, Voice LPF/HPF,
and Set/Reset Game Parameter actions are also qualified at validation time.
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

## Node behavior

| Type | Behavior |
| --- | --- |
| `sound` | Produces one media voice. Optional `loop` overrides event metadata, `playCount` preserves a finite authored repeat count, `playbackRate` controls the buffer source, and `spatial` selects the panner (`true`) or flat SFX route (`false`). |
| `silence` | Produces no voice. This preserves authored empty switch/state cases without falling through to the default. |
| `random` | Chooses one weighted child. `mode: "shuffle"` exhausts a pool before refilling it; `avoidRepeat` excludes recent choices. |
| `sequence` | Chooses the next child for each post; `loop: false` produces no further leaves after the final child. |
| `switch` | Chooses a named case from a per-object switch or global state, with an optional `default`. Matching is case-insensitive. |
| `parallel` | Resolves every child into simultaneous voices. |
| `blend` | Resolves every child into simultaneous voices, normally with child gain curves for live crossfades. |

An event may have several roots; roots are parallel.

Play-action edges may carry `delayMs`, an optional randomized offset in
`delayRangeMs`, a percentage `probability`, and `fadeInMs` with an optional
`fadeInRangeMs` and Wwise `fadeCurve` from 0 through 8. Randomizer ranges are
offsets from the base value. One set of values is sampled for the Play action
and inherited by every sound leaf it selects. Delay is measured from the
event post, and the fade begins when the delayed source starts.

`programs` preserves the authored order of Play, Stop, Pause, Resume,
SetSwitch, SetState, Set/Reset Voice Volume, Set/Reset Bus Volume, Set/Reset
Voice Pitch, Set/Reset Voice LPF/HPF, and Set/Reset Game Parameter actions.
Switches update the posting game object; states update the global state table.
A switch or state setter therefore affects only later Play actions in the same
post. The `events` table remains the static playable-root projection used for
media discovery. An action-only program is valid and completes without
creating a media voice. Directly scheduled switch/state setters are omitted
instead of being executed early.

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
authored contribution on the same collapsed route. Typed Bus Volume RTPCs are
stored once per bus and add their global Game Parameter result across that
same ancestry for both SFX and built-in music. Scaling-2 curve outputs remain
raw: runtime-audio interpolates first, then applies Wwise's nonlinear dB
conversion. Typed Bus Volume State tables use the same route ancestry. Their
matching global State values add in decibels across subscribed groups and
buses, using the catalog's STMG default or directed transition duration. State
transitions remain interruptible and new voices join the current blend.

The catalog keeps both the authored bus synchronization type and the
route-qualified effective type. Wwise applies a bus State immediately when
only Actor-Mixer Hierarchy sounds use that bus, even if authoring selected a
music synchronization point. The builder records that qualification as
`effectiveSyncType: 0` and rejects a non-immediate subscription on a route used
by music, because runtime-audio does not yet own a music-grid scheduler for bus
States. Typed Audio Bus auto-ducking uses the same ancestry and one shared SFX
and music activity clock. A physical source activates every authored source
bus in its route at its scheduled Web Audio start, including silent samples;
pending media and authored graph silence do not activate it. The first active
source begins each target's Fade Out, overlapping sources on the same bus hold
one duck, and the last end starts Recovery followed by Fade In. Different
source buses add in decibels, and nonlinear fades interpolate in linear gain
with the authored Wwise curve. Voice Volume and Bus Volume targets remain
distinct in the portable catalog, although the current effect-free dry route
sums both into its per-route bus gain.

This remains a focused audible adaptation rather than full Wwise bus
processing. Voice Volume must move before a future dry/wet send split, while
Bus Volume belongs at the final bus stage; effects, auxiliary sends, meters,
and effect-tail-driven bus activity remain deferred as described in the
[routing reference](../reference/wwise-resource-routing-handoff.md).
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

Missing parents, parent cycles, unsupported non-renderable NodeBase RTPC
controls or properties, and incomplete positioning data do not block otherwise
valid sound playback. Missing spatial data omits only the derived spatial patch
and adds diagnostics; non-renderable RTPC modifiers are ignored while supported
Volume, Pitch, filter, and InitialDelay curves remain exact. A resolved v150
attenuation projects the dry-volume curve's authored maximum distance into
`maxRadiusAttenuation`; mixed spatial events use the largest complete leaf
radius. Automatic bank projection is applied after SoundbanksInfo metadata and
before caller `metadata` and `enrichment`, so explicit caller data remains
authoritative.

Automatic construction currently accepts Wwise generator-version-150 codec
sounds, Play, Stop, Pause, Resume, Set/Reset Voice Volume, Set/Reset Bus
Volume, Set/Reset Voice Pitch, Set/Reset Voice LPF/HPF, Play-Event,
SetSwitch, and SetState actions,
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
Trackless, non-continuous Layer/Blend containers lower to parallel playback.
Non-continuous Layer crossfade tracks lower to live normalized-gain curves
when their controller is a named Game Parameter. Supported Layer property
RTPCs lower to live Volume, Pitch, low-pass, and high-pass curves on each
affected child.
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
reach a non-switch Continuous container or a Continuous Layer are rejected.
The two known cached Hangar switch roots that reach Continuous Layers therefore
remain outside this supported subset.

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

The builder omits an entire playable event when that event mixes other
unsupported actions or reaches an unsupported playable node; the optional
diagnostics callback explains each omission. Sample Accurate Continuous
transitions, `1st only`, `Continue to play`, Play-to-End switch changes,
Play-and-Continue, playable Actor-Mixer approximation, authored Continuous
Layers, Layer
property RTPC semantics outside the supported Volume, Pitch, low-pass, and
high-pass set, and other unqualified HIRC semantics are never silently
approximated.

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
