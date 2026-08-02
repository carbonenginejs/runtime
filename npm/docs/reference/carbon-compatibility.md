# Carbon audio compatibility

Status: Evolving  
Scope: `@carbonenginejs/runtime-audio/trinity`  
Audience: Runtime authors, content integrators, and maintainers  
Summary: Defines the maintained Carbon audio surface, adaptations, and intentionally unsupported native behavior.

## Contract

The `./trinity` entry owns the portable JavaScript form of Carbon audio schema
families `audio`, `trinityAudio`, and `trinityAudioApi`. Classes retain Carbon
field names, schema families, persistence metadata, and method provenance.

Portable behavior is implemented where it can be expressed without Wwise,
Python, an operating-system device manager, or a renderer. Browser realization
is supplied by the root package.

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
path claims native Wwise DSP equivalence. Voice-target placement across future
auxiliary sends, other effect processing and tails, meters, and virtual-voice
behavior remain deferred as described in the
[Wwise routing requirements](wwise-resource-routing-handoff.md).

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
- [Wwise routing support and remaining work](wwise-resource-routing-handoff.md)
