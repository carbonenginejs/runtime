# Carbon audio compatibility

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio`
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
| Mixed Play with invalid Crossfade-to-Blend | Bounded audible fallback | When the exact audited shape contains one invalid infinite amplitude-Xfade-to-trackless-Blend action plus one independent finite codec Sound action, the builder omits only the invalid action and retains the finite sibling. EVE's shield-drain event therefore plays media `278513022` once; media `927964773` and `69501700`, the infinite replay, the 7-second Xfade, and the sibling's unsupported RoomVerb tail are omitted. Other Crossfade-to-Blend forms remain fail-closed. |
| Music Track Voice Volume RTPC | Browser adaptation | v150 property-0 Game Parameter curves using additive accumulation and Wwise dB scaling run on an independent pre-bus track gain from the global RTPC lane. Non-linear automation uses the documented sampled interpolation; other Music Track RTPC properties remain unsupported. |
| Bus-target Voice Volume Set | Bounded browser adaptation with audible fallback | An absolute, non-randomized game-object Set targeting the first/output Audio Bus persists per emitter and drives existing and future routed voices before that Bus stage. Reset, relative/randomized/global/ancestor/wet/music forms remain fail-closed. A route rejected by the shared mixer still plays with its action envelope, but rejected Bus effects and tails are omitted. |
| Authored-music UI transport | CarbonEngineJS extension | Previous, next, and random enumerate Music Segments plus a bounded coordinated path through Random/Sequence subtracks inside one live playing ID; layered-track Cartesian products are not materialized. Pause and selection fade then replay an item from its entry cue because Web Audio buffer sources cannot resume or seek. Manual selection starts a fresh playlist traversal (resetting random/shuffle history), while an explicitly selected Sequence Music Track continues at its following subtrack. These controls are not Wwise event actions; automatic playback otherwise retains independent authored selection. |
| Parametric EQ and Wwise Delay | Browser adaptation | Source-proven parameters, slot order, qualified shared-Bus placement, and complete effective static source overrides are retained. Source inheritance follows first-override replacement and explicit empty clears. Web Audio biquad/delay DSP is not bit-equivalent to Wwise; source Delay feedback is cut at decoded dry-source completion, and pause/seek do not preserve native plug-in state. |
| Wwise Compressor and Peak Limiter | Opt-in approximation | `wwiseDynamics: "approximate-web-audio"` admits only static, linked, all-channel records. Qualified source-local Compressor and Peak Limiter overrides use one voice-owned browser stage; the default `"strict"` policy omits that complete source chain and keeps the voice audible/dry. A bounded SFX ordering proof also admits an ancestor Peak Limiter only when every route-local control belongs to a strict descendant and there is no incoming duck target. Other shared routes retain the legacy audible fallback. Missing browser dynamics or limiter-lookahead primitives also retain dry SFX playback. |
| Wwise Flanger | Opt-in approximation | `wwiseModulation: "approximate-web-audio"` admits only a static, control-free, sine/zero-phase source-local subset decoded from wwiser's exact v150 layout. Gain/Delay/Oscillator nodes approximate the unified comb, start the LFO with the voice, and stop it at voice disposal. Strict mode or missing primitives plays the complete chain dry. Web Audio processes all decoded channels despite authored Center/LFE bypass, clamps unity feedback, retains phase through pause, and cuts effect state at dry-source completion. Shared-Bus Flanger remains unsupported. |
| Wwise Tremolo | Opt-in approximation | `wwiseModulation: "approximate-web-audio"` admits a static, control-free, sine/zero-phase source-local EVE-v150 subset and rejects other bank versions. The 38-byte layout is empirical: pinned wwiser identifies `0x00830003` and shows a corresponding modulation/phase sequence in Flanger, but has no Tremolo parameter decoder; the EVE corpus informs the interpretation. Gain/Oscillator nodes map the unipolar authored depth to `[1-depth, 1]`, start with the voice, and stop at voice disposal. Exact start phase, native oscillator/channel law, Center/LFE bypass, and shared-Bus Tremolo remain unsupported; strict mode or missing primitives keeps the whole chain audible and dry. |
| Wwise Guitar Distortion | Opt-in approximation | `wwiseDistortion: "approximate-web-audio"` admits static, control-free, fully-wet Overdrive/Heavy source records from the source-proven v150 layout. Voice-owned pre/post biquads surround a 4x-oversampled WaveShaper and preserve output gain. The deterministic normalized-tanh/full-wave blend is CarbonEngineJS behavior, not Wwise's proprietary transfer/Drive/Rectification law; authored Tone is retained but not applied. Exact oversampling, channel behavior, other distortion types, dynamic controls, and shared-Bus placement remain unsupported. Strict mode or missing primitives keeps the complete chain audible and dry. |
| Wwise Meter | Proven omission or opt-in approximation | Feedback-free telemetry is audio-transparent and allocates no node. `wwiseMeterFeedback: "omit-telemetry"` may also pass static Meter signal flow while omitting a Game Parameter output; downstream-volume Meter remains unsupported. |
| Qualified Sound `MaxNumInstances` | Corroborated browser adaptation | A v150 local-scope cap-one, reject-newest Sound subset reserves at an immediate Play boundary before media acquisition and releases at physical completion. Qualification requires effective Continue virtual behavior and excludes dynamic/random Priority, capped bus routes, delayed admission, and Crossfade prefetch. The packed local/global scope bit is corpus-corroborated pending a controlled golden pair; general Wwise arbitration remains unsupported. |
| Dynamic Audio Bus `MaxNumInstances` RTPC | Unsupported behavior with opt-in route admission | Static and dynamic bus limits, priority stealing, and virtual-voice policy are not enforced. `wwiseVoiceLimits: "ignore"` additionally admits separately classified dynamic RTPC paths without enforcing their changing count or eviction behavior; the default `"strict"` keeps those paths outside shared routing. |
| Proven-silent Aux return | Proven omission | A complete return at or below `-96 dB` is omitted; a narrowly qualified static SFX Aux shape is exact topology, and other wet paths remain barriers. |
| Rejected shared route | Fallback | SFX remains on its existing emitter/SFX destination and music remains on its legacy segment/instance/output path; authored blocked bus stages are omitted. |
| Master safety compressor | Browser workaround | A separate fixed Web Audio compressor (`-6 dB`, knee `6 dB`, `12:1`, `3 ms`, `250 ms`) limits all output when supported. It is not an authored Wwise effect; without the node capability output connects directly. |
| Spatial playback | Browser adaptation | `PannerNode` supplies HRTF direction with its native distance rolloff disabled. A retained Wwise dry-volume curve supplies each Sound leaf's distance gain in authored world units; emitter attenuation scaling evaluates that curve at `worldDistance / scalingFactor`. Old/custom graphs without a retained curve use the previous `distanceScale` inverse-gain fallback. The first pose is immediate; later pose and distance-gain changes use Web Audio target automation with a 5 ms time constant when available (about 95% settled in 15 ms). Legacy spatial setters and older AudioParam fallbacks remain immediate or use a short linear ramp. |
| Emitter level reporting | UI/debug approximation | `GetGameObjLevel()` samples 256-bin main-thread analyser frames and returns zero when analyser support is unavailable. It is not Wwise Meter telemetry. |
| Legacy library controls | Compatibility fallback | Older documents may use master/music RTPC gain fallbacks; current typed bus catalogs take precedence. |
| Missing optional Web Audio primitives | Capability fallback | Legacy LPF/HPF may be omitted without biquad support, level reporting becomes zero without an analyser, and the master safety compressor is absent without dynamics support. Shared graph qualification remains atomic. |
| Native device, input, profiler, and spatial geometry rendering | Unsupported barrier | Portable contracts may remain, but native device work, capture, input plug-ins, diffraction, occlusion, and middleware rendering are not emulated. |

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
- source-proven v150 Wwise Meter decoding with fail-closed omission limited to
  audio-transparent records that cannot write a Game Parameter or apply
  downstream volume; Meter telemetry itself remains unsupported;
- fail-closed omission of static user-aux returns only when their complete
  inactive-effect path and maximum installed gain remain at or below Wwise's
  `-96 dB` silence threshold;
- exact STMG State Group defaults and directed overrides, with immediate
  logical routing plus interruptible live Volume, Pitch, low-pass, and
  high-pass property interpolation;
- listener and emitter placement;
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
LPF/HPF and spread/focus curves, obstruction, occlusion, diffraction, and
transmission remain unsupported.

A Wwise Continuous Layer with no Layer records, or only Layer records with no
child associations, is represented by the portable parallel node because it
has no live child-admission region to evaluate. Its children retain independent
lifetime and Continuous Random/Sequence scheduling, and ancestor Layer/State
identities remain in leaf matching so authored Stops terminate the complete
group. This exact
bounded form covers five zero-record Hangar Layers and 22 association-free
ship-engine Layers in EVE build 3453885.

An associated Continuous Layer is admitted only when every direct child has an
explicit non-empty region and is proven infinite. Runtime-audio pre-starts
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
- Web Audio realization of spatial-audio geometry, occlusion, or diffraction
  (the portable data/settings/refcount contract is implemented for injected
  backends);
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
static, control-free Parametric EQ/Wwise Delay override is also adapted into
one voice-owned Web Audio chain before Voice filters and spatial/auxiliary
splitting. The first NodeBase override replaces inherited effects, including
an explicit empty clear. Mixed, dynamic, unsupported-plug-in, and
independent-LFE Sound effects remain documented dry-playback approximations.
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
reflections, and wet-path escapes all retain the barrier. Meter
telemetry remains unsupported.
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
concern, and `runtime-core` owns the planned preferences service for it.

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
