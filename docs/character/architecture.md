# Runtime character architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/character`
Audience: Maintainers and runtime integrators
Summary: Separates source-neutral character documents, current Carbon classes, and historical Incarna contracts.

## Source states

```text
modern cFSD bytes or caller JSON
    |
    v
CjsCharacterLibraryBuilder -> hydrated schema-v10 library
    |
    v
CjsCharacterLibrary.from / instance.SetValues
    -> same-shaped hydrated source records in src/character/model
    |
    +-> CjsCharacterLibraryManager
        -> direct combined-library installation or injected object loading
        -> observable named record mutation
        -> lazy per-document private lookup indexes
    |
    v
CjsCharacterAppearanceResolver
    -> exact selection/part tranche plus unresolved-policy diagnostics
    |
    v
CjsCharacterAppearancePlan.from -> hydrated plan records in src/character/model/planning

current Carbon source ----------> src/character/trinity
historical Incarna evidence ----> src/character/incarna
```

These lanes do not imply conversion between one another.

## Character document boundary

The builder accepts named plain-JSON record maps. It copies source fields,
materializes each source map key as the named `recordID` field, and projects
only established identifier relationships.

Document names are the type scope. A record therefore does not receive `_type`
unless a future document is proven to contain multiple semantic types. `_id`
is document-local graph metadata added only to existing records targeted by a
relationship; relationships are `{ "_ref": id }`. `_id` is not a domain
identity: `recordID`, `typeID`, `raceID`, and other named fields carry those
meanings.

`CjsCharacterLibrary.from(bigJSON)` hydrates twenty established document
families into direct source-record classes under `src/character/model` without
changing the public field layout. Twelve direct source documents are required.
One optional catalog retains every supplied decoded authoring definition as
plain JSON, and seven optional catalogs add typed part, resource, metadata,
material, projection, recipe, and texture-placement indexes. A typed projection never replaces
its retained definition. Applying the same values with `SetValues` produces
the same model graph.
`GetValues({ refs: true })` returns serializable model-shaped values; graph
tokens may be renumbered without changing identity relationships.

Named `Create`, `Add`, `Remove`, `Delete`, and `Clear` operations mutate the
same visible document arrays. Collection properties carry their own lazy index
flags, while child-owned work tokens remain for the active domain context to
interpret. The library does not assume that nested traversal contexts are one
global context.

Zero relationship sentinels become `null`. A positive missing target remains
its named identifier value rather than becoming an unresolved `_ref` or an
invented placeholder model.

The hydrated source records do not create render parts, material plans, LOD
bundles, or atlas passes. `CjsCharacterAppearanceResolver` projects exact
paper-doll selections and retains one plan contribution for every exact source
version. It fills configuration and geometry only when that same version has
one candidate for each; otherwise the fields remain null with diagnostics. It
never merges version records. All remaining decisions belong
to later resolver stages whose output is the separate backend-neutral
appearance-plan contract. Prototype rendering is supporting evidence, not the
source-record schema.

## Appearance-plan boundary

The schema-v4 appearance plan is a standalone JSON graph, not an extension of
the schema-v10 source library. Its selections, resolved parts, layers, textures,
coverages, composition targets, and bindings close over document-local `_id`
and `_ref` identities. Source-document identity is retained only as provenance.

`CjsCharacterAppearancePlan` is an ordinary `CjsModel` under
`src/character/model/planning`: inherited `from`, `SetValues`, `GetValues`, and
`Clone` own hydration and serialization. Pass-array position is authoritative
composition order. Logical operations, blends, and write masks cross the
boundary; shader paths, render targets, live textures, decoded bytes, GPU
constants, and cache objects do not.

The first source-to-plan resolver stage projects exact selections and colour
selections, follows bounded exact typed dependencies, and retains proved
utility-shape target weights. Recursive dependency policy, LOD, materials,
texture roles, coverage, targets, bindings, and composition passes remain
unresolved. It emits diagnostics rather than promoting the working demo's
heuristics into source data. There is no plan execution adapter.

## Appearance realization boundary

`CjsCharacter`, `CjsCharacterAppearanceConstruction`, and
`CjsCharacterAppearanceManager` form the shared CPU lifecycle. They resolve
source-backed selections, build serializable construction intent, serialize
revisions, and retain an opaque committed stage. They do not fetch asset bytes,
decode GR2, allocate GPU resources, bind effects, or examine the stage.

An injected appearance AL owns `Prepare`, `Commit`, and `Release` for that
opaque stage. A backend may add an implementation beneath
`src/character/gles`, `src/character/webgl2`, or a future implemented
`src/character/webgpu` directory. It receives its resource access and native
factories from the host; there is no Node/local-file fallback. Backend modules
are explicit subpath imports and must not be re-exported by
`src/character/index.js`.

`@carbonenginejs/runtime/character/gles` currently contains a small, explicit
reference backend seam rather than a monolithic adapter:

- `CjsCharacterGlesAppearanceAL` owns the backend Prepare →
  Commit/Handoff → Release transaction while hosts own all Tw2 scene/resource work;
- `CjsCharacterGlesFoundationTranslator` converts neutral foundation intent
  into the reviewed GLES operation shape;
- `CjsCharacterGlesAtlasPlacement` preserves and validates authored
  normalized atlas placement without loading a resource or touching a target;
- `CjsCharacterGlesPaletteCompatibility` applies the temporary 58-bone
  right-hand workaround;
- `CjsCharacterGlesAtlasPlanning` turns retained metadata into detached
  texture-composition pass descriptors; and
- `CjsCharacterGlesAtlasRenderer` executes those descriptors only through
  an injected atlas host and guarantees reverse-order cleanup;
- `CjsCharacterGlesTriangleCoverage` owns reversible coverage leases for
  realized index buffers; and
- `CjsCharacterGlesMorphDeformation` owns reversible vertex morph leases.

The palette, coverage, and morph helpers operate only through an injected geometry host. That host
provides mesh discovery, system-mirror readiness, vertex-layout lookup, buffer
upload, and bounds rebuilding; it is the only code that knows about Tw2/GR2 or
the current WebGL context. The helpers retain no global facade and cannot read
files or fetch assets. The atlas renderer has a separate injected host for target
creation, effect preparation, pass execution, finalization, and reverse-order
cleanup. The remaining legacy configured-material execution, resource acquisition,
and Ccpwgl scene attachment are host implementations behind this same AL boundary.

Foundation and texture policy remain CPU data outputs: they identify resource
paths, selected texture candidates, coverage roles, and provenance. A backend
translator selects its own shader, proof surface, palette workaround, mask
implementation, and GPU resource representation. This lets the current GLES
reference and the WebGL2/DX11 target consume one construction sequence without
making either renderer's implementation detail a character-library fact.

## Current Carbon boundary

Every current Carbon-derived `Tr2*`, `Tri*`, interface, helper struct, enum, and
`Wod*` identity owned here belongs under `src/character/trinity` in its source family.
Carbon headers and implementations are authoritative. Incomplete behavior
remains explicit and must not be inferred from historical JavaScript.

`CjsCharacterRigBinding` is a CarbonEngineJS CPU adapter retained because the
current `Tr2SkinnedObject.UpdateBones` implementation uses it for exact-name
rig mapping and native 3x4 palette packing. It is independent of the removed
schema-v1/v2 character model.

## Historical Incarna boundary

An identity absent from the current Carbon checkout does not belong in
`src/character/trinity`. If reviewed historical records require it, the smallest honest
hydration contract belongs under `src/character/incarna` with its evidence and without a
claim of current Carbon parity.

The first bounded tranche contains `Tr2InteriorCell`, `Tr2ColorCurve`,
`Tr2ColorKey`, `Tr2ScalarCurve`, and `Tr2ScalarKey`. Their field surfaces are
corroborated by records that reached end-of-object and end-of-file under the
labelled historical Black schema hypothesis. The curve behavior is a compact
adaptation of historical Curve2 evaluation semantics; it does not import the
old `Tw2Curve` parent or static testing surface.
These exact identities and layouts are absent from @carbonenginejs/runtime/trinity; its current
Carbon `Tr2CurveColor`, `Tr2CurveScalar`, and `Tr2CurveScalarKey` remain the
modern authority.

`WodPlaceableRes` is a current Carbon resource identity. Its class ownership
therefore belongs to `@carbonenginejs/runtime/resource`, not this package, even though current
interior classes can refer to it by schema name.

## Resource boundary

Character documents and native graphs may expose resource paths. The library
builder can acquire and decode the twelve static-data cFSD documents through
`@carbonenginejs/runtime/resource`, but it does not download or embed selected character asset
bytes. Asset acquisition, decoding, caching, preparation, and lifecycle belong
to `@carbonenginejs/runtime/resource` and outer adapters;
render realization belongs to an engine.

Separately published definition records are build inputs, while the runtime
consumes one combined catalog. `CjsCharacterLibraryManager` may call one
injected object-loader function to obtain that combined document, but it does
not discover its source items or load the runtime assets referenced by them.
Tools-core may provide exact-build bytes to `buildFromResources()` and persist
the resulting `library.GetValues()` without owning a second build algorithm.

PNG container inspection remains owned by @carbonenginejs/runtime/resource. The optional
`characterTextureMetadata` catalog stores only normalized placement facts and
the exact `res:/` path used as its `recordID`. A producer may populate it from
cached exact-build bytes. A runtime consumer may fill a missing record through
`InspectResourceForData` through a configured @carbonenginejs/runtime/resource manager;
the new record follows the same named mutation/event contract as editor-added
records. Schemas 7 and 8 hydrate with an empty metadata catalog.

## Removed compatibility surface

The schema-v1/v2 `CjsCharacter*` graph, recipes, parts, materials, controls,
visemes, deformation records, and library hydrator were based on superseded
data structures. They were removed rather than treated as authority for the
new document corpus. Consumers must migrate to the schema-v10 builder and the
new direct source-record library.
