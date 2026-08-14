# Runtime character architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Maintainers and runtime integrators
Summary: Separates source-neutral character documents, current Carbon classes, and historical Incarna contracts.

## Source states

```text
caller JSON
    |
    v
CjsCharacterLibraryBuilder -> schema-v10 plain JSON
    |
    v
CjsCharacterLibrary.from / instance.SetValues
    -> same-shaped hydrated source records in src/character
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
CjsCharacterAppearancePlan.from -> hydrated plan records in src/character/planning

current Carbon source ----------> src/trinity
historical Incarna evidence ----> src/incarna
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
families into direct source-record classes under `src/character` without
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
`src/character/planning`: inherited `from`, `SetValues`, `GetValues`, and
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

## Current Carbon boundary

Every current Carbon-derived `Tr2*`, `Tri*`, interface, helper struct, enum, and
`Wod*` identity owned here belongs under `src/trinity` in its source family.
Carbon headers and implementations are authoritative. Incomplete behavior
remains explicit and must not be inferred from historical JavaScript.

`CjsCharacterRigBinding` is a CarbonEngineJS CPU adapter retained because the
current `Tr2SkinnedObject.UpdateBones` implementation uses it for exact-name
rig mapping and native 3x4 palette packing. It is independent of the removed
schema-v1/v2 character model.

## Historical Incarna boundary

An identity absent from the current Carbon checkout does not belong in
`src/trinity`. If pinned Incarna assets require it, the smallest honest
hydration contract belongs under `src/incarna` with its evidence and without a
claim of current Carbon parity.

The first bounded tranche contains `Tr2InteriorCell`, `Tr2ColorCurve`,
`Tr2ColorKey`, `Tr2ScalarCurve`, and `Tr2ScalarKey`. Their field surfaces are
corroborated by records that reached end-of-object and end-of-file under the
labelled historical Black schema hypothesis. The curve behavior is a compact
adaptation of historical Curve2 evaluation semantics; it does not import the
old `Tw2Curve` parent or static testing surface.
These exact identities and layouts are absent from runtime-trinity; its current
Carbon `Tr2CurveColor`, `Tr2CurveScalar`, and `Tr2CurveScalarKey` remain the
modern authority.

`WodPlaceableRes` is a current Carbon resource identity. Its class ownership
therefore belongs to `runtime-resource`, not this package, even though current
interior classes can refer to it by schema name.

## Resource boundary

Character documents and native graphs may expose resource paths. They do not
download or embed asset bytes. Resource acquisition, decoding, caching,
preparation, and lifecycle belong to `runtime-resource` and outer adapters;
render realization belongs to an engine.

Separately published definition records are build inputs, while the runtime
consumes one combined catalog. `CjsCharacterLibraryManager` may call one
injected object-loader function to obtain that combined document, but it does
not discover its source items or load the runtime assets referenced by them.

PNG container inspection remains owned by runtime-resource. The optional
`characterTextureMetadata` catalog stores only normalized placement facts and
the exact `res:/` path used as its `recordID`. A producer may populate it from
cached exact-build bytes. A runtime consumer may fill a missing record through
`InspectResourceForData` through a configured runtime-resource manager;
the new record follows the same named mutation/event contract as editor-added
records. Schemas 7 and 8 hydrate with an empty metadata catalog.

## Removed compatibility surface

The schema-v1/v2 `CjsCharacter*` graph, recipes, parts, materials, controls,
visemes, deformation records, and library hydrator were based on superseded
data structures. They were removed rather than treated as authority for the
new document corpus. Consumers must migrate to the schema-v10 builder and the
new direct source-record library.
