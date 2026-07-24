# @carbonenginejs/tools-browser

Browser-facing CarbonEngineJS clients, remote readers, and application tools.

Use this package when a useful browser implementation does not belong in a
runtime library. Shared primitives remain in
`@carbonenginejs/runtime-utils`; Node acquisition, servers, credentials, and
build orchestration remain in `@carbonenginejs/tools-core`.

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

The root export is available when an application consumes several tool
families. Targeted `./chat`, `./fileindex`, and `./realtime` imports remain
available.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and boundaries](docs/architecture.md)
- [Chat guide](docs/guides/chat.md)
- [File-index guide](docs/guides/file-indexes.md)
- [Realtime guide](docs/guides/realtime.md)
- [Current API reference](docs/reference/api.md)
- [Class-purpose catalog](docs/reference/classes/README.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
