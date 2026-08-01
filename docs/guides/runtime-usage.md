# Runtime character usage

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Runtime and application integrators
Summary: Builds and reads character JSON without reviving the removed v1/v2 model.

## Build a document library

The builder takes either an object keyed by document name or an array of
`{ name, data }` descriptors:

```js
import {
    CjsCharacterDocumentLibrary,
    CjsCharacterLibraryBuilder
} from "@carbonenginejs/runtime-character";

const document = CjsCharacterLibraryBuilder.buildFromInputs({
    documents,
    sourceTarget: "example",
    sourceBuild: "1"
});
const library = new CjsCharacterDocumentLibrary(document);
```

The builder is deterministic when caller metadata is deterministic. It does
not fetch, decode, identify a source format, or mutate its input.

## Read records and relationships

```js
const ancestry = library.Get("ancestries", ancestryID);
const bloodline = library.ResolveReference(
    "bloodlines",
    ancestry.bloodlineID
);
const race = library.ResolveReference("races", bloodline.raceID);
```

`Get()` returns the preserved plain record or `null`. `ResolveReference()`
requires an exact `{ _ref }` relationship and returns `null` for an absent
target. This keeps authored sentinel and stale references visible.

## Hydrate future semantic records

The JSON record is the construction input. A future evidence-backed semantic
class should use the normal `CjsModel` path:

```js
const race = CjsCharacterRace.from(
    library.Get("races", raceID)
);
```

The document name supplies the constructor registry key, so records do not
currently need `_type`. A registry may map `races` to `CjsCharacterRace` when
that class exists and is proven. Do not infer a class merely from a field name
or path.

## Use current native classes

Current Carbon character/interior identities are exported from the package
root:

```js
import {
    Tr2InteriorScene,
    Tr2SkinnedObject,
    WodBakingScene
} from "@carbonenginejs/runtime-character";
```

Their source lives under `src/trinity`. They do not automatically consume a
schema-v3 character document. Any adapter between a document record and a
native object must be separately evidenced and tested.

`CjsCharacterRigBinding` remains available for the current
`Tr2SkinnedObject` CPU skinning path. It maps exact animation-bone names to
render joints and packs the native Float4x3 palette layout; it is not a
character-library model.

## Incarna-only identities

Historical identities absent from current Carbon are not native Trinity
classes. When required by pinned Incarna evidence, they belong under
`src/incarna`. No such class is currently exported.
