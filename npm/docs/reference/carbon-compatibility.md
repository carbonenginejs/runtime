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
| Parametric EQ and Wwise Delay | Browser adaptation | Source-proven parameters, bus placement, and slot order are retained; Web Audio biquad/delay DSP is not bit-equivalent to Wwise. |
| Wwise Compressor and Peak Limiter | Opt-in approximation | `wwiseDynamics: "approximate-web-audio"` admits only static, linked, all-channel records. The default `"strict"` policy keeps them out of the shared mixer and uses the legacy audible fallback. |
| Feedback-free Wwise Meter | Proven omission | Telemetry with no Game Parameter output or downstream-volume observation is audio-transparent and allocates no node. Feedback-capable Meter remains unsupported. |
| Proven-silent Aux return | Proven omission | A complete return at or below `-96 dB` is omitted; a narrowly qualified static SFX Aux shape is exact topology, and other wet paths remain barriers. |
| Rejected shared route | Fallback | SFX remains on its existing emitter/SFX destination and music remains on its legacy segment/instance/output path; authored blocked bus stages are omitted. |
| Master safety compressor | Browser workaround | A separate fixed Web Audio compressor (`-6 dB`, knee `6 dB`, `12:1`, `3 ms`, `250 ms`) limits all output when supported. It is not an authored Wwise effect; without the node capability output connects directly. |
| Spatial playback | Browser adaptation | `PannerNode` uses HRTF and inverse distance. `distanceScale` converts application world units and emitter attenuation scaling supplies `refDistance`. |
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
- ordered object/global Set and Reset Game Parameter actions with absolute or
  relative values, randomized delays, Wwise transition curves, persistent
  timelines, capture-time ordering, and live gain, pitch, and filter updates;
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

Carbon receives complete authored attenuation data. A portable schema-v2
library may omit the optional per-event culling enrichment; in that case a
nonpositive attenuation radius is treated as unknown/unbounded so the event
remains playable. Positive authored radii retain Carbon's squared-distance
culling behavior.

## Unsupported native behavior

The package does not emulate:

- Wwise device enumeration or device-change callbacks;
- Wwise profiler capture;
- Web Audio realization of spatial-audio geometry, occlusion, or diffraction
  (the portable data/settings/refcount contract is implemented for injected
  backends);
- native audio-input plugins;
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
path claims native Wwise DSP equivalence. Static Wwise Delay likewise uses
source-proven v150 fields and one shared Web Audio delay/feedback stage; it has
no distributed per-source fallback. Bus ancestries targeted by retained Set or
Reset Bus Volume actions stay blocked across audible effects because their
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
paths. Unsupported RTPC bindings, route-local controls crossing an audible shared effect,
other audible auxiliary sends, other effect processing
and tails, feedback-capable meters, and virtual-voice behavior remain deferred
as described in the
[Wwise routing requirements](wwise-resource-routing.md).

Unsupported Carbon methods remain visible with explicit implementation
metadata where their schema surface is maintained.

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
