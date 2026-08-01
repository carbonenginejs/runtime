# Character document libraries

Status: Evolving
Scope: `@carbonenginejs/runtime-character` schema-v3 input and lookup
Audience: Library producers, runtime integrators, and maintainers
Summary: Defines the transparent source-neutral character JSON contract.

## Document shape

`CjsCharacterLibraryBuilder` produces:

```json
{
  "schema": "carbonenginejs.characterLibrary",
  "schemaVersion": 3,
  "documents": {
    "ancestries": {},
    "archetypes": {},
    "bloodlines": {},
    "characterAvatarBehaviors": {},
    "characterColorLocations": {},
    "characterColorNames": {},
    "characterModifierLocations": {},
    "characterPortraitResources": {},
    "characterResources": {},
    "characterSculptingLocations": {},
    "paperdolls": {},
    "races": {}
  }
}
```

Every document is a plain JSON object keyed by source record identity. All
twelve named documents are required, even when a source supplies an empty
record map. Additional named record maps are retained in deterministic name
order.

## Transparent records

Unknown fields are copied unchanged. The builder does not infer meaning from
paths, names, values, or optional fields. Record identities are serialized as
strings so large integers remain lossless.

The document name is the record-type scope. `_type` is not added because each
current document has one named record family. A future mixed-type document may
justify a discriminator when a real consumer requires it.

## Relationships

Only established relationships are rewritten:

- `ancestries.bloodlineID` → `bloodlines`;
- `bloodlines.raceID` → `races`;
- paperdoll modifier locations → `characterModifierLocations`;
- paperdoll resources → `characterResources`;
- paperdoll color locations → `characterColorLocations`;
- paperdoll color names → `characterColorNames`; and
- paperdoll sculpt locations → `characterSculptingLocations`.

For those fields, the authored identifier becomes `{ "_ref": id }`. An
existing target receives `_id` only when at least one relationship references
it. Missing targets remain dangling `_ref` values; the builder does not add a
placeholder or discard the authored value.

```json
{
  "ancestries": {
    "100": {
      "bloodlineID": { "_ref": "10" }
    }
  },
  "bloodlines": {
    "10": {
      "_id": "10",
      "raceID": { "_ref": "1" }
    }
  }
}
```

Identities are scoped to their target document. Resolving a reference therefore
always requires the target document name.

## Runtime wrapper

`CjsCharacterDocumentLibrary` validates and detaches one schema-v3 value. It
provides document listing, record lookup, and explicit reference resolution.
It does not hydrate any record into a semantic `CjsModel`.

When a source-backed semantic model is added, callers may hydrate it directly:

```js
const value = CjsCharacterRace.from(
    library.Get("races", raceID)
);
```

No schema-v1/v2 compatibility conversion is provided. The former normalized
graph model was based on superseded data structures and has been removed.

## Producer boundary

Acquisition adapters own source selection and exact-build policy. This package
owns deterministic in-memory construction, relationship projection,
validation, and lookup. It does not inspect an installed client, download
inputs, decode source formats, write artifacts, or fetch character assets.
