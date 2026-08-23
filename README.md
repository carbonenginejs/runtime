# @carbonenginejs/runtime

Unpublished consolidation destination for the browser-safe CarbonEngineJS runtime, renderer engines, and browser tools.

Use this repository while the accepted combined-runtime migration is in
progress. It provides the executable layer boundary, migration metadata, and
the maintained global foundation migrated from `runtime-utils`.
`@carbonenginejs/tools-core` remains a separate Node.js package.

## Install

The package is private and is not published or installable yet. Development
dependencies can be installed from this repository with:

```sh
npm install
```

## Quick start

Current validation checks the internal dependency graph, package maps, and the
migrated foundation implementation:

```sh
npm test
```

Current foundation imports include `@carbonenginejs/runtime/math`,
`@carbonenginejs/runtime/utils`, `@carbonenginejs/runtime/consts`,
`@carbonenginejs/runtime/schema`, and `@carbonenginejs/runtime/model`.

Planned public imports such as `@carbonenginejs/runtime/resource` and
`@carbonenginejs/runtime/engine/webgpu` become available only after their
history-preserving migrations and the atomic consumer cutover. The WebGPU
engine is not exported from this scaffold, and no WebGL placeholder is
advertised before a maintained implementation exists.

## Documentation

Start with the [package documentation](docs/README.md) and the
[runtime architecture](docs/architecture.md). The tracked
[migration manifest](migration/sources.json) records donor revisions, import
order, temporary history prefixes, and pre-migration test evidence.

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE) for provenance and attribution.
CarbonEngineJS includes JavaScript ports and adaptations of CarbonEngine
behavior plus independently implemented interoperability code where noted. It
is not affiliated with or endorsed by Fenris Creations or CCP Games.
