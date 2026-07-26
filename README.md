# @carbonenginejs/runtime-resource

CarbonEngineJS resource lifecycle, cache, format selection, source, and object
loading contracts — the GPU-free resource layer.

Use this package when you need Carbon-shaped resource loading (`res:/` paths,
requirement/emit selection, `Ready()`/`GetObject()`) or one of the non-shader
format readers, without choosing a GPU backend. It sits between resource
providers and the engine packages that realize prepared resources. It does not
own WebGL/WebGPU realization, device budgets, or shader formats.

## Install

```sh
npm install @carbonenginejs/runtime-resource
```

## Quick start

Concrete formats are explicit tree-shakeable subpaths, never imported by the
package root:

```js
import {
  CjsResMan,
  CjsResManFetchProvider
} from "@carbonenginejs/runtime-resource";
import { CjsMp4Format } from "@carbonenginejs/runtime-resource/formats/mp4";

const resMan = new CjsResMan().Register({
  paths: {
    res: "https://cdn.example.invalid/resources/"
  },
  source: new CjsResManFetchProvider(),
  formats: [ CjsMp4Format ]
});

const resource = resMan.GetResource("res:/video/intro.mp4");
const video = await resource.Ready();
```

Browser consumers use worker-backed fetch and declared worker-safe format
readers by default, with deterministic main-thread fallback; see
[browser worker execution](docs/reference/workers.md).

Raw audio resource ownership is available from an explicit subpath:

```js
import {
  CjsAudioBufferRes,
  CjsAudioRes
} from "@carbonenginejs/runtime-resource/resource/audio";
```

`CjsAudioRes` always represents one addressable audio file. Its backing may be
a complete loose file, an individually served response, or a window within a
shared `CjsAudioBufferRes` bank payload.
The shorter `@carbonenginejs/runtime-resource/audio` export remains a
compatibility alias; new code should use the resource-family path above.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Resource lifecycle concepts](docs/concepts/resource-lifecycle.md)
- [Browser worker execution](docs/reference/workers.md)
- [Audio resource classes](docs/reference/classes/audio.md)
- [Format subpaths](docs/formats/README.md)
- [Format ownership and fork provenance](docs/formats/provenance.md)

## Development

Non-interactive baseline checks run from the repository root:

```sh
npm install
npm run lint
npm run check
npm test
```

`npm run check` builds the consumer package and proves that decorator metadata
matches between authoring source and built output. `npm test` additionally
runs the complete GPU-free unit suite; it requires no private assets,
credentials, network access, browser, or GPU after dependencies are installed.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE). CarbonEngine and Fenris
Creations (CCP Games) are named for interoperability and provenance context;
copied-reader ownership, licenses, and retained snapshots are recorded in
[docs/formats/provenance.md](docs/formats/provenance.md). This project is not
affiliated with, endorsed by, or sponsored by CCP Games or CCP ehf. EVE
Online and related marks remain the property of their respective owners.
