# @carbonenginejs/runtime-character

GPU-free, I/O-free character source documents and native Trinity character
classes for CarbonEngineJS.

The package has four independent surfaces:

- a source-neutral model-shaped JSON library built from caller-supplied
  record-map documents;
- source-backed character record models under `src/character`, hydrated as one
  connected library graph;
- a standalone, renderer-neutral appearance-plan JSON/model graph under
  `src/character/planning`; and
- current Carbon `Tr2*`, `Tri*`, and `Wod*` character/interior classes under
  `src/trinity`.

The former schema-v1/v2 `CjsCharacter*` graph, recipe, part, material, face,
control, and deformation models were based on superseded inputs and have been
removed. Schema-v4 records hydrate directly into the new source-backed classes;
they are not projected into the old shapes.

## Install

```sh
npm install @carbonenginejs/runtime-character
```

## Quick start

```js
import {
    CjsCharacterLibrary,
    CjsCharacterLibraryBuilder
} from "@carbonenginejs/runtime-character";

const document = CjsCharacterLibraryBuilder.build(
    callerSuppliedCharacterDocuments
);
const library = CjsCharacterLibrary.from(document);
const ancestry = library.Get("ancestries", ancestryID);
const bloodline = ancestry.bloodlineID;
const race = bloodline.raceID;
```

Inputs and output are ordinary model-shaped JSON. Each source map key becomes
the named `recordID` field; authored identities such as `typeID` remain their
own named fields. Proven relationships use native document-local `_id` and
`_ref` graph metadata. Only existing records targeted by a relationship need
`_id`; missing positive targets remain visible as their named identifier value.

`CjsCharacterLibrary.from(bigJSON)` and `new CjsCharacterLibrary().SetValues(bigJSON)`
hydrate the same twelve document collections into `CjsModel` records. The
library does not retain or translate a second JSON representation. Its normal
`GetValues({ refs: true })` output can be serialized and hydrated again.

`CjsCharacterAppearancePlan.from(bigJSON)` hydrates a separate schema-v1 plan
through the inherited `CjsModel` contract. Its `_id`/`_ref` graph closes within
the document. It records resolved ownership,
contributors, textures, reusable coverage, ordered logical composition, final
bindings, and provenance. The package does not yet resolve a source library
into that plan or execute it. The working GLES demo is evidence for those
adapters, but its hardcoded bake order and filename heuristics are not source
record fields.

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
- [Character appearance plans](docs/reference/character-appearance-plans.md)
- [Class catalog](docs/reference/classes/README.md)
- [Roadmap](docs/roadmap.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
