# @carbonenginejs/runtime

Unpublished consolidation destination for the browser-safe CarbonEngineJS runtime, renderer engines, and browser tools.

Use this repository while the accepted combined-runtime migration is in
progress. It provides the executable layer boundary, migration metadata, the
maintained global foundation, the resource/format capability, the migrated
Trinity/EVE object graph, the standalone SOF data and graph builder, the
complete headless-by-default audio domain, and the GPU-free character domain.
The browser-facing input domain is also migrated and remains headless until a
host is explicitly attached. The WebGPU engine is available only through its
explicit engine subpath and remains inert unless a consumer imports it.
`@carbonenginejs/tools-core` remains a separate Node.js package.

## Install

The package is private and is not published or installable yet. Development
dependencies can be installed from this repository with:

```sh
npm install
```

## Quick start

Current validation checks the internal dependency graph, package maps, the
migrated foundation, all resource/format implementations, Trinity, SOF, audio,
character, and input:

```sh
npm test
```

Current foundation imports include `@carbonenginejs/runtime/math`,
`@carbonenginejs/runtime/utils`, `@carbonenginejs/runtime/consts`,
`@carbonenginejs/runtime/schema`, and `@carbonenginejs/runtime/model`.
Resource consumers use `@carbonenginejs/runtime/resource`; concrete readers,
including FSD, are opt-in subpaths below
`@carbonenginejs/runtime/resource/formats/*`.
Trinity consumers use `@carbonenginejs/runtime/trinity` and its focused family
subpaths such as `/core`, `/eve`, `/renderJob`, and `/generated`.
SOF consumers use `@carbonenginejs/runtime/sof`; its `/data` subpath retains the
former lightweight data-model surface.
Audio consumers use `@carbonenginejs/runtime/audio`; graph-only users can use
`/audio/trinity`, while metadata, document, and acquisition-free builder
surfaces remain available through focused audio subpaths.
Character consumers use `@carbonenginejs/runtime/character`; acquisition-free
library building and reviewed generated source are also exposed through
`/character/library-builder` and `/character/generated`.
Input consumers use `@carbonenginejs/runtime/input` for host-window state,
keyboard and pointer normalization, and browser cursor adapters.
WebGPU consumers use `@carbonenginejs/runtime/engine/webgpu`; the default
runtime import does not acquire a GPU or load the engine.

The remaining core and tools imports become available only after their
history-preserving migrations and the atomic consumer cutover. The WebGPU
engine has no root re-export, and no WebGL placeholder is advertised before a
maintained implementation exists.

## Documentation

Start with the [package documentation](docs/README.md) and the
[runtime architecture](docs/architecture.md). The tracked
[migration manifest](migration/sources.json) records donor revisions, import
order, temporary history prefixes, and pre-migration test evidence.
Trinity ownership and its public class catalog are documented under
[docs/trinity](docs/trinity/README.md).
SOF ownership, boundaries, and class catalog are documented under
[docs/sof](docs/sof/README.md).
Audio ownership, import-time safety, and class catalogs are documented under
[docs/audio](docs/audio/README.md).
Character documents, native ownership, and renderer adoption gates are
documented under [docs/character](docs/character/README.md).
Input ownership and browser capability boundaries are documented under
[docs/input](docs/input/README.md).
WebGPU ownership, API, and verification are documented under
[docs/engine/webgpu](docs/engine/webgpu/README.md).

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
