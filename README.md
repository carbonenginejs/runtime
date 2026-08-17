# @carbonenginejs/tools-browser

Browser-facing CarbonEngineJS clients, remote readers, demo infrastructure,
and application tools.

Use this package when a useful browser implementation does not belong in a
runtime library. Shared primitives remain in `@carbonenginejs/runtime-utils`;
audio graph semantics and resource formats remain in their owning runtime
packages. Node acquisition, servers, credentials, and persistent caches remain
in `@carbonenginejs/tools-core`.

## Install

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

Read a complete schema-v2 audio library from a remote endpoint:

```js
import {
    CjsAudioLibrary
} from "@carbonenginejs/tools-browser/audio";

const library = new CjsAudioLibrary({
    fetch
});
const audioLibraryDocument = await library.ReadDocument(
    "https://example.invalid/eve/3435006/audio/library"
);
```

Use the same object as `CjsAudioMan`'s remote media provider:

```js
import {
    CjsAudioMan
} from "@carbonenginejs/runtime-audio";

const audio = new CjsAudioMan(audioLibraryDocument, {
    mediaProvider: library
});
```

The browser tool does not build, select, decode, or cache audio. It can package
caller-selected remote index rows, SoundbanksInfo, and optional neutral
enrichment for the optional
`@carbonenginejs/runtime-audio/library-builder`; it can also read complete
files and exact ranges for the runtime provider contract.

The root export is available when an application consumes several tool
families. Targeted `./audio`, `./chat`, `./demos`, `./fileindex`, `./market`,
`./ship-show-info`, and `./realtime` imports remain available. Node hosts and
protocol tools that need only the side-effect-free wire constants and
structural validators use `./realtime/wire`.

Host independently mountable demos without choosing their renderer or data
storage:

```js
import {
    CjsDemoDataService,
    CjsDemoHost
} from "@carbonenginejs/tools-browser/demos";

const data = new CjsDemoDataService({ providers });
const host = new CjsDemoHost({ container, context: { data }, demos });

await host.Open("ship-show-info");
```

The demo family accepts caller-provided browser capabilities. It imports no
Node implementation and may consume in-memory or bundled JSON, remote APIs,
IndexedDB, prepared runtime libraries, and injected graphics adapters.

Coordinate asynchronous Ship Show Info data and an application-owned renderer
without importing presentation or acquiring an engine:

```js
import {
    CjsESIShipShowInfoController
} from "@carbonenginejs/tools-browser/ship-show-info";

const showInfo = new CjsESIShipShowInfoController({
    shipSource,
    renderer
});

await showInfo.Mount(renderSurface);
await showInfo.Open({ typeID, regionID });
```

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Audio-library guide](docs/guides/audio-libraries.md)
- [Chat guide](docs/guides/chat.md)
- [Browser demo guide](docs/guides/demos.md)
- [File-index guide](docs/guides/file-indexes.md)
- [Regional-market guide](docs/guides/market.md)
- [Ship Show Info guide](docs/guides/ship-show-info.md)
- [Realtime guide](docs/guides/realtime.md)
- [Current API reference](docs/reference/api.md)
- [Class-purpose catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
