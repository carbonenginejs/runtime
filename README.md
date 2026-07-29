# @carbonenginejs/tools-browser

Browser-facing CarbonEngineJS clients, remote readers, and application tools.

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
families. Targeted `./audio`, `./chat`, `./fileindex`, and `./realtime` imports
remain available. Node hosts and protocol tools that need only the
side-effect-free wire constants and structural validators use
`./realtime/wire`.

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
