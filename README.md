# @carbonenginejs/runtime

Unpublished consolidation destination for the browser-safe CarbonEngineJS runtime, renderer engines, and browser tools.

Use this repository while the accepted combined-runtime migration is in
progress. It provides the executable layer boundary, migration metadata, the
maintained global foundation, the resource/format capability, the migrated
Trinity/EVE object graph, the standalone SOF data and graph builder, and the
complete headless-by-default audio domain.
`@carbonenginejs/tools-core` remains a separate Node.js package.

## Install

The package is private and is not published or installable yet. Development
dependencies can be installed from this repository with:

```sh
npm install
```

## Quick start

Current validation checks the internal dependency graph, package maps, the
migrated foundation, all resource/format implementations, Trinity, SOF, and
audio:

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

The remaining character, input, core, tools, and WebGPU imports become
available only after their
history-preserving migrations and the atomic consumer cutover. The WebGPU
engine is not exported yet, and no WebGL placeholder is advertised before a
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

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
