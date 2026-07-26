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

## Runtime boundary

This package constructs and transports the document. Runtime audio owns event
semantics, language/media selection, decoding, buffer retention, emitters,
music scheduling, and playback. Resource formats own BNK/WEM parsing and
conversion. Node tooling may wrap this builder with provider, cache, CLI, and
server policy.

## Related documentation

- [Architecture and boundaries](../architecture.md)
- [Browser tools API](../reference/api.md)
- [File-index guide](file-indexes.md)
