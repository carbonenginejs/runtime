# @carbonenginejs/runtime-character

GPU-free character source documents, combined-library loading, and native
Trinity character classes for CarbonEngineJS. The combined library can be
built from decoded values or directly from the twelve modern cFSD resources
through fetch or an injected byte source.

The root export also provides source-neutral modifier-order and shared-atlas
layout helpers for resolvers. Resource loading, shader realization, mesh
replacement, and animation rebinding remain renderer responsibilities.

The package has five independent surfaces:

- a source-neutral schema-v10 model-shaped JSON library built from
  modern cFSD record maps or caller-supplied record-map documents, losslessly retained decoded
  definitions, and additive prepared profile catalogs;
- source-backed character record models under `src/character`, hydrated as one
  connected library graph;
- a standalone, renderer-neutral appearance-plan JSON/model graph plus an
  exact first-stage paper-doll resolver under `src/character`;
- verified source-neutral modifier-order and shared-atlas policy utilities; and
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

To build the twelve required source documents directly:

```js
const library = await CjsCharacterLibraryBuilder.buildFromResources({
    baseUrl: "https://assets.example.test"
});

const values = library.GetValues();
```

Native fetch cannot resolve `res:/` URLs. Browser callers provide `baseUrl` or
`resolveUrl`; local tooling injects `source.read(path, context)` and uses the
same builder. Legacy 32-bit FSD can be identified through `fsdOptions`, but its
reader is intentionally unsupported.

Inputs and output are ordinary model-shaped JSON. Each source map key becomes
the named `recordID` field; authored identities such as `typeID` remain their
own named fields. Proven relationships use native document-local `_id` and
`_ref` graph metadata. Only existing records targeted by a relationship need
`_id`; missing positive targets remain visible as their named identifier value.

`CjsCharacterLibrary.from(bigJSON)` and `new CjsCharacterLibrary().SetValues(bigJSON)`
hydrate the same twenty document collections into `CjsModel` records. Twelve
direct source documents are required; the lossless decoded-definition document
and seven derived profile/resource catalogs are optional builder inputs. A
derived catalog never replaces its source definition. The library does not
retain or translate a second JSON representation. Its normal
`GetValues({ refs: true })` output can be serialized and hydrated again.

Editors can incrementally call `Create`, `Add`, `Remove`, `Delete`, or `Clear`
without changing that JSON shape. The library lazily invalidates the affected
document index and emits record/document events for UI synchronization.

`CjsCharacterAppearancePlan.from(bigJSON)` hydrates a separate schema-v4 plan
through the inherited `CjsModel` contract. Its `_id`/`_ref` graph closes within
the document. It records resolved ownership, contributors, textures, reusable
coverage, ordered logical composition, final bindings, and provenance.
`CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll)` resolves
only exact source relationships. Every exact source version remains a plan
contribution; configuration and geometry fields are filled only when their
candidates are unique. Exact typed modifier-location occlusions and typed
`clothingRemovesCategory` relationships suppress only the targeted active
selection while retaining its selection record and provenance. It emits
diagnostics and leaves composition empty when dependency,
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

Selected character asset fetching, caching, and lifecycle remain with
`runtime-resource` and outer application adapters. The library builder decodes
the twelve static-data cFSD inputs but stores paths and relationships, not
downloaded runtime asset bytes. Its library manager can invoke
one caller-supplied object loader for the combined catalog.

Schema v10 retains normalized PNG placement facts in
`characterTextureMetadata`. Producers normally populate that catalog while
building the library. For older or deliberately sparse libraries,
`library.InspectResourceForData(path)` first returns an existing
extension-neutral record, then asks its configured runtime-resource manager
for the corresponding `.png` representation. The resource manager reuses a
resident resource or performs its ordinary source read; the library hydrates
the inspection facts and emits the ordinary `recordadded` event. Passing a
stem, `.dds`, or `.png` addresses the same metadata record.

## Documentation

- [Package documentation](docs/README.md)
- [Architecture and ownership](docs/architecture.md)
- [Runtime usage](docs/guides/runtime-usage.md)
- [Combined library pipeline](docs/guides/combined-library-pipeline.md)
- [Character document contract](docs/reference/prepared-libraries.md)
- [Character appearance plans](docs/reference/character-appearance-plans.md)
- [Character CPU, GPU, and format boundary](docs/reference/cpu-gpu-and-format-boundary.md)
- [Legacy GLES character reference](docs/reference/legacy-gles-character-reference.md)
- [Class catalog](docs/reference/classes/README.md)
- [Roadmap](docs/roadmap.md)

## License

MIT. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
