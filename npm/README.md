# @carbonenginejs/runtime-character

GPU-free, I/O-free character source documents and native Trinity character
classes for CarbonEngineJS.

The package has two independent surfaces:

- a transparent JSON character-library format built from caller-supplied
  record-map documents; and
- current Carbon `Tr2*`, `Tri*`, and `Wod*` character/interior classes under
  `src/trinity`.

The former schema-v1/v2 `CjsCharacter*` graph, recipe, part, material, face,
control, and deformation models were based on superseded inputs and have been
removed. The schema-v3 document library does not hydrate or project records
into those old shapes.

## Install

```sh
npm install @carbonenginejs/runtime-character
```

## Quick start

```js
import {
    CjsCharacterDocumentLibrary,
    CjsCharacterLibraryBuilder
} from "@carbonenginejs/runtime-character";

const document = CjsCharacterLibraryBuilder.build(
    callerSuppliedCharacterDocuments
);
const library = new CjsCharacterDocumentLibrary(document);
const ancestry = library.Get("ancestries", ancestryID);
const bloodline = library.ResolveReference(
    "bloodlines",
    ancestry.bloodlineID
);
```

Inputs and output are ordinary JSON. Document names provide the record-type
scope, so records do not need an invented `_type`. Proven relationships use
`{ "_ref": id }`; only existing records targeted by a relationship receive
`_id`.

Future semantic records may extend `CjsModel`. Such classes must be backed by
current evidence and hydrate directly with
`CjsCharacterThing.from(jsonRecord)`. The package will not add an intermediate
normalized data structure.

## Native and historical classes

Current Carbon identities live under `src/trinity` and are exported from the
package root. Historical Incarna-only identities that no longer exist in the
current Carbon checkout belong under `src/incarna`. The initial exported
tranche covers the recovered interior-cell record plus the historical Curve2
color/scalar layouts. The latter preserve the relevant historical Curve2
evaluation semantics and remain distinct from runtime-trinity's materially
different current Carbon curve layouts.

Character asset fetching, decoding, caching, and lifecycle remain with
`runtime-resource` and outer application adapters. This package stores paths
and relationships, not downloaded asset bytes.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and ownership](docs/architecture.md)
- [Runtime usage](docs/guides/runtime-usage.md)
- [Character document contract](docs/reference/prepared-libraries.md)
- [Class catalog](docs/reference/classes/README.md)
- [Roadmap](docs/roadmap.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
