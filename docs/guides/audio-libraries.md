# Build and load audio libraries

Status: Evolving
Scope: `@carbonenginejs/tools-browser/audio`
Audience: Browser application authors and library publishers
Summary: Builds or loads the same schema-v2 audio-library document without requiring a Node service.

## Inputs

The builder accepts:

- audio metadata with `Events`, `SoundBanks`, and `WemFileIDs` sections;
- a resfileindex string, a `CjsFileIndex`, or structural index entries;
- optional source target, game, provider, build, and generation identity; and
- one injected bank capability when event/media extraction is requested.

Metadata sections may be ordinary objects or `Map` values. Richer
caller-supplied records are preserved as JSON-compatible data, while the
runtime-required event, bank, and media fields retain their canonical names.

The builder never discovers an installation, cache, endpoint, or credential.

## Import only the builder

A consumer that builds a library but plays it through its own audio stack should
import the builder entry rather than the family:

```js
import { CjsAudioLibraryBuilder } from "@carbonenginejs/tools-browser/audio/builder";
```

The family entry also exports `CjsAudioLibrary`, whose media resolution runs
through `@carbonenginejs/runtime-resource`. Importing the family therefore pulls
that consumption path into the dependency graph even when only the builder is
used, which a bundler reports as unresolved externals. The builder entry has no
such reach: it takes values in and returns a document.

## Build a source catalog

Use `build()` when the application needs indexed loose media and bank
identities without opening bank bytes:

```js
import {
    CjsAudioLibraryBuilder
} from "@carbonenginejs/tools-browser/audio";

const document = CjsAudioLibraryBuilder.build({
    metadata,
    indexEntries,
    sourceTarget: "eve",
    sourceGame: "Eve",
    sourceProvider: "ccp",
    sourceBuild: "3435006"
});
```

`soundbanksInfo` may be supplied instead of `metadata`. An optional
`enrichment` value merges additional event, bank, and media records.

## Build event and embedded-media tables

Use `buildFromBanks()` with exactly one bank access boundary:

```js
const document = await CjsAudioLibraryBuilder.buildFromBanks({
    metadata,
    indexEntries,
    language: "en-us",
    async loadBank(bank, { signal })
    {
        return resourceProvider.LoadBank(bank, { signal });
    }
});
```

`loadBank` may return bytes, `{ bytes }`, or `{ inspection }`. Returning an
inspection lets an application keep both downloading and CPU parsing in its
worker system. Without an injected `inspectBank`, raw bytes are inspected by
the browser-safe BNK reader on the calling thread.

`bankProvider.LoadBank()` or `bankProvider.Read()` may be supplied instead of
`loadBank`. Tests and applications with already loaded data may pass a
`bankData` object or `Map`.

Complete builds:

- validate the inspected `bankID:languageID` identity against metadata;
- resolve one explicit event-media language plus shared banks;
- retain loose media and add embedded byte-window descriptors;
- classify embedded WEM, MIDI, plugin, and unknown payloads when bytes are
  available; and
- optionally add the authored music graph with `music: true`.

## Load a prepared document

```js
import {
    CjsAudioLibrary
} from "@carbonenginejs/tools-browser/audio";

const library = await CjsAudioLibrary.load("/assets/audio_v2.json");
const document = library.GetDocument();
```

`load()` also accepts a plain document, JSON text, Response-like value, or
Blob/File-like value. HTTP compression is transparent when the server supplies
the correct content encoding. Local compressed files must be decompressed by
the caller before passing JSON text.

## Adapt resources to CjsResMan

Use an instance when callers need individual audio resources rather than only
the prepared document:

```js
import {
    CjsAudioLibrary
} from "@carbonenginejs/tools-browser/audio";
import {
    CjsResManFetchProvider
} from "@carbonenginejs/runtime-resource";

const audio = new CjsAudioLibrary({
    source: new CjsResManFetchProvider(),
    resManOptions: {
        paths: {
            aud: "https://audio.example.invalid/"
        }
    },
    defaultLanguage: "en-us",
    mediaTypes: [ "audio/ogg", "audio/x-wem" ],
    libraryResFilePath: "aud:/library.json"
});

await audio.Initialize();

const resource = audio.GetResByID(777);
const sameResource = audio.GetResByPath(resource.GetAudioInfo().path);
const result = await audio.GetBytesByID(777);
```

`GetResByID()` selects prepared, loose, or embedded records by accepted media
type, language, source rank, and stable source ID. `GetResByPath()` resolves an
exact registered path. Both return canonical `CjsAudioRes` handles; neither
method reads bytes.

Construction and `Register()` only accumulate configuration. The base input is
one of:

- `libraryResFilePath` or an already materialized `library` object; or
- `soundBankResPath` or a `soundBank` object, together with `indexEntries`.

Optional `enrichResPath` or `enrich` metadata applies after either base resolves.
Paths load through the configured CjsResMan resource queue. `buildOptions` may
request complete bank inspection, language selection, music construction, and
source identity without redefining the registered documents.
When using `CjsResManFetchProvider`, register each resource-prefix URL base
through `resManOptions.paths` or on an injected manager. Only `CjsResMan`
converts a canonical resource path into a URL; custom structural sources that
do not declare URL requirements continue to receive the normalized resource
path.

`Initialize(input)` also accepts a prepared document or `CjsAudioLibrary`, JSON
text, Blob/File-like value, Response-like value, URL, fallback array, or
structural builder options directly. Successful initialization permanently
locks configuration. Before it completes, resource and byte lookups throw
`CJS_AUDIO_LIBRARY_NOT_INITIALIZED`; lookups never initialize implicitly.

## Resource ingress

The configured source may provide one or more structural capabilities:

- `Read(path, options)` for ordinary loose files and complete banks;
- `ReadAudio(mediaID, context)` or `FetchAudio(path, record, context)` when an
  API already serves one split media item;
- `ReadRange(path, { offset, byteLength, ...options })` when a server supports
  byte-window reads; and
- matching `CreateAudioWorkerRequest` or `CreateRangeWorkerRequest` methods
  when those exact operations can be described to CjsResMan's worker loader.

An HTTP-style audio service can instead be described during registration:

```js
audio.Register({
    audioApiResPath: "aud:/",
    audioApiResPathSupportsIndividualFiles: true,
    audioApiResPathSupportsOffset: true
});
```

Individual-file support projects media to `id/<mediaID>`. Offset support can
project an embedded bank window to `path/<encoded-resource-path>` with a Range
request. These are declared transport capabilities, not proof that the browser
can decode the returned media.
Both projected paths are sent back through `CjsResMan`, so fetch providers
receive resolved URLs without the audio adapter duplicating path policy.

To verify delivery instead of trusting declarations, call the asynchronous
probe after initialization and before the first resource lookup:

```js
const capabilities = await audio.GetCapabilities({
    bank: "20:0"
});
```

The probe selects one media ID known to belong to the preferred bank and sends
the individual-ID and offset requests concurrently. When both succeed, their
lengths and bytes must match before either route is accepted. A caller may pass
an exact `mediaID` instead. Without an override, the library favors the bank
referenced by the most event media, then the bank with the most cataloged
members, and finally the smaller bank.

A range or split response still becomes an ordinary `CjsAudioRes`. With a
whole-bank source, one `CjsAudioBufferRes` owns the physical BNK payload and
every embedded child stores only its offset and length.

Both resource classes are owned and exported by
`@carbonenginejs/runtime-resource/resource/audio`; this package creates and registers
them according to the audio-library document and selected delivery route.

MP3, Ogg, WAV, and FLAC are retained as browser-native bytes. A private manager
registers only the BNK and WEM container formats needed by this adapter, while
an injected manager remains authoritative for additional format support. Media
decode and playback capability checks belong to runtime-audio and its backend.

## Retention

MotherLode remains a path/variant registry and CjsResMan remains the loading
and lifecycle coordinator. The audio adapter provides the relationship:

- a child `CjsAudioRes.Lock()` also locks its shared backing resource;
- `Unlock()` releases both locks;
- `KeepAlive()` renews both identities;
- `KeepPayloadAlive()` renews the physical payload lease; and
- `GetBytes()` takes a temporary lock and returns a detached copy of only the
  selected media window.

Consequently, retaining a child keeps the shared bank payload available, while
an unretained byte result cannot accidentally keep the complete bank alive.

## Runtime boundary

This package constructs and transports the document, selects browser delivery
representations, and adapts them to CjsResMan resources. Runtime audio owns
event interpretation, decoding, decoded-buffer policy, emitters, music
scheduling, and playback. Resource formats own BNK/WEM parsing and conversion.
Node tooling may wrap this builder with provider, cache, CLI, and server policy.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Browser tools API](../reference/api.md)
- [File-index guide](file-indexes.md)
