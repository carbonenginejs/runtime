# Runtime audio API reference

Status: Experimental  
Scope: `@carbonenginejs/runtime/audio`
Audience: Runtime authors and application integrators  
Summary: Lists public subpaths and the complete-document runtime contract.

## Import contract

All public entries are browser-safe ECMAScript modules. Importing them does not
create an audio context, fetch data, or touch the DOM.

| Import | Purpose |
| --- | --- |
| `@carbonenginejs/runtime/audio` | Complete graph, `CjsAudioMan`, lower-level system, backend, SFX interpreter, metadata adapter, authored music scheduler, and neutral jukebox. |
| `@carbonenginejs/runtime/audio/trinity` | Carbon audio graph and portable behavior without backend evaluation. |
| `@carbonenginejs/runtime/audio/audioMetadata` | `audioMetadataFromSoundbanksInfo()`. |
| `@carbonenginejs/runtime/audio/library` | Audio-library hydration/loading plus audio and neutral music-library validation and detached installation. |
| `@carbonenginejs/runtime/audio/library-builder` | Construction from decoded values or explicit raw resources. |

## Principal exports

| Export | Purpose |
| --- | --- |
| `CjsAudioMan` | Installs one document and owns selection, delivery, preparation, decode caches, desired bank state, listener/system lifecycle, and emitter adoption. |
| `CjsAudioSystem` | Lower-level Carbon repository, manager, backend, graph-adoption, and music composition. |
| `CjsAudioBackend` | Web Audio emitter, source, listener, gain, RTPC, switch, seek, fade, and completion realization. |
| `CjsSfxEngine` | Browser-safe authored random, step-sequence, continuous transition, switch/state, blend, and RTPC-gain interpretation. |
| `CjsMusicEngine` | Authored interactive-music scheduling. |
| `CjsJukebox` | Neutral browser playlist playback over caller-supplied catalog, acquisition, and availability functions. |
| `CjsAudioLibrary` | Hydrated library; `from(values)`, `load(pathOrBytes, options)`, and `GetValues()` bridge prepared JSON/gzip and runtime use. |
| `CjsAudioLibraryBuilder` | Deterministic construction from supplied values, fetch, or an injected byte source. |
| `installAudioLibraryDocument(value)` | Validates and detaches one document. |
| `validateAudioLibraryDocument(value)` | Validates the current schema-v2 contract. |
| `installMusicLibrary(value)` | Validates and detaches one optional jukebox catalog. |
| `validateMusicLibrary(value)` | Validates the current neutral music-library schema. |
| `validateSfxGraph(value, media, embeddedMedia)` | Validates one optional authored SFX program and its media references. |
| `normalizeSfxGraph(value, media, embeddedMedia)` | Produces deterministic builder output for one validated SFX program. |
| `audioMetadataFromSoundbanksInfo(document, enrichment)` | Maps supplied SoundbanksInfo and optional neutral enrichment to repository metadata. |

### Caller-supplied obstruction and occlusion

`AudManager` implements Carbon's headless line-of-sight lifecycle. The host
computes blockage; the audio layer performs no ray casting.

- `SetEmitterLineOfSightBlockage(emitterID, blockage)` accepts a registered,
  non-listener emitter while audio and the subsystem are enabled;
- `GetEmitterOcclusion(emitterID)` returns the live mid-fade value;
- `ClearObstructionOcclusion()` fades every tracked emitter to clear;
- `Get/SetObstructionOcclusionEnabled()` controls new inputs and clears targets
  when disabled; and
- `Get/SetObstructionOcclusionFadeRate()` reads or changes the default
  one-unit-per-second linear fade rate. Zero is instantaneous.

An injected backend may implement
`SetObjectObstructionAndOcclusion(emitterID, listenerID, obstruction,
occlusion)`. Explicit `false` requests a retry on the next `Process()`; a void
return accepts the update. `CjsAudioBackend` accepts the fixed listener ID `4`
and registered emitter IDs. It keeps strict playback dry by default or applies
the explicitly selected browser approximation described below.

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
array for the complete effective Parametric EQ, Wwise Delay, or
qualified Wwise Compressor/Peak Limiter/Flanger/Tremolo/Guitar
Distortion/Matrix Reverb/RoomVerb override in their
NodeBase ancestry.
An explicit empty override clears the inherited list.
Those effects are voice-owned and precede Voice LPF/HPF and route splitting.
Parametric EQ and qualified Tremolo records may carry `rtpcCurves`. A qualified
Flanger may instead carry one `wetDryMixRtpcCurve` whose
`controlSource: "built-in-distance"` prevents it from being mistaken for a
user-settable RTPC. EQ emits
the exact EVE-v150 Game Parameter `ParamID 2` form: object-scoped
`ship_Roll`, exclusive accumulation, scaling 3, Band 1 `frequencyHz`, an STMG
default, and ordered Wwise curve points. Playback reads object RTPC, global
RTPC, then the retained default; converts the curve output with `10 ** value`;
and schedules the bound biquad over known transition boundaries. This
corpus-derived numeric mapping is not a general Wwise plug-in enum. Other
dynamic EQ properties and Wwise Modulator controls remain unsupported.
The common bounded Tremolo form carries paired `modulationDepthPercent` and
`modulationFrequencyHz` targets plus one shared `controlTransition`. The
current EVE shape requires `booster_intensity`, additive scaling-0 `ParamID 1`,
exclusive scaling-3 `ParamID 2`, and two-second STMG Filtering Over Time in
both directions. Playback approximates that filter independently per voice
before evaluating both curves and schedules the oscillator and unipolar gain
terms. A newly posted voice starts from the current readable control; it does
not inherit another voice's earlier filter history. One separate exact
single-Depth EVE-v150 preset is also supported, retaining static `0.24 Hz`
Frequency; its fingerprint and approximation limits are recorded under
[routing support](wwise-resource-routing.md#remaining-work).
Other dynamic Tremolo forms remain unsupported.
This filtering is carried by the qualified Tremolo curves, not yet by the
generic Game Parameter store. Existing live EQ and Guitar Distortion bindings
therefore retain their documented explicit-action/boundary scheduling unless
their own qualified curve projection supplies a transition policy.
`processLfe:false` source EQ is realized only for decoded mono/stereo buffers;
multichannel voices keep the complete source chain audible and dry.
A low-level voice descriptor carrying `rtpcCurves` without its corresponding
`getSourceEffectRtpc` reader also keeps the complete chain dry.
Built Matrix Reverb records remain dry by default. Hosts may select
`wwiseReverb: "approximate-web-audio"` on `CjsAudioMan`, `CjsAudioSystem`, or
`CjsAudioBackend` to realize the documented bounded source-local browser
adapter. Built RoomVerb records use the independent `wwiseRoomVerb` policy
described below. Neither policy is forwarded to the shared Bus mixer. Built-in music
evaluates Bus Volume only from this Audio Bus catalog. A Music
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

The structural provider receives exact document records, not filenames or
URLs as canonical Wwise media identities:

```js
{
    Read(sourceRecord, { signal, kind, mediaID, ...context }),
    ReadRange?(bankRecord, { offset, byteLength, signal }),
    CanRead?(sourceRecord, context),
    CanReadRange?(bankRecord, context)
}
```

`Read` accepts individual records or a whole original bank for local
`offset..offset+byteLength` slicing. It may return bytes,
`{ bytes, mediaType }`, an `AudioBuffer`, or PCM channel data.
`ReadRange` returns exact HTTP-206 bytes, or a complete original file marked
`complete: true` for local slicing. Buffer playback is not long-form streaming.

Language and media-type preferences select representations. Concurrent
`LoadMedia(mediaID, { signal })` callers share acquisition but hold independently
abortable leases: the provider receives a runtime-owned signal, aborted only
when its final pending lease ends. The orphaned operation is evicted for
immediate retry. Whole-bank reads use the same rule across embedded members.
An authored `break` keeps pending one-shot acquisition alive to finish naturally;
`stop`, emitter release, `StopAllPlayingSounds()`, and disposal cancel pending SFX.

`ReleaseMedia()` releases one media identity, `ClearMedia()` all decoded buffers,
and `ClearSourceData()` whole-bank bytes, without canceling active callers.
Disposal or library/provider replacement invalidates and aborts all old
pending acquisitions. Effective provider, delivery-mode, and language changes
clear both decoded-media and built-in music retained-media caches.

## Lifecycle

1. Construct with a document and provider, or call `InstallLibrary()`.
2. Call `Enable(soundBanks)` during a browser gesture.
3. Create/adopt emitters and drive `Process(updateContext)`.
4. Release emitters/media or call `Dispose()`.

The manager also follows the character library manager's loading shape.
Constructor option `resourceLoader` or `SetResourceLoader(loader)` supplies
structural
normalized-path to parsed-values loading. `LoadLibrary(path)` installs
synchronously; `LoadLibraryAsync(path)` deduplicates equivalent in-flight paths
and resolves `false` if a later install supersedes it.
`BuildLibraryFromResources(options)` builds and installs through the domain
builder, defaulting its byte source to the media provider's `Read`. Prepared
documents remain faster than client-side metadata/bank decoding.

The update context is optional. It may expose Carbon-style getters or
equivalent `time`, `realTime`, `deltaTime`, and `frame` properties. When it is
omitted, the system advances its own monotonic context. `Process()` returns the
normalized current context. Audio playback remains scheduled on the browser
`AudioContext` clock rather than host simulation or real time.

Constructor option `defaultSoundBanks` protects banks that should be present
whenever audio is enabled. Calls to `LoadSoundBank()` while disabled are
retained for the next successful `Enable()`. `Disable()` preserves the current
loaded/in-flight set, and `SwapSoundBanks()` reconciles non-default bank
intent without acquiring bytes. The bank-intent facade includes
`LoadSoundBank(s)`, `UnloadSoundBank(s)`, `SwapSoundBanks()`,
`ReloadSoundBanks()`, and protected default-bank helpers, with race-safe async
bank callbacks. These methods change runtime intent only, never acquire library
or media data. `SetGlobalRTPC()`, `SetState()`, and `StopAllPlayingSounds()`
keep a thin integration on `CjsAudioMan`.

### Effect policies

These independent constructor options are accepted by `CjsAudioMan` and
passed through by `CjsAudioSystem`. Each defaults to `"strict"`; any value
other than that default or the listed opt-in throws synchronously. Admission
is bounded by the [compatibility ledger](carbon-compatibility.md#compatibility-ledger),
not a claim of Wwise DSP equivalence.

| Option | Opt-in value | Admission scope | Strict outcome |
| --- | --- | --- | --- |
| `wwiseDynamics` | `"approximate-web-audio"` | Qualified static linked Compressor/Peak Limiter, shared-bus and source-local. | Shared routing blocked; complete source chain omitted, voice audible/dry. |
| `wwiseModulation` | `"approximate-web-audio"` | Qualified source-local Flanger/Tremolo static and bounded dynamic forms. | Complete source chain audible/dry. |
| `wwiseReverb` | `"approximate-web-audio"` | Qualified source-local Matrix Reverb default-delay subset. | Complete source chain audible/dry. |
| `wwiseRoomVerb` | `"approximate-web-audio"` | Qualified source-local static EVE-v150 RoomVerb. | Complete source chain audible/dry. |
| `wwiseDistortion` | `"approximate-web-audio"` | Qualified fully-wet EVE-v150 Guitar Distortion, including its exact Drive RTPC form. | Complete source chain audible/dry. |
| `wwiseObstructionOcclusion` | `"approximate-web-audio"` | Fixed browser blockage response on emitter routes. | Backend accepts updates without DSP; manager clamp/fade/cull/wake/retry/clear/geometry-suppression behavior remains active. |
| `wwiseMeterFeedback` | `"omit-telemetry"` | Static v150 target-bearing Meter on a shared Bus or complete source chain; no Game Parameter feedback produced. | Shared route blocked or complete source chain audible/dry. |
| `wwiseVoiceLimits` | `"ignore"` | Route whose only separately classified scheduling barrier is a dynamic Audio Bus `MaxNumInstances` RTPC; count/eviction remains unenforced. | Route remains outside shared routing. |

The `wwiseDynamics` mode is host runtime policy, not stored in the portable
audio-library document. Missing browser primitives retain the documented dry
fallbacks; enabling one policy does not enable the others.

Constructor options `musicLibrary`, `loadMusicTrack`, and
`isMusicTrackAvailable` opt into `audio.jukebox`. The audio layer never fetches
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

This application/demo transport is a CarbonEngineJS extension, not a Wwise
action. Stopped Web Audio sources cannot resume: pause/item selection uses a
short fade and replays from the entry cue, without retaining exact media
position. Layered tracks use bounded coordinated traversal, not a Cartesian
product. Automatic playlist/track choices remain authored; manual selection
resets playlist random/shuffle history, while a selected Sequence Music Track
continues at its following subtrack. See [Music](../guides/music.md#demo-examples).

## Builder

The caller may import/download a complete artifact, receive it from an API,
load plain or gzip JSON with `CjsAudioLibrary.load()`, or build it below.
The manager never discovers builder inputs; an optional `sfx` program is
consumed after installation regardless of document origin. Tools-core can
supply validated local/cache bytes through the same source seam and persist
`library.GetValues()`.

`CjsAudioLibraryBuilder.build()` accepts caller-supplied `indexEntries`,
`soundbanksInfo` or metadata, optional `enrichment`, and optional `sfx`.
`buildFromBanks()` adds caller-supplied bank access. `buildFromResources()`
loads the index when needed, modern cFSD audio metadata, optional
SoundbanksInfo, and indexed banks through fetch by default or a structural
`source.read(path, context)` capability. Fetch callers provide `baseUrl` or
`resolveUrl` for `res:/` paths. The resource path returns a hydrated
`CjsAudioLibrary`; `build()` and `buildFromBanks()` retain their plain-document
return contract. `inspectBanks: false` returns the cFSD/SoundbanksInfo catalog
without opening bank bytes; graph extraction opts into bank inspection.

Each located resource has an optional path override, and a value option that
supplies the decoded input and skips its read entirely:

| Input | Path option (default) | Value option |
| --- | --- | --- |
| audio metadata FSD | `audioMetadataPath` (`res:/staticdata/audiometadata.fsdbinary`) | `metadata` |
| resource index | `indexPath` (none — the index is optional) | `indexEntries` |
| SoundbanksInfo | `soundbanksInfoPath` (`res:/audio/soundbanksinfo.json` without an index; discovered from the index otherwise) | `soundbanksInfo` |

The index is optional: without one, every input sits at a default resource
path, and bank and streamed-media discovery derives from SoundbanksInfo with
the metadata `WemFileIDs` `IsEssential` flag selecting each loose file's
`media/` or `essential_media/` directory — validated exact against a shipped
resfileindex. An index still contributes what only it has: storage paths,
checksums, and byte lengths.

The metadata default is the reader's own schema-declared location, and the
FSD is decoded under that canonical logical path regardless of where the
bytes were read from; a path override changes only what is asked of the byte
source, whose read context still carries the `logicalPath` identity.

The builder does no installation discovery, provider selection, cache access,
or Node filesystem work. `fsdOptions: { bitWidth: 32 }` identifies legacy FSD
through the normal format pipeline and currently throws the explicit
unsupported-reader error. With `includeSfx: true`, inspected version-150 banks may also contribute
a conservative authored SFX graph, exact typed-graph `eventMedia`
reachability, and sparse inherited `is2D` event metadata; caller metadata and
enrichment retain final precedence. With `music: true`, the two authored music
banks contribute the decoded music hierarchy while typed event actions are
projected from every selected bank. Projection follows music targets and
argument groups rather than bank-name or event-name conventions.

Qualified bank-authored music Pause/Resume actions live in the ordered
`music.programs` table. `CjsMusicEngine.PostEvent()` applies their game-object
scope and target matching, nested depth, transition duration, and Wwise curve.
Pause freezes at fade completion; Resume retains clip offsets, delayed layers,
playlist state, and pinned pending preparation. Element actions are admitted
only for postable music roots. Target-zero all/game-object actions also remain
in the SFX program so the backend dispatches the one authored Event across
both domains. This is distinct from the entry-cue-replay browser transport
described above.

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
