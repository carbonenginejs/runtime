# Shared Audio Bus mixer and bus routes

These modules realize the portable `busGraph` catalog (Wwise Audio Bus
topology) as Web Audio nodes. The SFX backend and the built-in music engine
both use them.

| Module | Role |
| --- | --- |
| `busGraph.js` | Validates the `busGraph` catalog and checks consumer route projections. |
| `busGraphRuntime.js` | Holds stable route handles for one library generation. It creates no nodes. |
| `busGraphMixer.js` | `CjsSharedBusMixer`: qualifies routes and owns the shared Bus nodes. |
| `busEffects.js` | Decodes effect parameter blocks and builds the Web Audio effect stages. |
| `busFader.js` | Schedules one physical Bus post-effect fader. |
| `busFilter.js` | Schedules one additive State LPF or HPF over a complete route leg. |
| `busDuckGain.js` | Schedules one route leg's Bus-Volume duck gain. |
| `busRtpc.js`, `busState.js` | Index and evaluate the Bus RTPC and Immediate State catalogs. |
| `busDucking.js` | `CjsBusDuckingController`: auto-duck activity and envelopes. |

## Lifetime

When the library has a `busGraph`, `Enable()` creates one
`CjsBusGraphRuntime` and one `CjsSharedBusMixer` per AudioContext generation. The SFX backend and the music engine share the same
route handles. A Sound resolves its handle by exact leaf ID and a music track
by exact track ID, so topology is never inferred from an equal dry path.
Disposing the runtime invalidates its handles; disposing the mixer
disconnects every node it allocated.

`GetInput(handle, "sfx" | "music")` returns one stable gain entry per route
and category. SFX and music entries stay separate, so a category volume never
merges unrelated routes before their common Bus. Common Bus ancestors, their
effect chains and their faders are allocated once and shared by every entry
that reaches them. Qualification runs before any node is allocated. A blocked
route returns `null` and allocates nothing. The consumer then keeps its
existing path: SFX plays to its emitter/SFX destination, music to its legacy
segment/instance/output path, and the blocked Bus stages are omitted.

Consumers own everything before the entry. The SFX backend uses one lazy
branch per exact route and spatial mode and feeds the entry after
spatialization. Each qualified branch has its own analyser, so emitter
metering stays aggregate without merging routes. The music engine uses one transition lane per
scheduled route and one Play-instance lane per exact route, so segment
crossfades and instance stop fades stay route-local.

## Effect parameter layouts (v150, little-endian)

The decoders take the raw bytes of one static effect: no RTPC, State,
property-value controls and no plug-in media.

**Parametric EQ** (`0x00690003`), 56 bytes. Three 17-byte bands, then the
trailer:

| Offset | Type | Field |
| --- | --- | --- |
| band + 0 | u32 | filter type: 0 lowpass, 1 highpass, 2 bandpass, 3 notch, 4 lowshelf, 5 highshelf, 6 peaking |
| band + 4 | f32 | gain dB, -200..200 |
| band + 8 | f32 | frequency Hz, > 0 |
| band + 12 | f32 | Q, > 0 |
| band + 16 | u8 | enabled, 0 or 1 |
| 51 | f32 | output gain dB, -200..200 |
| 55 | u8 | process LFE, 0 or 1 |

Bands start at 0, 17 and 34. Only enabled bands are kept, in band order.

**Wwise Delay** (`0x006a0003`), 18 bytes:

| Offset | Type | Field |
| --- | --- | --- |
| 0 | f32 | delay time, 0.001..1 s |
| 4 | f32 | feedback %, 0..100 |
| 8 | f32 | wet/dry mix %, 0..100 |
| 12 | f32 | output level dB, -96.3..0 |
| 16 | u8 | enable feedback, 0 or 1 |
| 17 | u8 | process LFE, 0 or 1 |

**Wwise Meter** (`0x00810003`), 28 bytes, bank version 150 only:

| Offset | Type | Field |
| --- | --- | --- |
| 0 | f32 | attack, 0..10 s |
| 4 | f32 | release, 0..10 s |
| 8 | f32 | minimum dB, -96.3..0 |
| 12 | f32 | maximum dB, -96.3..12, not below minimum |
| 16 | f32 | hold, 0..10 s |
| 20 | u8 | infinite hold |
| 21 | u8 | mode: 0 peak, 1 RMS |
| 22 | u8 | scope: 0 global, 1 game object |
| 23 | u8 | apply downstream volume |
| 24 | u32 | output Game Parameter ID, 0 for none |

The Peak Limiter (22 bytes) and Compressor (22 bytes) layouts are documented
on their decoders in `busEffects.js`.

## Web Audio realization of shared Bus effects

A Bus's active slots, in slot order, form one chain. The chain sits between
the Bus input and its fader:

    Bus input -> effect chain -> post-effect fader -> parent Bus input

- **Parametric EQ**: one `BiquadFilterNode` per enabled band, in band order,
  then an output gain when that gain is not 0 dB. An EQ with no enabled band
  and 0 dB output allocates no node. Frequency is clamped to Nyquist. A
  shared Bus EQ needs process LFE = 1; independent LFE routing is not
  realized.
- **Wwise Delay**: one input gain splits into a dry gain `1 - mix` and a
  `DelayNode` into a wet gain `mix`. When feedback is enabled, a gain of
  `feedback% / 100` loops the delay output back into its input. Dry and wet
  sum into one output gain at the output level. Process LFE = 0 is rejected.
- **Wwise Meter**: allocates no node. A Meter only measures, so a static,
  media-free, control-free Meter is transparent. With a Game Parameter output
  it passes only under `wwiseMeterFeedback: "omit-telemetry"`: audio crosses
  the slot, no value is produced, and any authored feedback through that
  Game Parameter is absent. Under `"strict"` it blocks the route.
  `Apply Downstream Volume` affects only the omitted measurement, never the
  signal.
- **Compressor / Peak Limiter**: only under
  `wwiseDynamics: "approximate-web-audio"`, only when process LFE and channel
  link are both set, and only within the Web Audio timing limits. See
  `CreateWwiseDynamicsApproximation` and `RequireApproximateDynamics`.
- Any other plug-in, or any control or media on an effect, blocks the route.

`BiquadFilterNode`, `DelayNode` and `DynamicsCompressorNode` are not
bit-equivalent to the Wwise DSP. Slot order, parameters and shared lifetime
are what is preserved.

### Distributed EQ fallback

A route the mixer rejects, or a library without `busGraph`, keeps the
per-source fallback: `createBusEffectChain()` builds the `busEffects` catalog
chain for each voice or music route stage. That catalog holds static
Parametric EQ only. Shared Wwise Delay has no distributed fallback.

## Route qualification

`CjsSharedBusMixer` admits a route only when every check below holds. The
result is cached per handle.

1. `busPathIds` is non-empty, starts at `outputBusId`, has no repeats, and
   each element's parent is the next element.
2. Every dry Bus is an `audio-bus` with the default channel configuration
   (`channelConfig.raw === 0`).
3. Positioning is inactive: the flags hold at most the override-parent bit,
   not listener-relative, panner type 0, position type 0.
4. HDR is inactive: the flags hold at most the exponential-release bit, and
   HDR is disabled.
5. Every user Aux send on a dry Bus is proven silent (see below), and there
   is no reflections send.
6. `requiresProcessing` has no duplicates. It may hold only `ducking`, `rtpc`,
   `state`, `effects` (exactly when an active slot exists), `aux-sends` (when
   every send is silent), and `voice-limits` under
   `wwiseVoiceLimits: "ignore"`.
7. Every active slot has index 0..3, no duplicate, `rendered: false`, a
   ShareSet flag that matches its effect record, and decodes as a shared Bus
   effect under the selected policies.
8. The needed browser primitives exist: `BiquadFilterNode` for an EQ with an
   enabled band, `DelayNode` for Delay and for a Peak Limiter lookahead above
   6 ms, `DynamicsCompressorNode` for dynamics.
9. Each declared control is installed: an `rtpc` reason needs that Bus's RTPC
   curves, `state` its State groups, `ducking` a live ducking source. A Bus
   using Bus Volume RTPC or State gain also needs the global value and
   transition-boundary readers.
10. The sum of the dry Buses' static Bus Volume equals the route's
    `authoredBusVolumeDb`.
11. The audible-effect and control rule below holds.
12. The route's own Aux sends qualify (see below).

Music has two extra blocks: a Voice Volume RTPC anywhere on the path, and any
audible Aux send.

`wwiseVoiceLimits: "ignore"` only removes the separately classified
`voice-limits` reason (the v150 Audio Bus `MaxNumInstances` RTPC). The
dynamic count and the Wwise eviction policy are not applied. Static Bus
maximum instances, stealing and virtual-voice policy are never enforced.

## Per-Bus and route-local control

Each physical Bus owns one post-effect fader. It is allocated only when the
Bus has a non-zero static Bus Volume, a Bus Volume RTPC, or a State gain. Its
value in dB is:

    static Bus Volume + that Bus's global Bus Volume RTPC + that Bus's Immediate State gain

The fader is sampled in 65-point value curves between the global RTPC and
State transition boundaries.

| Control | Stage |
| --- | --- |
| Static Bus Volume | Per-Bus fader |
| Bus Volume RTPC (global) | Per-Bus fader |
| Immediate State gain | Per-Bus fader |
| Voice Volume RTPC | Voice gain before the Bus |
| Make-Up Gain | Route-local stage |
| NodeBase Output Bus Volume | Route-local stage |
| Set/Reset Bus Volume actions | Route-local stage |
| State pitch | Source-local |
| State LPF/HPF | Route-local filter pair; see below |

State LPF and HPF add across the complete ancestry. The sum is clamped to
0..100 once, then mapped to a cutoff. Ordinary and blocked routes use the
source- or track-local filter pair. The audible Aux shape uses one
independent pair on each complete dry and wet leg (Q = √½), before that leg's
Bus-target duck gain.

### Audible effects and controls

Route controls are: a Voice Volume RTPC, a State pitch, LPF or HPF, a Bus
targeted by a retained Set/Reset Bus Volume action
(`busVolumeActionControlled`), and a Bus that is a ducking source. An
incoming duck target on the path also counts, although Wwise declares that
rule on the separate source Bus. A Meter omission is not audible.

Bus Volume actions stay route-local because they are scoped to one playing
instance or game object. Driving the shared fader would change unrelated
voices and music, and a gain before an audible effect would change only new
input while, for example, a Delay tail kept the old gain.

A route with an audible effect and any route control is blocked, with one
exception. It is admitted when all of these hold:

- every audible effect on the route is an approximated Peak Limiter;
- no duck targets the path;
- every control sits on a strict descendant of the first Bus with an audible
  effect.

Those controls already run before the shared topology, so the ancestor
limiter keeps its authored order. A control on the same Bus or an ancestor,
an incoming duck target, or any other audible effect keeps the route on
fallback.

## Auxiliary sends

**Proven-silent return.** A static user send may be omitted when its complete
Auxiliary Bus return stays at or below Wwise's -96 dB silence threshold. The
proof walks from the target Auxiliary Bus to the root. Each Bus must:

- have the default channel configuration, inactive positioning and HDR, and
  no user or reflections sends of its own;
- have only `auxiliary-bus`, `rtpc` or `state` processing reasons;
- carry only bypassed, unrendered effects without media or controls;
- not be marked `busVolumeMayIncrease` (an absolute Set, or a relative Set
  whose maximum is above 0 dB);
- have no RTPC curve whose maximum is above 0 dB, and no State gain above
  0 dB;
- not be a duck target.

The return gain is the sum of Bus Volume, Make-Up Gain, Output Bus Volume and
the maximum Bus Volume RTPC value of every Bus. Voice Volume RTPC is checked
as non-amplifying but is not counted as attenuation. The return must be
at or below -96 dB, and so must the send gain plus the return. The send must
be static, finite and have neutral LPF/HPF. An omitted send allocates no
nodes and is not rendered.

**Audible SFX Aux shape.** Exactly one static, finite user send with neutral
filters on the route, with no reflections send and zero route Make-Up Gain
and Output Bus Volume. Its target climbs through at least one wet-only Bus
(the first an `auxiliary-bus`, the rest `audio-bus`) until it rejoins the dry
ancestry. Every Bus on the combined path must:

- meet the dry Bus checks above and have no sends of its own;
- have no Bus Volume action, no `busVolumeMayIncrease`, and zero Make-Up
  Gain and Output Bus Volume;
- carry no audible effect (Meter omission only).

It is also blocked when any of these hold:

- the ducking rules of one source span Voice and Bus targets in a way the
  split cannot keep (`CanSplitTargetProperties`);
- a Voice Volume duck targets a wet-only Bus;
- a wet-only Bus is a duck source or has a Voice Volume RTPC;
- a Bus only on one leg has State pitch;
- a State filter leg lacks its readers or biquad support.

The entry fans out after spatialization:

    entry -> dry filters -> dry duck gain -> output Bus
    entry -> send gain (dB) -> wet filters -> wet duck gain -> Auxiliary Bus

Both legs reuse the same shared common ancestors. Duck gain is evaluated over
each whole leg, which keeps a source's collective maximum-duck floor. Music,
reflections, dynamic or multiple sends, and every other wet path stay
blocked.
