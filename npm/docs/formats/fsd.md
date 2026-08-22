# FSD and cFSD

Status: Experimental
Scope: `@carbonenginejs/runtime-resource/formats/fsd`
Audience: Runtime and tooling integrators decoding caller-supplied static data
Summary: Distinguishes legacy 32-bit FSD from modern 64-bit cFSD and owns the browser-safe decoder for the modern format.

## Two related formats

The FSD facade deliberately keeps two implementation directories:

| Variant | Directory | Identification | Reading |
|---|---|---|---|
| Legacy Carbon FSD | `formats/fsd/32` | Caller/profile declaration (`bitWidth: 32` or `variant: "fsd32"`) | Reserved; throws `CJS_FSD_32_UNSUPPORTED` |
| Modern cFSD | `formats/fsd/64` | Valid 32-byte envelope whose 64-bit payload length matches the supplied bytes | Supported through an explicit dataset reader |

Legacy FSD is headerless and its layout is supplied separately, so arbitrary
bytes cannot identify themselves as that format. `CjsFsdFormat` never treats a
failed modern probe as legacy. The `32` directory is the stable home for a
future schema-driven implementation without flattening two layouts into one
reader or changing public subpaths.

## Use through the format pipeline

```js
import { CjsFormatStore } from "@carbonenginejs/runtime-resource/format";
import { CjsFsdFormat } from "@carbonenginejs/runtime-resource/formats/fsd";
import { CjsFsd64Reader } from "@carbonenginejs/runtime-resource/formats/fsd/64";
import {
  CjsFsd64ReaderSetCharacterStaticData
} from "@carbonenginejs/runtime-resource/formats/fsd/64/readers";

const reader = CjsFsd64ReaderSetCharacterStaticData.registerAll(new CjsFsd64Reader());
const route = new CjsFormatStore()
  .Register(CjsFsdFormat)
  .Resolve(".fsdbinary", bytes);

const records = await route.Read(bytes, {
  path: "res:/staticdata/ancestries.fsdbinary",
  reader
});
```

`readJSON()` or `emit: "json"` requests plain JSON-compatible output. Wide
identifiers remain lossless decimal strings. The ordinary `Read()` path keeps
the typed `Map` representation exposed by the lower-level readers.

## Dataset layouts

Each reviewed layout is a JSON-shaped JavaScript object defined directly on
its owning, namespaced class. The class and file share one identity, such as
`CjsFsd64SchemaRaces` in `CjsFsd64SchemaRaces.js`. No separate schema sidecar
has to remain paired with the reader.

```js
import {
  CjsFsd64SchemaRaces
} from "@carbonenginejs/runtime-resource/formats/fsd/64/readers";

const definition = CjsFsd64SchemaRaces.getFsdSchema();
```

`getFsdSchema()` returns the same validated JSON-shaped object on every call.
There is no public backing `fsdSchema` property. The FSD-specific name is
deliberate: `schema` and `getSchema` remain free for the `CjsModel` schema
namespace and are not defined by these reader classes.

To report identified legacy bytes without decoding them:

```js
const metadata = CjsFsdFormat.inspect(bytes, { bitWidth: 32 });
// metadata.variant === "fsd32"; metadata.decodable === false

CjsFsdFormat.read(bytes, { bitWidth: 32 });
// throws CJS_FSD_32_UNSUPPORTED
```

## Ownership boundary

This format owns byte validation, declarative layouts, schema decoding, exact-path
reader registration, and approved dataset readers. It performs no filesystem
discovery, network access, provider selection, build selection, caching, native
loader inspection, localization enrichment, or output-tree construction.

Acquisition and target/build profiles belong to tooling. Runtime packages own
interpretation and construction of prepared domain libraries. The reader
subpath contains no acquired `.fsdbinary` files, native modules, decoded
datasets, or generated game tables.

## Errors

| Code | When |
|---|---|
| `CJS_FSD_32_UNSUPPORTED` | The caller identified legacy 32-bit FSD, whose future reader belongs in `formats/fsd/32` |
| `CJS_FSD_VARIANT_UNKNOWN` | Bytes are neither explicitly declared legacy FSD nor a valid modern cFSD container |
| `CJS_FSD_READER_REQUIRED` | Modern cFSD was recognized but no reader/registry exposing `Read` or `ReadJSON` was supplied |
| `CJS_FSD_READER_NOT_FOUND` | A registry has no reader for the normalized logical path |
| `CJS_FSD_SCHEMA_UNSUPPORTED` | A dataset reader does not accept the container's layout identity |

## Related documentation

- [Formats](README.md)
- [Format ownership and fork provenance](provenance.md)
- [Format capabilities](../concepts/format-capabilities.md)
