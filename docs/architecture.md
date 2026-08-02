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
CjsCharacterLibraryBuilder -> schema-v5 plain JSON
    |
    v
CjsCharacterLibrary.from / instance.SetValues
    -> same-shaped hydrated source records in src/character
    |
    +-> CjsCharacterLibraryManager
        -> direct combined-library installation or injected object loading
        -> private lookup indexes
    |
    v
future source-to-plan resolver
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

`CjsCharacterLibrary.from(bigJSON)` hydrates eighteen established document
families into direct source-record classes under `src/character` without
changing the public field layout. Twelve direct source documents are required;
six optional catalogs fold published part types, exact resource candidates,
metadata, materials, projections, and recipes into the same document. Applying
the same values with `SetValues` produces the same model graph.
`GetValues({ refs: true })` returns serializable model-shaped values; graph
tokens may be renumbered without changing identity relationships.

Zero relationship sentinels become `null`. A positive missing target remains
its named identifier value rather than becoming an unresolved `_ref` or an
invented placeholder model.

The hydrated source records do not create render parts, material plans, LOD
bundles, or atlas passes. Those belong to a later resolver layer whose output
is the separate backend-neutral appearance-plan contract. Prototype rendering
is supporting evidence, not the source-record schema.

## Appearance-plan boundary

The schema-v1 appearance plan is a standalone JSON graph, not an extension of
the schema-v5 source library. Its selections, resolved parts, layers, textures,
coverages, composition targets, and bindings close over document-local `_id`
and `_ref` identities. Source-document identity is retained only as provenance.

`CjsCharacterAppearancePlan` is an ordinary `CjsModel` under
`src/character/planning`: inherited `from`, `SetValues`, `GetValues`, and
`Clone` own hydration and serialization. Pass-array position is authoritative
composition order. Logical operations, blends, and write masks cross the
boundary; shader paths, render targets, live textures, decoded bytes, GPU
constants, and cache objects do not.

There is not yet a source-to-plan resolver or a plan execution adapter. The
contract makes those future responsibilities explicit without promoting the
working demo's heuristics into source data.

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

## Removed compatibility surface

The schema-v1/v2 `CjsCharacter*` graph, recipes, parts, materials, controls,
visemes, deformation records, and library hydrator were based on superseded
data structures. They were removed rather than treated as authority for the
new document corpus. Consumers must migrate to the schema-v5 builder and the
new direct source-record library.
