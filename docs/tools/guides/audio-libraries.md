# Acquire remote audio-library data

Status: Evolving
Scope: `@carbonenginejs/runtime/tools/audio`
Audience: Browser application authors
Summary: Reads complete documents, caller-selected builder inputs, files, and exact ranges without owning runtime audio semantics.

## Boundary

`CjsRemoteAudioLibrary` is a small browser remote-acquisition client. It does not
build a library, select event media, decode WEM, cache decoded buffers, or
adapt audio into a resource manager.

Use:

- `@carbonenginejs/runtime/audio` to install and consume a complete document;
- `@carbonenginejs/runtime/audio/library-builder` to construct one from
  caller-supplied values; and
- `@carbonenginejs/tools-core` for exact-build cache, provider, CLI, and HTTP
  service policy.

## Read a complete document

```js
import {
    CjsRemoteAudioLibrary
} from "@carbonenginejs/runtime/tools/audio";
import {
    CjsAudioMan
} from "@carbonenginejs/runtime/audio";

const remote = new CjsRemoteAudioLibrary();
const document = await remote.ReadDocument(
    "https://example.invalid/eve/3435006/audio/library"
);
const audio = new CjsAudioMan(document, {
    mediaProvider: remote
});
```

`ReadDocument()` accepts a plain object, JSON string, Response/Blob-like value,
HTTP(S) URL, or a logical path resolved through an injected remote file index.
It returns the detached immutable schema-v2 document installed by
runtime-audio's canonical validator.

## Supply optional builder inputs

The remote client can package caller-selected inputs for the optional runtime
builder:

```js
import {
    CjsAudioLibraryBuilder
} from "@carbonenginejs/runtime/audio/library-builder";

const inputs = await remote.GetBuilderInputs({
    soundbanksInfo: "res:/audio/soundbanksinfo.json",
    enrichment: neutralEnrichmentObject
});

const document = await CjsAudioLibraryBuilder.buildFromBanks({
    ...inputs,
    loadBank: remote.CreateBankLoader(),
    language: "en-us",
    music: true
});
```

The caller chooses and acquires SoundbanksInfo and optional enrichment. The
enrichment payload is an ordinary object with optional `Events`,
`SoundBanks`, and `WemFileIDs` maps; this package does not name or acquire a
private source for it.

`GetAudioIndexEntries()` projects loaded remote resfileindex layers into plain
builder-ready rows. `GetBuilderInputs()` may instead receive explicit
`indexEntries`.

## Use as a runtime provider

`CjsRemoteAudioLibrary` structurally implements:

- `Read(record)` for an individual file or complete original bank; and
- `ReadRange(record, { offset, byteLength })` for an exact bank window.

An HTTP 206 response is returned as the requested range. An HTTP 200 response
is marked complete so `CjsAudioMan` can safely slice the original file
locally.

The source record may contain an explicit HTTP(S) `url`/`sourceURL`, or a
logical `resPath`/`logicalPath`/`path` resolved through the injected
`CjsFileIndexLibrary`.

## Related documentation

- [Browser tools API](../reference/api.md)
- [Audio class catalog](../reference/classes/audio.md)
- Runtime contract:
  [audio-manager concept](../../audio/concepts/audio-manager.md)
