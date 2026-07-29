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
| `@carbonenginejs/runtime-audio` | Complete graph, `CjsAudioMan`, lower-level system, backend, metadata adapter, and music scheduler. |
| `@carbonenginejs/runtime-audio/trinity` | Carbon audio graph and portable behavior without backend evaluation. |
| `@carbonenginejs/runtime-audio/audioMetadata` | `audioMetadataFromSoundbanksInfo()`. |
| `@carbonenginejs/runtime-audio/library` | Schema-v2 validation and immutable installation. |
| `@carbonenginejs/runtime-audio/library-builder` | Optional construction from caller-supplied inputs. |

## Principal exports

| Export | Purpose |
| --- | --- |
| `CjsAudioMan` | Installs one document and owns selection, delivery, preparation, decode caches, system lifecycle, and emitter adoption. |
| `CjsAudioSystem` | Lower-level Carbon repository, manager, backend, graph-adoption, and music composition. |
| `CjsAudioBackend` | Web Audio emitter, source, listener, gain, RTPC, switch, seek, fade, and completion realization. |
| `CjsMusicEngine` | Authored interactive-music scheduling. |
| `CjsAudioLibraryBuilder` | Deterministic document construction without input acquisition. |
| `installAudioLibraryDocument(value)` | Validates, detaches, and deeply freezes one document. |
| `validateAudioLibraryDocument(value)` | Validates the current schema-v2 contract. |
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
    music: undefined
}
```

`media` contains individual prepared or original source records.
`embeddedMedia` identifies an original bank plus `offset` and `byteLength`.
Every bank key and `sourceID` is its `bankID:languageID` identity.

## Delivery

`ResolveMedia()` and `LoadMedia()` accept:

- `delivery: "individual"` for one exact file;
- `delivery: "whole"` for one complete original bank and local slice;
- `delivery: "range"` for an exact original-bank byte window; or
- `delivery: "auto"` to choose from provider capabilities.

The manager also accepts language and media-type preferences. Concurrent
loads of one selected representation share work. `ReleaseMedia()`,
`ClearMedia()`, and `ClearSourceData()` release retained state explicitly.

## Lifecycle

1. Construct with a document and provider, or call `InstallLibrary()`.
2. Call `Enable(soundBanks)` during a browser gesture.
3. Create/adopt emitters and drive `Process(now)`.
4. Release emitters/media or call `Dispose()`.

## Builder

`CjsAudioLibraryBuilder` accepts caller-supplied `indexEntries`,
`soundbanksInfo` or metadata, optional `enrichment`, and optional `loadBank`.
It performs no fetch, file-index discovery, cache access, or Node filesystem
work.

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
- [Carbon compatibility](carbon-compatibility.md)
