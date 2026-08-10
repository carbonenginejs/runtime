# Runtime audio API reference

Status: Experimental  
Scope: `@carbonenginejs/runtime-audio`  
Audience: Runtime authors and application integrators  
Summary: Lists public subpaths and the complete-document runtime contract.

## Import contract

All public entries are browser-safe ECMAScript modules. Importing them does not
create an audio context, fetch data, or touch the DOM.

| Import | Purpose |
| --- | --- |
| `@carbonenginejs/runtime-audio` | Complete graph, `CjsAudioMan`, lower-level system, backend, SFX interpreter, metadata adapter, authored music scheduler, and neutral jukebox. |
| `@carbonenginejs/runtime-audio/trinity` | Carbon audio graph and portable behavior without backend evaluation. |
| `@carbonenginejs/runtime-audio/audioMetadata` | `audioMetadataFromSoundbanksInfo()`. |
| `@carbonenginejs/runtime-audio/library` | Audio and neutral music-library validation and immutable installation. |
| `@carbonenginejs/runtime-audio/library-builder` | Optional construction from caller-supplied inputs. |

## Principal exports

| Export | Purpose |
| --- | --- |
| `CjsAudioMan` | Installs one document and owns selection, delivery, preparation, decode caches, desired bank state, listener/system lifecycle, and emitter adoption. |
| `CjsAudioSystem` | Lower-level Carbon repository, manager, backend, graph-adoption, and music composition. |
| `CjsAudioBackend` | Web Audio emitter, source, listener, gain, RTPC, switch, seek, fade, and completion realization. |
| `CjsSfxEngine` | Browser-safe authored random, step-sequence, continuous transition, switch/state, blend, and RTPC-gain interpretation. |
| `CjsMusicEngine` | Authored interactive-music scheduling. |
| `CjsJukebox` | Neutral browser playlist playback over caller-supplied catalog, acquisition, and availability functions. |
| `CjsAudioLibraryBuilder` | Deterministic document construction without input acquisition. |
| `installAudioLibraryDocument(value)` | Validates, detaches, and deeply freezes one document. |
| `validateAudioLibraryDocument(value)` | Validates the current schema-v2 contract. |
| `installMusicLibrary(value)` | Validates, detaches, and deeply freezes one optional jukebox catalog. |
| `validateMusicLibrary(value)` | Validates the current neutral music-library schema. |
| `validateSfxGraph(value, media, embeddedMedia)` | Validates one optional authored SFX program and its media references. |
| `normalizeSfxGraph(value, media, embeddedMedia)` | Produces deterministic builder output for one validated SFX program. |
| `audioMetadataFromSoundbanksInfo(document, enrichment)` | Maps supplied SoundbanksInfo and optional neutral enrichment to repository metadata. |

## Complete document

Only `schemaVersion: 2` is accepted:

```js
{
    schema: "carbonenginejs.audioLibrary",
    schemaVersion: 2,
    metadata: { Events: {}, SoundBanks: {}, WemFileIDs: {} },
    media: {},
    banks: {},
    embeddedMedia: {},
    eventMedia: {},
    eventMediaLanguage: "",
    sfx: undefined,
    music: undefined,
    busRtpcs: undefined,
    busStates: undefined,
    busDucking: undefined,
    busEffects: undefined,
    busGraph: undefined
}
```

`media` contains individual prepared or original source records.
`embeddedMedia` identifies an original bank plus `offset` and `byteLength`.
Every bank key and `sourceID` is its `bankID:languageID` identity.
When present, `sfx` selects and layers those media identities using the
version-2 portable SFX graph. A Sound may carry the sole supported scheduling
policy `voiceLimit: { counterId, scope: "game-object", maxInstances: 1,
behavior: "reject-newest" }`. The backend reserves it synchronously at an
immediate Play boundary, before media delivery, so pending acquisition counts.
Future Play/Initial Delay, Continuous Delay, and Crossfade-prefetch shapes are
omitted because Wwise admits them at their later playback boundary. The builder emits
the field only after qualifying inherited virtual behavior, effective
priority, and the complete bus route; arbitrary policies are rejected by
document validation rather than approximated.
When present, `busRtpcs` is a version-2 catalog keyed by bus ID. Each entry
retains named global Game Parameter curves for Voice Volume or Bus Volume as
raw Wwise scaling-2 values, including the authored parameter default, a
`property` tag, and ordered graph points. SFX evaluates both properties for
every bus in its dry ancestry, with Voice Volume on a distinct pre-bus gain;
built SFX `sound` nodes may additionally retain an ordered `sourceEffects`
array for the complete effective static Parametric EQ, Wwise Delay, or
qualified Wwise Compressor/Peak Limiter/Flanger/Tremolo override in their
NodeBase ancestry.
An explicit empty override clears the inherited list.
Those effects are voice-owned and precede Voice LPF/HPF and route splitting;
built-in music evaluates Bus Volume only from this Audio Bus catalog. A Music
Track's own qualified Voice Volume RTPC instead uses the independent pre-bus
track stage described in the music guide. Interpolation occurs before Wwise's
nonlinear dB conversion. Strict version-1 catalogs remain accepted as implicit
Bus Volume for installed-library compatibility.
When present, `busStates` is a version-2 multi-property catalog keyed by bus
ID. A named State case may carry `gainDb`, `pitchCents`, `lowPass`, and
`highPass` offsets under one atomic transition weight. The catalog retains the
authored synchronization type, route-qualified effective type, additive filter
behavior, and self-contained STMG directed/default transition table. SFX uses
all four properties; built-in music uses Bus Volume and filters because Wwise
Audio Bus Pitch deliberately does not affect Music objects. Matching groups on
unique dry-ancestry buses accumulate before final pitch/filter clamps. An unset
group or missing State case is neutral. Strict version-1 Bus Volume-only
catalogs remain accepted for installed-library compatibility.
When present, `busGraph` is the version-1 portable Wwise topology catalog. It
deduplicates dry and effective NodeBase auxiliary route signatures, maps SFX
Sound and music-track IDs to those routes, preserves reachable bus ancestry,
authored user/reflections sends, exact channel configuration, ordered effect
slots and bypass state, opaque parameter blocks, and plug-in media identities.
Dynamic send slots are marked explicitly as realization barriers.
`busVolumeMayIncrease` marks a reachable Bus that any retained absolute or
positive-relative Bus Volume Set action can amplify. The strict mixer combines
that action risk with the installed RTPC/State catalogs when proving that a
static Auxiliary Bus return can be omitted below Wwise's silence threshold.
`busVolumeActionControlled` separately marks every reachable Bus targeted by a
retained Set or Reset Bus Volume action. Audible shared effects remain blocked
on any such ancestry because a playing-instance or game-object action cannot
safely drive the physical fader shared by unrelated signals; otherwise it could
affect only new effect input while leaving an existing tail at the wrong gain.
The catalog is descriptive until a route is accepted by a qualified shared-bus
runtime. That runtime can decode qualified static Parametric EQ and Wwise Delay
records into ordered shared Web Audio stages. SFX also admits one static,
neutral-filter user send whose Auxiliary return rejoins the dry ancestry; it
evaluates additive State filters and Bus-target ducking independently across
the complete dry and wet legs. The catalog's presence alone does not make any
other auxiliary, dynamic, or nonlinear effect path audible.

## Delivery

`ResolveMedia()` and `LoadMedia()` accept:

- `delivery: "individual"` for one exact file;
- `delivery: "whole"` for one complete original bank and local slice;
- `delivery: "range"` for an exact original-bank byte window; or
- `delivery: "auto"` to choose from provider capabilities.

The manager also accepts language and media-type preferences. Concurrent
loads of one selected representation share work. A caller may pass
`signal`; cancellation releases only that caller's lease, and the provider
read is aborted once its final pending lease ends. Whole-bank reads share
the same lease model across embedded members. `ReleaseMedia()`,
`ClearMedia()`, and `ClearSourceData()` release retained state explicitly
without canceling active callers. Manager disposal and library/provider
replacement invalidate all pending acquisitions.

## Lifecycle

1. Construct with a document and provider, or call `InstallLibrary()`.
2. Call `Enable(soundBanks)` during a browser gesture.
3. Create/adopt emitters and drive `Process(updateContext)`.
4. Release emitters/media or call `Dispose()`.

The update context is optional. It may expose Carbon-style getters or
equivalent `time`, `realTime`, `deltaTime`, and `frame` properties. When it is
omitted, the system advances its own monotonic context. `Process()` returns the
normalized current context. Audio playback remains scheduled on the browser
`AudioContext` clock rather than host simulation or real time.

Constructor option `defaultSoundBanks` protects banks that should be present
whenever audio is enabled. Calls to `LoadSoundBank()` while disabled are
retained for the next successful `Enable()`. `Disable()` preserves the current
loaded/in-flight set, and `SwapSoundBanks()` reconciles non-default bank
intent without acquiring bytes. `SetGlobalRTPC()`, `SetState()`, and
`StopAllPlayingSounds()` keep a thin browser integration on `CjsAudioMan`.

Constructor option `wwiseDynamics` controls authored Wwise Compressor and Peak
Limiter admission to the shared-bus mixer and qualified source-local dynamics
chains:

- `"strict"` (default) rejects those effects from shared routing and omits a
  complete qualified source chain containing either effect. The voice remains
  audible through the legacy/dry route with the authored dynamics omitted.
- `"approximate-web-audio"` admits the documented static, linked subset through
  `DynamicsCompressorNode` plus compensation gain and optional limiter latency
  padding. Qualified source dynamics receive an equivalent browser stage per
  physical voice. This preserves topology, not Wwise DSP
  equivalence; missing browser dynamics primitives retain dry SFX playback.

Any other value throws synchronously. `CjsAudioSystem` accepts the same option
for lower-level composition. The mode is host runtime policy and is not stored
in the portable audio-library document.

Constructor option `wwiseModulation` independently controls qualified
source-local Wwise Flanger and Tremolo records:

- `"strict"` (default) omits the complete source chain and keeps the voice
  audible/dry.
- `"approximate-web-audio"` realizes the documented static sine/zero-phase
  subsets with voice-owned Gain, optional Delay, and optional Oscillator nodes.
  Missing required primitives keep the complete chain dry.

The portable records retain authored Flanger/Tremolo parameters and channel
flags. The browser graphs are all-channel modulation approximations, not Wwise
DSP. The Tremolo record is an explicitly empirical EVE-v150 38-byte layout;
pinned wwiser identifies its plug-in but does not decode those parameters.
Any other value throws synchronously, and `CjsAudioSystem` accepts the same
option.

Two further host policies control shared-route admission through explicit
omissions:

- `wwiseMeterFeedback: "omit-telemetry"` admits a static v150 Meter with a
  Game Parameter target only when downstream-volume application is disabled.
  The signal path is transparent, but the Meter value is not produced and any
  authored feedback through that Game Parameter is absent. The default is
  `"strict"`.
- `wwiseVoiceLimits: "ignore"` admits a route whose only separately classified
  scheduling barrier is a dynamic Audio Bus `MaxNumInstances` RTPC. The browser
  does not enforce its changing voice-count limit or eviction behavior. The
  default is `"strict"`.

These policies are independent of `wwiseDynamics` and `wwiseModulation`, are validated
synchronously, and are passed through by both `CjsAudioMan` and
`CjsAudioSystem`.

Constructor options `musicLibrary`, `loadMusicTrack`, and
`isMusicTrackAvailable` opt into `audio.jukebox`. Runtime-audio never fetches
song `url` or `path` hints itself. `RefreshAvailability()` plus
`GetPlaylistSongs({ includeUnavailable })` lets a UI hide or disable
unreachable songs.

### Authored-music browser transport

`CjsMusicEngine` exposes an optional integration transport over an active
playing ID:

- `GetTransportCapabilities(playingID)` reports pause/resume and whether the
  resolved graph has multiple Music Segments or Random/Sequence subtracks;
  its `preparing` flag covers a retained item being loaded for resume;
- `PauseTransport(playingID, fadeOutDuration)` soft-fades over the optional
  duration in milliseconds, and `ResumeTransport(playingID)` retains the
  current authored item;
- `StepTransport(playingID, direction)` chooses the adjacent internal item;
  and
- `RandomTransport(playingID)` chooses another internal item.

The mutation methods return `true` when the playing ID accepted the requested
operation and `false` when it had no applicable live authored item.

This is a CarbonEngineJS browser extension for applications and the package
demo, not an authored Wwise action contract. Web Audio buffer sources cannot
resume after stopping, so pause and item selection use a short fade and replay
the selected item from its entry cue. Exact decoded-media position is not
retained. Layered selectable tracks use a bounded coordinated traversal instead
of enumerating their Cartesian product. Normal automatic playlist traversal
and independent Wwise track selection remain authored, but manual selection
starts a fresh playlist traversal and therefore resets playlist random/shuffle
history. A selected Sequence Music Track continues at its following subtrack.

## Builder

`CjsAudioLibraryBuilder` accepts caller-supplied `indexEntries`,
`soundbanksInfo` or metadata, optional `enrichment`, optional `sfx`, and
optional `loadBank`.
It performs no fetch, file-index discovery, cache access, or Node filesystem
work. With `includeSfx: true`, inspected version-150 banks may also contribute
a conservative authored SFX graph, exact typed-graph `eventMedia`
reachability, and sparse inherited `is2D` event metadata; caller metadata and
enrichment retain final precedence. With `music: true`, the two authored music
banks contribute the decoded music hierarchy while typed event actions are
projected from every selected bank. Projection follows music targets and
argument groups rather than bank-name or event-name conventions.

## Errors

| Failure | Meaning |
| --- | --- |
| `InstallLibrary()` throws | The value is not the current complete schema-v2 document. |
| `Enable()` returns `false` | No usable browser backend context was created. |
| Posting returns playing ID `0` | The event is queued, culled, unknown, blocked on banks, or unavailable. |
| `ResolveMedia()` throws | No acceptable representation/provider route exists. |
| `LoadMedia()` rejects | Acquisition, range validation, preparation, or decoding failed. |

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Browser playback guide](../guides/browser-playback.md)
- [Authored SFX programs](../guides/sfx.md)
- [Optional jukebox](../guides/jukebox.md)
- [Carbon compatibility](carbon-compatibility.md)
