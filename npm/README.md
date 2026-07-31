# @carbonenginejs/runtime-character

GPU-free, I/O-free character composition graph and runtime construction layer
for CarbonEngineJS.

Use this package to hydrate prepared character libraries, resolve explicit
character selections, compose live controls, and expose inert dependencies to
an outer resource or rendering adapter.

## Install

```powershell
npm install @carbonenginejs/runtime-character
```

## Quick start

```js
import {
  CjsCharacterLibrary
} from "@carbonenginejs/runtime-character";

const library = new CjsCharacterLibrary({
  schema: "carbonenginejs.characterLibrary",
  schemaVersion: 1,
  parts: []
});

const graph = library.BuildGraphFromParts([]);
```

Prepared data is supplied by the caller. The package performs no network,
filesystem, cache, decoder, or GPU work.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture](docs/architecture.md)
- [Extended usage](docs/guides/runtime-usage.md)
- [Prepared-library contract](docs/reference/prepared-libraries.md)
- [Current and planned work](docs/roadmap.md)
- [Class catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE).
