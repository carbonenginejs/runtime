# @carbonenginejs/tools-browser

Browser-facing CarbonEngineJS clients, remote readers, and application tools.

Use this package when a useful browser implementation does not belong in a
runtime library. Shared primitives remain in `@carbonenginejs/runtime-utils`;
audio graph semantics and resource formats remain in their owning runtime
packages. Node acquisition, servers, credentials, and persistent caches remain
in `@carbonenginejs/tools-core`.

The package remains private while its dependency and consumer migrations are
completed.

## Install

Registry installation is intentionally unavailable during the private
bootstrap. After its release:

```sh
npm install @carbonenginejs/tools-browser
```

## Quick start

Parse caller-supplied file-index text without filesystem access:

```js
import {
    CjsFileIndex
} from "@carbonenginejs/tools-browser/fileindex";

const index = CjsFileIndex.parseResFileIndex(
    "res:/graphics/example.red,objects/example.red"
);
const entry = index.Find("res:/graphics/example.red");

console.log(entry.location);
```

Build or load a schema-v2 audio library without a Node service:

```js
import {
    CjsAudioLibrary
} from "@carbonenginejs/tools-browser/audio";

const library = await CjsAudioLibrary.buildFromBanks({
    metadata,
    indexEntries,
    loadBank
});

const audioLibraryDocument = library.GetDocument();
```

`metadata` may use plain objects or `Map` sections. Bank acquisition is an
injected capability, so an application may use worker-backed resource loading,
an API, or caller-selected local data without changing the library builder.

Adapt a prepared document to an existing resource manager, or let the library
create an audio-only manager:

```js
import {
    CjsResManFetchProvider
} from "@carbonenginejs/runtime-resource";

const audio = new CjsAudioLibrary({
    source: new CjsResManFetchProvider(),
    resManOptions: {
        paths: {
            aud: "https://audio.example.invalid/",
            res: "https://resources.example.invalid/"
        }
    },
    libraryResFilePath: "aud:/library.json",
    enrichResPath: "res:/audio/enrich.json"
});

await audio.Initialize();

const capabilities = await audio.GetCapabilities({
    bank: "20:0"
});
const resource = audio.GetResByID(777);
const { bytes, mediaType, metadata } = await resource.GetBytes();
```

`library` and `enrich` accept already materialized JavaScript objects instead.
To build in the browser, register `soundBank` or `soundBankResPath` together
with `indexEntries`; enrichment applies over either a loaded or built base.
Successful initialization locks the configuration.
`GetCapabilities()` is asynchronous and should run before the first resource
lookup. It probes individual-file and offset delivery concurrently with one
known bank member; pass a preferred bank or media ID when the service's common
bank is known.
`CjsResMan` alone maps canonical resource paths to URLs. URL-backed providers
receive that resolved URL, while custom structural sources continue to receive
the normalized resource path. An injected manager must register the same
prefix mappings itself.

`GetResByPath()` returns the same canonical `CjsAudioRes` when the path and ID
select the same representation. Embedded resources share one bank backing and
delegate `Lock()` / `Unlock()` to that backing.
Both resource-owner classes come from
`@carbonenginejs/runtime-resource/resource/audio`; this package owns their library
registration and delivery-route projection.

The root export is available when an application consumes several tool
families. Targeted `./audio`, `./chat`, `./fileindex`, and `./realtime` imports
remain available.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Audio-library guide](docs/guides/audio-libraries.md)
- [Chat guide](docs/guides/chat.md)
- [File-index guide](docs/guides/file-indexes.md)
- [Realtime guide](docs/guides/realtime.md)
- [Current API reference](docs/reference/api.md)
- [Class-purpose catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
