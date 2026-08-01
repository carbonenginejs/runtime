# Runtime character architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Maintainers and runtime integrators
Summary: Separates transparent character documents, current Carbon classes, and historical Incarna contracts.

## Source states

```text
caller JSON
    |
    v
CjsCharacterLibraryBuilder -> schema-v3 plain JSON
    |
    v
CjsCharacterDocumentLibrary -> document lookup and explicit reference resolution

current Carbon source ----------> src/trinity
historical Incarna evidence ----> src/incarna
```

These lanes do not imply conversion between one another.

## Character document boundary

The builder accepts named plain-JSON record maps. It copies unknown fields and
projects only established identifier relationships. The document wrapper
validates and indexes the resulting JSON without creating part, recipe,
material, face, deformation, LOD, or control objects.

Document names are the type scope. A record therefore does not receive `_type`
unless a future document is proven to contain multiple semantic types. `_id`
is added only to existing records targeted by a relationship; relationships
are `{ "_ref": id }`. Missing targets remain dangling references.

When evidence supports a semantic record class, it may extend `CjsModel` and
hydrate directly with `CjsCharacterThing.from(record)`. The runtime must not
reintroduce a guessed normalization layer between JSON and those models.

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

## Removed compatibility surface

The schema-v1/v2 `CjsCharacter*` graph, recipes, parts, materials, controls,
visemes, deformation records, and library hydrator were based on superseded
data structures. They were removed rather than treated as authority for the
new document corpus. Node tooling that consumed those types must migrate to
the schema-v3 builder and document wrapper.
