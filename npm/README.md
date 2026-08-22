# @carbonenginejs/runtime-audio

Complete CarbonEngineJS audio domain with a graph-only `./trinity` entry and
optional Web Audio realization.

Use this package to hydrate and operate Carbon audio objects, install one
complete schema-v2 audio-library document, and play it through an injected
browser media provider. Runtime-audio can build that document directly from
indexed resources through fetch or an injected byte source. It never discovers
an installation or requires Node.

An optional SFX program in that document provides authored random,
step-sequence, continuous scheduling and crossfades, switch/state,
parallel/blend, gain, and live RTPC-curve behavior without changing how
media bytes are delivered.

An independent optional music-library input powers `CjsJukebox`. Song URLs
and paths remain caller-owned; the browser application supplies acquisition
and optional availability functions, while runtime-audio owns
cancellation-safe decode and playback.

## Install

```sh
npm install @carbonenginejs/runtime-audio
```

## Quick start

The `./trinity` entry is safe in browsers and headless hosts. It creates no
audio context and performs no device work:

```js
import {
    AudEmitter
} from "@carbonenginejs/runtime-audio/trinity";

const emitter = new AudEmitter();
emitter.Initialize("engine", "ship_", [ 0, 0, 0 ]);
emitter.SetRTPC("speed", 0.5);

const values = emitter.GetValues();
```

Applications that need audible playback use `CjsAudioMan` with a complete
document and a structural provider:

```js
import {
    CjsAudioMan
} from "@carbonenginejs/runtime-audio";

const audio = new CjsAudioMan(completeLibraryDocument, {
    mediaProvider: {
        Read: (source, { signal }) =>
            fetch(source.url, { signal })
                .then(response => response.arrayBuffer()),
        ReadRange: (bank, range) => readExactRange(bank, range)
    }
});
```

The provider may deliver individual prepared/original files, complete
original banks for local slicing, or exact original-bank ranges. The optional
builder is isolated from the root runtime graph:

```js
import {
    CjsAudioLibraryBuilder
} from "@carbonenginejs/runtime-audio/library-builder";

const library = await CjsAudioLibraryBuilder.buildFromResources({
    indexEntries,
    baseUrl: "https://assets.example.test"
});

const values = library.GetValues();
```

`buildFromResources()` fetches explicitly named index, cFSD metadata,
SoundbanksInfo, and bank resources by default. A local tool supplies the same
bytes through `source.read(path, context)`. Native fetch cannot resolve
`res:/` URLs, so browser callers provide `baseUrl` or `resolveUrl` unless their
index already contains fetchable URLs. Set `inspectBanks: false` for a
catalog-only payload that decodes cFSD and SoundbanksInfo without opening the
indexed banks. Existing decoded inputs remain supported through `build()` and
`buildFromBanks()`.

Prepared documents hydrate from imported JSON with `CjsAudioLibrary.from()`.
`CjsAudioLibrary.load(pathOrBytes, options)` also accepts plain JSON or gzip
bytes and uses fetch for a string path by default.

## Demo

The repository demo uses `@carbonenginejs/tools-browser/audio` as its media
provider and expects the tools-core audio service at
`http://127.0.0.1:5510` by default. The demo server serves only static assets,
the selected audio-library document, and optional local jukebox tracks; it
does not read a game-resource cache or download game media itself.

Start the tools-core service separately, then run:

```sh
npm run demo
```

Use `?audio-service=<url>` on the demo URL when the prepared service uses a
different origin. Media requests remain exact to the document's
`sourceTarget` and numeric `sourceBuild`.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Browser playback guide](docs/guides/browser-playback.md)
- [Authored SFX programs](docs/guides/sfx.md)
- [Optional jukebox](docs/guides/jukebox.md)
- [Current API reference](docs/reference/api.md)
- [Carbon compatibility](docs/reference/carbon-compatibility.md)
- [Class-purpose catalog](docs/reference/classes/README.md)
- [Audio manager contract](docs/concepts/audio-manager.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
