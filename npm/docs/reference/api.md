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
    busStates: undefined
}
```

`media` contains individual prepared or original source records.
`embeddedMedia` identifies an original bank plus `offset` and `byteLength`.
Every bank key and `sourceID` is its `bankID:languageID` identity.
When present, `sfx` selects and layers those media identities using the
version-2 portable SFX graph.
When present, `busRtpcs` is a version-1 catalog keyed by bus ID. Each entry
retains named global Game Parameter curves for Bus Volume as raw Wwise
scaling-2 values, including the authored parameter default and ordered graph
points. SFX and built-in music routes evaluate curves for every bus in their
dry ancestry; interpolation occurs before Wwise's nonlinear dB conversion.
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

Constructor options `musicLibrary`, `loadMusicTrack`, and
`isMusicTrackAvailable` opt into `audio.jukebox`. Runtime-audio never fetches
song `url` or `path` hints itself. `RefreshAvailability()` plus
`GetPlaylistSongs({ includeUnavailable })` lets a UI hide or disable
unreachable songs.

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
