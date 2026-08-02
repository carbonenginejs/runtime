# Character library document contract

Status: Evolving
Scope: `@carbonenginejs/runtime-character` schema-v5 input and lookup
Audience: Library producers and runtime consumers
Summary: Defines the model-shaped JSON document accepted by the character-library builder and runtime model.

## Shape

`CjsCharacterLibraryBuilder` converts twelve required caller-supplied record
maps plus six optional prepared profile catalogs into JSON whose fields match
`CjsCharacterLibrary`:

```json
{
  "schema": "carbonenginejs.characterLibrary",
  "schemaVersion": 5,
  "sourceBuild": "example-build",
  "documents": {
    "ancestries": [
      {
        "recordID": "1",
        "bloodlineID": { "_ref": 1 }
      }
    ],
    "bloodlines": [
      {
        "recordID": "2",
        "raceID": { "_ref": 2 },
        "_id": 1
      }
    ],
    "races": [
      {
        "recordID": "3",
        "nameID": "1003",
        "_id": 2
      }
    ]
  }
}
```

The complete value contains these document arrays:

- `ancestries`;
- `archetypes`;
- `bloodlines`;
- `characterAvatarBehaviors`;
- `characterColorLocations`;
- `characterColorNames`;
- `characterModifierLocations`;
- `characterPortraitResources`;
- `characterResources`;
- `characterSculptingLocations`;
- `paperdolls`;
- `races`;
- `characterPartTypes`;
- `characterPartSources`;
- `characterPartMetadata`;
- `characterMaterialProfiles`;
- `characterProjectionProfiles`; and
- `characterRecipeProfiles`.

The first twelve arrays are required source-document inputs. The final six are
optional and default to empty arrays. They fold published definition facts and
exact external resource candidates into the same runtime catalog.

Each source record-map key becomes `recordID`. That is the source document
record identity. Other identities keep their authored names: for example,
`typeID`, `raceID`, and `paperdollResourceID` are not rewritten as `_id`.

## Graph metadata

`_id` and `_ref` preserve object identity only within one serialized model
graph. They are deliberately unrelated to `recordID` or any other domain ID.
Only a target that is referenced needs `_id`.

The builder currently projects these proven relationships:

- ancestry `bloodlineID` to bloodline;
- bloodline `raceID` to race;
- character-resource clothing category fields to modifier locations;
- paperdoll modifier locations and resources;
- paperdoll color locations and color names;
- paperdoll sculpting locations; and
- paperdoll `backgroundID` to portrait resources;
- part-type `partSource` to an exact prepared source record;
- part-source `metadata` to an exact authored metadata record; and
- character-resource `resPath` to `partType` only when an exact type-profile
  record exists. The authored `resPath` remains unchanged.

A zero source identity becomes `null`. A positive missing target remains its
named identifier value, making the dangling source fact visible without
creating an unresolved `_ref` or placeholder object.

## Hydration

The JSON and model layouts are the same:

```js
const from = CjsCharacterLibrary.from(values);

const assigned = new CjsCharacterLibrary();
assigned.SetValues(values);
```

Both produce equivalent graphs. `library.documents.races` contains hydrated
`CjsCharacterRace` instances; relationship fields point directly at their
target models.

Convenience lookup uses `recordID`:

```js
const race = library.Get("races", raceID);
const races = library.GetDocument("races");
```

There is no document-only wrapper, retained alternate JSON value, or private
identity conversion convention.

## Serialization

The inherited model export preserves shared relationships when requested:

```js
const values = library.GetValues({ refs: true });
const json = JSON.stringify(values);
const roundTrip = CjsCharacterLibrary.from(JSON.parse(json));
```

The emitted graph tokens can differ from the input tokens. Only the graph
relationships must remain equivalent.

## Builder boundary

The builder accepts plain JSON values, rejects missing or unmodelled document
families, blank source record keys, unknown model fields, and incompatible
nested model shapes. It reserves `_id`, `_ref`, `_type`, and `recordID` in raw
source records. It performs no acquisition, byte decoding, resource loading,
policy resolution, or rendering. Successful builder output therefore hydrates
without silently discarding input fields.

The prepared catalogs contain only source-backed values:

- `characterPartTypes`: logical source path, sex, part path, optional resource
  version, optional color variant, and an optional exact source relationship;
- `characterPartSources`: source folder identity and ordinary version records
  containing exact configuration, geometry, and texture candidate paths;
- `characterPartMetadata`: authored dependency, occlusion, replacement, swap,
  loose-top, boot-shin, sound, and color-area fields;
- `characterMaterialProfiles`: authored colors, pattern values, transforms,
  rotations, and specular colors;
- `characterProjectionProfiles`: authored projection values and external
  texture/mask paths; and
- `characterRecipeProfiles`: authored sex and unlinked selection/material
  entries.

Every catalog record also contains its source-map key as `recordID`. Their
exact model-shaped fields are:

| Collection | Record fields | Nested value shape |
| --- | --- | --- |
| `characterPartTypes` | `sourcePath`, `sex`, `partPath`, `resourceVersion`, `colorVariant`, `partSource` | `partSource` is an exact relationship or unresolved named identity. |
| `characterPartSources` | `sourcePath`, `sex`, `partPath`, `versions`, `metadata` | Each version has `resourceVersion`, `configurationCandidates`, `geometryCandidates`, and `textureCandidates`; `metadata` is an exact relationship or unresolved named identity. |
| `characterPartMetadata` | `sourcePath`, `alternativeTextureSourcePath`, `forcesLooseTop`, `hidesBootShin`, `lod1Replacement`, `lod2Replacement`, `numColorAreas`, `dependentModifiers`, `occludesModifiers`, `soundTag`, `swapTops`, `swapBottom`, `swapSocks`, `wap` | Dependency and occlusion fields are string arrays. |
| `characterMaterialProfiles` | `sourcePath`, `colors`, `pattern`, `patternColors`, `patternTransform`, `patternRotation`, `specularColors` | Every color entry is `{ "value": [r, g, b, a] }`. |
| `characterProjectionProfiles` | `sourcePath`, `label`, `mode`, `angleRotation`, `aspectRatio`, `azimuth`, `texturePath`, `maskPath`, `headEnabled`, `bodyEnabled`, `flipX`, `flipY`, `height`, `incline`, `layer`, `maskPathEnabled`, `offset`, `pitch`, `planarBeta`, `planarScale`, `position`, `radius`, `roll`, `scale`, `yaw` | `offset` is a two-value vector and `position` is a three-value vector. |
| `characterRecipeProfiles` | `sourcePath`, `sex`, `entries` | Each entry has `category`, `path`, `weight`, `colorVariation`, `colors`, `specularColors`, `pattern`, `patternColors`, `patternTransform`, and `patternRotation`; color entries use the same `{ "value": [...] }` shape. |

Candidate arrays do not assert semantic selection. The combined library does
not contain inferred model families, filename-derived texture roles, compiled
recipe links, material fallbacks, or LOD/configuration/geometry pairings.
External configuration graphs, geometry data, images, animations, and effects
remain resource-manager inputs rather than embedded library objects.

## Combined catalog and editor mutation

The eighteen collections form one combined runtime catalog. Individually
published definition files are producer inputs; a runtime frontend does not
reconstruct this catalog from them.

An editor may add an already-hydrated record with
`library.Add(documentName, record)`. The library preserves that exact instance
and relies on normal object references plus inherited graph serialization.
Private lookup indexes are runtime state and are excluded from the JSON shape.

`CjsCharacterLibraryManager` can install the combined model directly or obtain
its decoded object through one injected loader. Plain installed values must
contain all eighteen document arrays and must pass the same no-loss shape
check. The loader is not part of the library document and does not load the
external assets named by its records.
