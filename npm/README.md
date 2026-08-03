# @carbonenginejs/runtime-character

GPU-free character source documents, combined-library loading, and native
Trinity character classes for CarbonEngineJS. Acquisition remains
caller-owned through structural loaders.

The package has four independent surfaces:

- a source-neutral schema-v6 model-shaped JSON library built from
  caller-supplied record-map documents and prepared profile catalogs;
- source-backed character record models under `src/character`, hydrated as one
  connected library graph;
- a standalone, renderer-neutral appearance-plan JSON/model graph plus an
  exact first-stage paper-doll resolver under `src/character`; and
- current Carbon `Tr2*`, `Tri*`, and `Wod*` character/interior classes under
  `src/trinity`.

The former schema-v1/v2 `CjsCharacter*` graph, recipe, part, material, face,
control, and deformation models were based on superseded inputs and have been
removed. The twelve direct source-document families hydrate into the current
source-backed classes; they are not projected into the old shapes.

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
hydrate the same eighteen document collections into `CjsModel` records. Twelve
direct source documents are required; six folded profile/resource catalogs are
optional builder inputs. The library does not retain or translate a second
JSON representation. Its normal
`GetValues({ refs: true })` output can be serialized and hydrated again.

`CjsCharacterAppearancePlan.from(bigJSON)` hydrates a separate schema-v1 plan
through the inherited `CjsModel` contract. Its `_id`/`_ref` graph closes within
the document. It records resolved ownership, contributors, textures, reusable
coverage, ordered logical composition, final bindings, and provenance.
`CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll)` resolves
only exact source relationships and uniquely determined configuration/geometry
candidates. It emits diagnostics and leaves composition empty when dependency,
LOD, material, texture-role, coverage, or pass-order policy is not proven. The
package does not execute the plan. Prototype bake order and filename heuristics
are not source-record fields.

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
and relationships, not downloaded asset bytes. Its library manager can invoke
one caller-supplied object loader for the combined catalog.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and ownership](docs/architecture.md)
- [Runtime usage](docs/guides/runtime-usage.md)
- [Combined library pipeline](docs/guides/combined-library-pipeline.md)
- [Character document contract](docs/reference/prepared-libraries.md)
- [Character appearance plans](docs/reference/character-appearance-plans.md)
- [Class catalog](docs/reference/classes/README.md)
- [Roadmap](docs/roadmap.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
