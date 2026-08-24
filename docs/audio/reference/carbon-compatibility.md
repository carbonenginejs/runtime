# Carbon audio compatibility

Status: Evolving  
Scope: `@carbonenginejs/runtime/audio`
Audience: Runtime authors, content integrators, and maintainers  
Summary: Defines the maintained Carbon audio surface, adaptations, and intentionally unsupported native behavior.

## Contract

The `./trinity` entry owns the portable JavaScript form of Carbon audio schema
families `audio`, `trinityAudio`, and `trinityAudioApi`. Classes retain Carbon
field names, schema families, persistence metadata, and method provenance.

Portable behavior is implemented where it can be expressed without Wwise,
Python, an operating-system device manager, or a renderer. Browser realization
is supplied by the root package.

## Compatibility ledger

This table is the public index of intentional deviations. “Qualified route”
means a route admitted to faithful shared-bus topology; it does **not** mean the
media voice is otherwise silent. A rejected shared route normally remains
audible through the legacy SFX or music destination with the blocked authored
bus processing omitted.

| Area | Classification | Runtime contract |
| --- | --- | --- |
| Carbon audio graph and manager lifecycle | Exact portable behavior | Field, persistence, event, bank, RTPC, State, emitter, and listener contracts are maintained where they do not require native middleware. |
| Authored SFX and music scheduling | Browser adaptation | Web Audio scheduling preserves authored graph decisions; non-linear Wwise curves are sampled approximations and documented unsupported object families remain barriers. |
| Infinite-child Continuous Layer | Browser approximation | A layer whose every child has an explicit region and proven-infinite lifetime pre-starts all children, applies authored gain/property RTPC curves live, and remains active until Stop. Wwise instead starts and stops children at region boundaries; phase, Continuous Random timing, voice count, acquisition cost, and unsupported inherited effects can differ. Finite children remain fail-closed. |
| Wwise Silence source | Exact timing with browser carrier adaptation | A qualified static v150 `0x00650002` source retains its referenced fixed duration as a finite routed voice. One cached one-frame zero buffer loops until an authored sample-clock stop, so long silence allocates constant memory. Randomized or dynamic Silence remains unsupported. |
| Stripped empty Step Switch Container | Exact graph decision with browser lifecycle adaptation | A non-continuous Switch Container with zero group/default IDs, no Children, and no Switch assignments resolves to silence. Stale per-child switch parameters are inert without a playable game-sync map; the graph retains the action, delay metadata, and audible siblings. The silent action allocates no pending browser selection, so its delay alone does not extend playing-ID lifetime or participate in pending pause/stop. Other empty forms remain fail-closed. |
| Mixed Play with invalid Crossfade-to-Blend | Bounded audible fallback | When the exact audited shape contains one invalid infinite amplitude-Xfade-to-trackless-Blend action plus one independent finite codec Sound action, the builder omits only the invalid action and retains the finite sibling. EVE's shield-drain event therefore plays media `278513022` once; media `927964773` and `69501700`, the infinite replay, and the 7-second Xfade are omitted. The retained Sound's RoomVerb remains strict-default and may be explicitly approximated. Other Crossfade-to-Blend forms remain fail-closed. |
| Music Track Voice Volume RTPC | Browser adaptation | v150 property-0 Game Parameter curves using additive accumulation and Wwise dB scaling run on an independent pre-bus track gain from the global RTPC lane. Non-linear automation uses the documented sampled interpolation; other Music Track RTPC properties remain unsupported. |
| Bus-target Voice Volume Set | Bounded browser adaptation with audible fallback | An absolute, non-randomized game-object Set targeting the first/output Audio Bus persists per emitter and drives existing and future routed voices before that Bus stage. Reset, relative/randomized/global/ancestor/wet/music forms remain fail-closed. A route rejected by the shared mixer still plays with its action envelope, but rejected Bus effects and tails are omitted. |
| Authored-music UI transport | CarbonEngineJS extension | Previous, next, and random enumerate Music Segments plus a bounded coordinated path through Random/Sequence subtracks inside one live playing ID; layered-track Cartesian products are not materialized. Pause and selection fade then replay an item from its entry cue because Web Audio buffer sources cannot resume or seek. Manual selection starts a fresh playlist traversal (resetting random/shuffle history), while an explicitly selected Sequence Music Track continues at its following subtrack. These controls are not Wwise event actions; automatic playback otherwise retains independent authored selection. |
| Authored music Pause/Resume events | Exact musical scheduler with browser carrier adaptation | The music graph retains and executes EVE build 3453885's seven qualified actions in order: five postable-root element/game-object controls and two cross-domain all/game-object controls. Pause prequeues and arms audio-clock stops through authored fade completion; Resume preserves layered media offsets and future delays, shifts the scheduled timeline, retains the live playlist iterator, selection history, and pinned pending preparation, and resumes Wwise curve progress. The all controls also remain in the SFX program. Web Audio sources are necessarily recreated, and shared-Bus/native plug-in DSP state cannot be frozen per music instance, so effect tails and internal phase remain subject to their existing browser adaptations. Descendant-only element targets and ordered mixtures with music Play/Stop/setter actions remain fail-closed. The unrelated UI transport still replays from an entry cue. |
| Parametric EQ and Wwise Delay | Browser adaptation | Source-proven parameters, slot order, qualified shared-Bus placement, and complete effective static source overrides are retained. The exact EVE-v150 Game Parameter shape `ParamID 2`, exclusive accumulation, log-frequency scaling drives Band 1 Frequency live with object/global/default precedence. This numeric mapping is corpus-proven, not a universal Wwise plug-in enum. Source inheritance follows first-override replacement and explicit empty clears. Web Audio biquad/delay DSP is not bit-equivalent to Wwise; `processLfe:false` EQ is admitted only for mono/stereo decoded voices, source Delay feedback is cut at decoded dry-source completion, and pause/seek do not preserve native plug-in state. Other dynamic EQ controls, including Wwise Modulators, remain fail-closed. |
| Wwise Compressor and Peak Limiter | Opt-in approximation | `wwiseDynamics: "approximate-web-audio"` admits only static, linked, all-channel records. Qualified source-local Compressor and Peak Limiter overrides use one voice-owned browser stage; the default `"strict"` policy omits that complete source chain and keeps the voice audible/dry. A bounded SFX ordering proof also admits an ancestor Peak Limiter only when every route-local control belongs to a strict descendant and there is no incoming duck target. Other shared routes retain the legacy audible fallback. Missing browser dynamics or limiter-lookahead primitives also retain dry SFX playback. |
| Wwise Flanger | Opt-in approximation | `wwiseModulation: "approximate-web-audio"` admits the static sine/zero-phase source-local subset and one exact EVE-v150 dynamic form: Game Parameter `ship_Distance`, STMG built-in Distance binding 1, additive scaling-0 `ParamID`/property ID 1, and Wet/Dry Mix. Gain/Delay/Oscillator nodes approximate the unified comb; pose and attenuation-scaling changes automate independent dry/wet gains with 5 ms de-zippering. Strict mode or missing primitives plays the complete chain dry. Web Audio processes all decoded channels despite authored Center/LFE bypass, clamps unity feedback, retains phase through pause, and cuts effect state at dry-source completion. The numeric target, single-listener update, and `worldDistance / scalingFactor` law are bounded EVE/browser adaptations; control-type-4 Wwise Modulators, other dynamic forms, and shared-Bus Flanger remain unsupported. |
| Wwise Tremolo | Opt-in approximation | `wwiseModulation: "approximate-web-audio"` admits static Sine plus unsmoothed zero-phase Square (50%-duty) and Triangle source-local EVE-v150 records. One exact OSSE Square preset additionally uses a bounded 15%-duty Fourier pulse; its retained 9% smoothing is approximate, and its Circular 180-degree channel spread is inert for the two mono leaves. The adapter also admits the exact paired `booster_intensity` Sine form: corpus-proven `ParamID 1` Depth and `ParamID 2` Frequency curves share authored two-second STMG Filtering Over Time, which the runtime approximates per voice before automating both unipolar gain terms and oscillator frequency. The numeric targets are EVE evidence, not universal Wwise enums. The 38-byte layout remains empirical: pinned wwiser identifies `0x00830003` and shows a corresponding modulation/phase sequence in Flanger, while the official authoring order and EVE corpus pin waveform IDs. Gain/Oscillator nodes map depth to `[1-depth, 1]`; a custom `PeriodicWave` retains nonzero Sine global phase. Phase mode and spread remain portable metadata, but one all-channel browser carrier omits Wwise's per-channel distribution. Triangle PWM is ignored because Wwise applies it only to Square. Native oscillator/channel law, exact smoothing, Center/LFE bypass, other dynamic controls, other variable-duty carriers, other waveforms, and shared-Bus Tremolo remain unsupported; strict mode, missing metadata/readers, or missing primitives keeps the whole chain audible and dry. |
| Wwise Harmonizer | Unsupported DSP barrier | Pinned wwiser proves the v150 `0x008a0003` layout, but Web Audio has no duration-preserving pitch shifter and `playbackRate` would alter source duration. EVE's reachable sun records use a zero-cent processed voice mixed with latency-aligned dry audio, so they are not transparent pass-throughs. Their additive dB `ParamID 3` is controlled by an Envelope Modulator, but neither wwiser nor a controlled Wwise pair identifies whether it targets Voice 1 Gain or another gain-like property. The runtime therefore keeps the complete source chain audible and dry rather than inventing DSP or control semantics. One `warp_ship_init_play` record has `-96 dB` wet level and is a proven transparent-omission candidate, but admitting it alone would not improve audible playback. |
| Wwise Matrix Reverb | Opt-in approximation | `wwiseReverb: "approximate-web-audio"` admits static, control-free, source-local v150 default-delay records whose 29-byte layout is source-proven by pinned wwiser. A bounded four-line cyclic feedback-delay network preserves authored dry/wet levels and Pre-Delay and approximates Reverb Time and HF Ratio. The authored 4/8/12/16 delay count remains metadata rather than browser topology. Wwise's proprietary matrix, mixing, damping, channel, and LFE laws are not reproduced; pause/seek reuse browser state, and voice disposal cuts the tail at decoded dry-source completion. Shared-Bus Matrix Reverb, custom delay tables, dynamic controls, missing primitives, and strict mode keep the complete chain audible and dry. |
| Wwise RoomVerb | Opt-in approximation | `wwiseRoomVerb: "approximate-web-audio"` admits the static, control-free, source-local EVE-v150 subset decoded from pinned wwiser's exact 186-byte layout. Deterministic cached procedural impulse responses split early reflections from the late tail. The browser preserves Dry/Early/Late levels and Reverb Pre-Delay and approximates ER pattern/room size, decay/HF damping, diffusion/density/shape/quality, stereo width, and tone filtering. Wwise's proprietary reflection tables, reverb algorithm, early-reflection front/back timing, surround/LFE/center routing, and tail completion are not reproduced. Strict mode, missing convolution primitives, more than two decoded channels, dynamic controls, and shared-Bus RoomVerb keep the complete chain audible and dry. |
| Wwise Guitar Distortion | Opt-in approximation | `wwiseDistortion: "approximate-web-audio"` admits fully-wet Overdrive/Heavy source records from the source-proven v150 layout. In addition to static records, the exact EVE `ParamID 61`, object Game Parameter, additive, scaling-0 Drive shape follows `ship_health_hull`, `ship_warp_direction`, or `booster_intensity` live. The 24 `booster_intensity` leaves and one `ship_warp_direction` leaf retain their authored two-second STMG Filtering Over Time; the 111 `ship_health_hull` leaves author no filter and remain immediate. Voice-owned pre/post biquads surround a 4x-oversampled WaveShaper; two Gain nodes vary the existing normalized-tanh/full-wave approximation without replacing its curve. The mapping is EVE-v150 corpus evidence, not a universal plug-in enum, and the browser law is not Wwise's proprietary transfer/Drive/Rectification law. Authored Tone is retained but not applied. Exact oversampling, channel behavior, other dynamic controls/types, and shared-Bus placement remain unsupported. Strict mode, missing primitives, or a missing live RTPC reader keeps the complete chain audible and dry. |
| Wwise Meter | Proven omission or opt-in approximation | [Wwise Meter](https://www.audiokinetic.com/library/2024.1.0_8669/?id=wwise_meter_plug_in_effect&source=Help) measures without modifying the signal. Feedback-free telemetry therefore allocates no node on a shared Bus or in a complete source-local chain. `wwiseMeterFeedback: "omit-telemetry"` may also pass static Meter signal flow while omitting a Game Parameter output; strict source playback omits that complete effect chain and remains audible/dry. `Apply Downstream Volume` changes the omitted measurement basis, not signal flow. |
| Qualified Sound `MaxNumInstances` | Corroborated browser adaptation | A v150 local-scope cap-one, reject-newest Sound subset reserves at an immediate Play boundary before media acquisition and releases at physical completion. Qualification requires effective Continue virtual behavior and excludes dynamic/random Priority, capped bus routes, delayed admission, and Crossfade prefetch. The packed local/global scope bit is corpus-corroborated pending a controlled golden pair; general Wwise arbitration remains unsupported. |
| Dynamic Audio Bus `MaxNumInstances` RTPC | Unsupported behavior with opt-in route admission | Static and dynamic bus limits, priority stealing, and virtual-voice policy are not enforced. `wwiseVoiceLimits: "ignore"` additionally admits separately classified dynamic RTPC paths without enforcing their changing count or eviction behavior; the default `"strict"` keeps those paths outside shared routing. |
| Proven-silent Aux return | Proven omission | A complete return at or below `-96 dB` is omitted; a narrowly qualified static SFX Aux shape is exact topology, and other wet paths remain barriers. |
| Rejected shared route | Fallback | SFX remains on its existing emitter/SFX destination and music remains on its legacy segment/instance/output path; authored blocked bus stages are omitted. |
| Master safety compressor | Browser workaround | A separate fixed Web Audio compressor (`-6 dB`, knee `6 dB`, `12:1`, `3 ms`, `250 ms`) limits all output when supported. It is not an authored Wwise effect; without the node capability output connects directly. |
| Spatial playback | Browser adaptation | `PannerNode` supplies HRTF direction with its native distance rolloff disabled. A retained Wwise dry-volume curve supplies each Sound leaf's distance gain in authored world units; emitter attenuation scaling evaluates that curve at `worldDistance / scalingFactor`. Old/custom graphs without a retained curve use the previous `distanceScale` inverse-gain fallback. The first pose is immediate; later pose and distance-gain changes use Web Audio target automation with a 5 ms time constant when available (about 95% settled in 15 ms). Legacy spatial setters and older AudioParam fallbacks remain immediate or use a short linear ramp. |
| Carbon line-of-sight obstruction/occlusion | Exact headless manager behavior; opt-in browser approximation | `AudManager` owns Carbon's enabled-by-default per-emitter fade state and caller-facing blockage, clear, enabled, fade-rate, and live-occlusion methods. It clamps the supplied value, snaps a newly tracked emitter, otherwise fades at one unit per second by default, advances while culled, resends on wake or failed delivery, clears on disable, removes on unregister, and suppresses duplicate occlusion while spatial geometry is enabled. It performs no ray casting. The built-in backend accepts the state without DSP by default; `wwiseObstructionOcclusion: "approximate-web-audio"` applies fixed combined-blockage low-pass and attenuation curves to every emitter route. Carbon delegates the audible law to Wwise, so the browser curve is not authored or Wwise-equivalent. |
| Emitter level reporting | UI/debug approximation | `GetGameObjLevel()` samples 256-bin main-thread analyser frames and returns zero when analyser support is unavailable. It is not Wwise Meter telemetry. |
| Legacy library controls | Compatibility fallback | Older documents may use master/music RTPC gain fallbacks; current typed bus catalogs take precedence. |
| Missing optional Web Audio primitives | Capability fallback | Legacy LPF/HPF may be omitted without biquad support, level reporting becomes zero without an analyser, and the master safety compressor is absent without dynamics support. Shared graph qualification remains atomic. |
| Native device, input, profiler, and spatial rendering | Unsupported barrier | Portable contracts may remain, but native device work, capture, input plug-ins, diffraction, and middleware rendering are not emulated. The opt-in obstruction/occlusion response is a fixed browser approximation, not native spatial rendering. |

### Approximate Wwise dynamics

The opt-in policy preserves the authored bus, effect slot, threshold, release,
and output-gain placement, but it is intentionally not Wwise-equivalent.
Eligible Compressors also preserve authored attack; eligible Peak Limiters use
zero Web Audio attack and add output delay only when needed to bring total
latency above Web Audio's fixed 6 ms. Ratio is capped at Web Audio's `20:1`
maximum, knee is fixed at zero, and a post gain compensates Web Audio's
mandatory automatic makeup before applying the authored output gain.

The detector, envelope/time law, peak-limiter behavior, channel/LFE handling,
and lookahead detector window still differ. A limiter delay pad changes output
latency; it does not extend the native compressor detector's 6 ms anticipation.
Compressor field order is empirically corroborated for the audited v150 corpus;
the Peak Limiter layout is source-proven. Dynamic controls, media, independent
channels, Compressor attack `0`, dynamics timing above one second, and missing
browser primitives retain the legacy fallback. The independent master safety
compressor remains downstream, so an admitted authored dynamics route may pass
through both stages.

## Implemented behavior

The maintained graph includes:

- audio manager lifecycle, bank status, deferred events, global RTPC and state;
- per-object events, prefixes, RTPC values, switches, placement, culling, mute,
  and wake behavior;
- root-runtime interpretation of supplied authored SFX random, step-sequence,
  Continuous Disabled, Delay, Trigger Rate, and amplitude/power Crossfade
  transitions, Step Switch/State, the qualified Continuous Switch/State subset
  with per-child fades and nested switch sessions, parallel/blend, per-leaf
  spatial routing, gain, and linear RTPC-curve data;
- bounded silent graph preservation for stripped non-continuous Switch
  Containers with zero group/default IDs and empty Children and Switch
  assignment lists,
  including inert stale switch parameters and delayed actions with audible
  siblings;
- bounded partial recovery of one mixed Play shape whose invalid
  Crossfade-to-Blend action has one independent finite codec-Sound sibling;
- static v150 Wwise Silence sources as finite constant-memory voices whose
  authored duration participates in Stop, pause/resume, seek, Continuous
  completion, routing, and qualified instance admission;
- immediate Play-boundary per-game-object admission for the qualified v150
  Sound cap-one/reject-newest subset, including pending media, immediate
  Continuous completion, and Continuous Switch reroutes, with deterministic
  cancellation and lifetime release;
- ordered object/global Set and Reset Game Parameter actions with absolute or
  relative values, randomized delays, Wwise transition curves, persistent
  timelines, capture-time ordering, and live gain, pitch, and filter updates;
- ordered SetSwitch and SetState actions with exact deterministic fixed delays;
  delayed setters use the audio action clock, do not alter later same-post Play
  selection early, and update live Continuous decisions when due, while
  randomized/probabilistic or transition-bearing setters remain unsupported;
- ordered Voice LPF/HPF Set and Reset actions with signed randomizers,
  interruptible Wwise curves, hierarchy accumulation, action-aware filter
  provisioning, persistent global templates, and qualified Reset All/Except
  modes;
- ordered Bus Volume Set and Reset actions across the complete v150 alias
  family, with exact output-bus identities, persistent object/global state,
  interruptible linear-gain curves, and isolated live/future SFX routing;
- typed v150 Bus Volume RTPC catalogs with STMG defaults, raw Wwise
  interpolation-before-scaling behavior, and live dry-route realization across
  SFX and built-in music bus ancestry;
- typed v150 multi-property Audio Bus State catalogs with named Volume, Pitch,
  LPF, and HPF values, self-contained STMG transitions, qualified additive
  filter behavior, route-qualified synchronization, and interruptible live
  realization across SFX and built-in music bus ancestry;
- typed v150 Audio Bus auto-ducking catalogs with activity-based SFX/music
  coordination, source overlap union, Recovery Time, linear-gain Wwise fades,
  Voice/Bus target retention, and dry-route realization;
- typed v150 static Wwise Parametric EQ catalogs with ordered slots and bands,
  Web Audio dry-route realization for SFX and built-in music, and fail-closed
  dynamic-control and independent-LFE qualification;
- source-proven static v150 Wwise Delay decoding with one shared Web Audio
  dry/wet split, optional feedback loop, output gain, ordered Bus placement,
  and fail-closed dynamic-control and independent-LFE qualification;
- source-proven v150 Wwise Meter decoding with exact audio-transparent omission
  when no Game Parameter is written, regardless of its downstream-volume
  measurement flag; Meter telemetry itself remains unsupported;
- fail-closed omission of static user-aux returns only when their complete
  inactive-effect path and maximum installed gain remain at or below Wwise's
  `-96 dB` silence threshold;
- exact STMG State Group defaults and directed overrides, with immediate
  logical routing plus interruptible live Volume, Pitch, low-pass, and
  high-pass property interpolation;
- listener and emitter placement;
- caller-supplied obstruction/occlusion state, linear fading, cull/wake retry,
  acoustics suppression, and optional backend delivery;
- event metadata and sound prioritization;
- event curves, direct emitter event handling, and RTPC-driven curve-set time;
- post-render refresh of monitored RTPC values and action-log records for
  object parameter changes;
- UI and music emitters;
- three-emitter stretch audio;
- action-log records and callback flushing;
- spatial-audio settings and manager delegates;
- placement observers; and
- audio geometry data plus optional backend geometry lifecycle calls.

The exact class inventory is in the
[class-purpose catalog](classes/README.md).

## Adaptations

Some public values exist to preserve a useful serialized graph contract even
when Carbon supplies them through native setup rather than Blue persistence.
The principal example is emitter position and authored rotation.

| Runtime value | Graph field | Contract |
| --- | --- | --- |
| Name | `name` | Persisted game-object name. |
| Event prefix | `eventPrefix` | Persisted prefix applied to ordinary event posts. |
| Attenuation scaling | `scalingFactor` | Persisted value set by `SetAttenuationScalingFactor()`. |
| Position | `position` | Persisted authored placement available to headless consumers. |
| Authored rotation | `rotation` | Persisted notifying quaternion composed over parent placement. |
| Effective direction | `front`, `top` | Read-only axes sent to graph and backend consumers. |

Browser callbacks run on the JavaScript event loop. UI completion callbacks are
tracked per playing ID so overlapping events complete independently.

The v150 builder retains each resolved Sound leaf's Wwise dry-volume distance
curve and also projects its last distance into the event-wide culling radius.
The browser evaluates Wwise interpolation in raw curve space, converts Wwise
scaling type 2 to decibels, clamps at the curve endpoints, and then converts to
linear gain. This lets parallel leaves on one emitter retain different curves.
`SetAttenuationScalingFactor()` follows the Wwise/Carbon range convention:
`0.5` halves the playback curve range and `2` doubles it.
The same scaled authored distance drives the qualified EVE Flanger Wet/Dry
curve. The browser has one listener and refreshes that per-voice mix on emitter
pose, listener pose, and attenuation-scaling changes; Wwise multi-listener
reduction and its native update cadence are not reproduced.

A portable schema-v2 library may omit the optional per-event culling
enrichment; in that case a nonpositive attenuation radius is treated as
unknown/unbounded so the event remains playable. Positive authored radii
retain Carbon's squared-distance culling behavior. Carbon multiplies its
squared radius by the emitter factor, so the effective culling radius is
`authoredRadius * sqrt(scalingFactor)`, even though Wwise playback range scales
linearly. This preserved Carbon quirk can cull a scaled voice before its Wwise
curve reaches the endpoint when the factor is greater than `1`. A missing
dry-volume curve, including an unresolved Wwise `Use Project` assignment,
remains audible via the historical Web Audio inverse-gain fallback because the
portable document does not contain the project default. That fallback is not
Wwise-equivalent.

Distance gain shares the voice gain `AudioParam` with authored Voice Volume,
State, and RTPC automation to preserve the established browser graph topology.
Moving a source while one of those gain transitions is active reschedules the
remaining transition with the new distance multiplier. The result is smooth
and close, but the continuously varying product is a browser approximation
rather than a sample-exact Wwise envelope. Cone attenuation, distance-driven
LPF/HPF and spread/focus curves, diffraction, and transmission remain
unsupported.

Carbon's 2026-08-04 `AudObstructionOcclusion` addition makes obstruction and
occlusion a host-driven manager contract rather than a ray-casting feature.
The game supplies one blockage value per emitter. The audio layer clamps it,
tracks and linearly fades the live value at one unit per second by default,
suppresses occlusion while spatial geometry is enabled, and forwards changed
awake values through the optional backend method
`SetObjectObstructionAndOcclusion(emitterID, listenerID, obstruction,
occlusion)`. A void return counts as acceptance; explicit `false` is retried on
the next `Process()`. The built-in backend acknowledges those values without
allocating DSP in default `"strict"` mode. The explicit
`wwiseObstructionOcclusion: "approximate-web-audio"` policy combines the two
values monotonically, maps them to a logarithmic low-pass from the lower of
20 kHz or the context Nyquist frequency down to 600 Hz plus 0-to--18 dB
attenuation, and smooths browser parameters over 5 ms. That fixed law is
CarbonEngineJS behavior: Carbon delegates the audible response to Wwise and
supplies no portable curve to reproduce.

A Wwise Continuous Layer with no Layer records, or only Layer records with no
child associations, is represented by the portable parallel node because it
has no live child-admission region to evaluate. Its children retain independent
lifetime and Continuous Random/Sequence scheduling, and ancestor Layer/State
identities remain in leaf matching so authored Stops terminate the complete
group. This exact
bounded form covers five zero-record Hangar Layers and 22 association-free
ship-engine Layers in EVE build 3453885.

An associated Continuous Layer is admitted only when every direct child has an
explicit non-empty region and is proven infinite. The audio layer pre-starts
those children, keeps the container
alive until an authored Stop, and applies its gain plus supported property RTPC
curves live. This is a browser approximation, not Wwise child admission:
children continue silently outside their authored region instead of starting
and stopping at its boundaries, so loop phase, Continuous Random timing, voice
count, and acquisition cost may differ. Finite children remain fail-closed.
Volume, Pitch, LPF, and HPF track RTPCs remain live; Initial Delay is rejected
because a pre-started child cannot reevaluate it at a later Wwise admission
boundary.
The bounded form restores EVE build 3453885's two XXL microwarpdrive `on`
events and their matching three-second `off` Stop behavior. Those graphs also
inherit dynamic Parametric EQ `1730584540`, Flanger `2328072489`, and Tremolo
`1286274856` container ShareSets that the browser does not realize, so their
output is drier and less modulated than Wwise.

An infinite Disabled-transition Continuous Random is reduced to its first
object-scoped Random choice when every direct candidate is a proven looping
Sound, an already qualified infinite Continuous Random/Sequence, or a
qualified pre-started Continuous Layer. The
selected child can never return control to the outer scheduler, so omitting
that unreachable outer clock preserves authored behavior and Stop ancestry.
A second exact bounded form admits an infinite one-child Sequence with a Delay
around a reset-on-play, one-pass Trigger Rate Sequence. Its parent edge is
plain and its inner scheduler has no playback modifiers beyond scope,
children, and Continuous settings. The backend holds a
completion barrier until all overlapping inner tails and pending loads settle,
then samples the parent Delay and starts a fresh inner pass. This covers the
two EVE 3453885 Upwell armor/hull hangar warnings. Trigger Rate Pause remains a
browser adaptation: it does not freeze cadence or propagate pause depth to
future child keys, and the qualified Upwell consumers require only Play and
outer-container Stop.

A third, deliberately approximate bounded form admits EVE build 3453885's
`jita_sfx_incidentals_level3_play`: an infinite one-child Continuous Random
with randomized Delay around a static, two-child, one-pass amplitude Crossfade
Sequence. The backend preserves its retained playlist cursor, inner Initial
Delay, sampled Crossfade duration, dry-tail completion barrier, and randomized
outer Delay. Random step `211583824` inherits Wwise Delay ShareSet
`2464647643`; its nine Sound children receive the authored 280 ms delay,
32.5-percent feedback, and 30.5-percent wet mix through the browser Delay
adaptation. Completion still follows decoded dry voices and cuts the residual
feedback tail. Other nested non-Switch Continuous clocks remain unsupported.

## Unsupported native behavior

The package does not emulate:

- Wwise device enumeration or device-change callbacks;
- Wwise profiler capture;
- Web Audio realization of spatial-audio geometry or diffraction (the geometry
  data/settings/refcount contracts remain available to injected backends, and
  obstruction/occlusion has only the optional fixed approximation above);
- native audio-input plugins, including EVE's bank-media-free
  `in_game_video_stream_play` Wwise Audio Input source;
- operating-system device selection; or
- Wwise middleware rendering.

Bus Volume is an audible routed adaptation with complete dry-output ancestry,
authored base Bus Volume, bus Make-Up Gain, effective NodeBase Output Bus
Volume, global RTPC and State contributions, and shared SFX/music auto-ducking
activity. The current ducking gain is exact for the realized collapsed dry
route. Bus Pitch is transport-aware on SFX and follows Wwise's exclusion for
music; Bus LPF/HPF are distributed dry-route filters for both engines. Static
Parametric EQ uses source-proven v150 field decoding and one ordered shared
Web Audio chain per Bus when the complete graph route qualifies. Blocked or
missing graph routes retain the distributed source-route fallback. Neither
path claims native Wwise DSP equivalence. A complete effective Sound-local,
control-free Parametric EQ/Wwise Delay override is also adapted into
one voice-owned Web Audio chain before Voice filters and spatial/auxiliary
splitting. The first NodeBase override replaces inherited effects, including
an explicit empty clear. Static source EQ may retain `processLfe:false` because
decoded mono/stereo audio has no independent LFE channel; above two channels
the complete chain stays dry. This admits the skyhook population EQ-to-Tremolo
chain. One bounded EVE-v150 dynamic EQ form is also retained:
Game Parameter `ParamID 2`, exclusive accumulation, and log-frequency scaling
drive Band 1 Frequency through the existing object/global/default RTPC lane.
Its `processLfe:false` routing is equivalent for decoded mono/stereo sources;
more than two channels keep the complete chain dry. Mixed unsupported-plug-in,
other dynamic, and other independent-LFE Sound effects remain documented
dry-playback approximations. Wwise Modulator controls stay unsupported until
their HIRC objects and voice-local lifecycle are available from the resource
layer.
Source Delay lifecycle follows the decoded dry voice and cuts residual
feedback; pause/seek reuse browser state rather than matching native plug-in
state. Static Wwise Delay likewise uses
source-proven v150 fields and one shared Web Audio delay/feedback stage. For
Audio Bus routes it has no distributed per-source fallback. Bus ancestries
targeted by retained Set or Reset Bus Volume actions stay blocked across audible effects because their
instance/object scope cannot drive a fader shared by unrelated signals. Each
qualified physical Bus now owns an exact post-effect fader for static Bus
Volume, global Bus Volume RTPC, and Immediate State gain. The existing
dry-route stages retain Make-Up Gain, effective NodeBase Output Bus Volume,
Bus Volume actions, Voice Volume, State pitch, and the additive whole-ancestry
LPF/HPF fallback. The exact audible SFX Aux shape instead evaluates one
complete dry-path and one complete wet-path filter pair before their respective
Bus-target duck gains.
Those route-/voice-local controls still block audible shared effects, while
gain-only Bus RTPC/State paths may cross a qualified static effect sequence.
A static user-aux send may also be omitted when the complete return is provably
silent. SFX additionally realizes one static, neutral-filter user send when its
qualified Auxiliary return rejoins the dry ancestry without branch-asymmetric
Pitch, gain placement, actions, or audible effects. The route entry fans out
after spatialization, applies additive State filtering and Bus-target ducking
per whole leg, and merges once at the common Bus. Mixed Voice/Bus rules from
one duck source and wet-only duck sources or Voice targets remain barriers.
Absolute or positive-relative action risk, unsupported filters, dynamic sends,
reflections, and wet-path escapes all retain the barrier. A static,
control-free source Meter is retained as portable metadata.
It allocates no node when it has no Game Parameter target; an explicit
`wwiseMeterFeedback: "omit-telemetry"` also admits a target-bearing Meter while
omitting its telemetry. Strict mode leaves that complete source chain dry.
`Apply Downstream Volume` affects the omitted reported level, not the passed
audio signal.
Voice Volume RTPCs use a distinct pre-bus SFX gain on qualified transparent
paths. A bounded Bus-target Voice Volume Set uses a second voice-owned pre-Bus
gain only when its target is the route's first/output Bus. It persists on the
posting emitter generation and affects future posts; fixed delay and
transition timing use the authored AudioContext clock. The EVE 3453885
cinematic begin/climax pair is audible through the legacy fallback, so its
`-30 dB` to `0 dB` envelope is retained while its rejected shared Delay and
Peak Limiter processing is omitted. Unsupported RTPC bindings, route-local
controls crossing an audible shared effect,
other audible auxiliary sends, other effect processing
and tails, feedback-capable meters, general priority/instance arbitration,
project and bus voice limits, and virtual-voice behavior remain deferred
as described in the
[Wwise routing requirements](wwise-resource-routing.md).

Unsupported Carbon methods remain visible with explicit implementation
metadata where their schema surface is maintained.

## User-facing volume settings are authored data

Carbon does not hard-code its audio options screen. The volume levels a player
adjusts are ordinary game parameters carrying authoring metadata that marks
them as user-exposed, so the settings surface is generated from the bank data
rather than written by hand.

The shape, verified against the shipping audio metadata:

- of roughly 136 game parameters, 38 are marked user-exposed;
- they fall into two tiers — a first tier of exactly two, the master and music
  levels, and a second tier of 36 per-category levels;
- each carries a `0..1` range, an initial value, and a localization key for its
  label. The music level's initial value is `0.75`.

Two consequences for a host. A settings UI can be generated from that metadata
— tier for grouping, localization key for the label, range and initial value
for the control — instead of hard-coding a list that drifts from the banks. And
stored values are applied through the ordinary global RTPC path, so they must
be pushed once audio is enabled rather than at construction: before a backend
exists there is nothing to apply them to.

This package interprets the parameters and applies them. It does not own the
storage, validation, or persistence of a user's chosen values; that is a host
concern, and the future `core` composition layer owns the planned preferences
service for it.

## Schema refresh and generation safety

An isolated tools-core schema refresh on 2026-08-22, using Carbon audio
`e424db6`, contains `audio/AudObstructionOcclusion.json`. The refresh was
review-only: no schema or generated class was installed into this package. The
three files that still carry generator provenance—`AudEventKey`, `AudSettings`,
and `Tr2AudGeometryData`—compare clean with the refreshed schema.

Source generation is owned by `@carbonenginejs/tools-core`, while the three
reviewed outputs live under `src/audio/generated`. Their exact generator banner
is the overwrite boundary; maintained graph classes live outside that tree and
must never be replaced by a schema refresh. The runtime test suite verifies
that separation. A refresh must still be staged and reviewed before generated
output is installed.

## Provenance

Faithful and adapted classes are derived from the public MIT-licensed
[CarbonEngine](https://github.com/carbonengine) audio and Trinity contracts.
CarbonEngineJS original classes are identified separately in the
[class-purpose catalog](classes/README.md).

CarbonEngineJS is an independent project and is not affiliated with CCP Games.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Current API reference](api.md)
- [Class-purpose catalog](classes/README.md)
- [Wwise routing support and remaining work](wwise-resource-routing.md)
