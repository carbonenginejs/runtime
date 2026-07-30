# @carbonenginejs/runtime-audio

Complete CarbonEngineJS audio domain with a graph-only `./trinity` entry and
optional Web Audio realization.

Use this package to hydrate and operate Carbon audio objects, install one
complete schema-v2 audio-library document, and play it through an injected
browser media provider. Runtime-audio consumes data; it never discovers an
installation, downloads builder inputs, or requires Node.

An optional SFX program in that document provides authored random,
step-sequence, switch/state, parallel/blend, gain, and live RTPC-curve
behavior without changing how media bytes are delivered.

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
```

Callers supply index rows, SoundbanksInfo, optional neutral enrichment, and
bank access. Fetching those inputs is outside the builder and runtime
contracts.

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
