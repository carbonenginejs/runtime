# Character library document contract

Status: Evolving
Scope: `@carbonenginejs/runtime-character` schema-v10 input and lookup
Audience: Library producers and runtime consumers
Summary: Defines the model-shaped JSON document accepted by the character-library builder and runtime model.

## Shape

`CjsCharacterLibraryBuilder` converts twelve required caller-supplied record
maps plus one optional lossless decoded-definition catalog and seven optional
derived profile catalogs into JSON whose fields match `CjsCharacterLibrary`:

```json
{
  "schema": "carbonenginejs.characterLibrary",
  "schemaVersion": 10,
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
- `characterDefinitions`;
- `characterPartTypes`;
- `characterPartSources`;
- `characterPartMetadata`;
- `characterMaterialProfiles`;
- `characterProjectionProfiles`; and
- `characterRecipeProfiles`;
- `characterTextureMetadata`.

The first twelve arrays are required source-document inputs. The final eight
are optional and default to empty arrays. `characterDefinitions` retains each
supplied decoded authoring definition. The other seven arrays are additive typed
projections and exact external resource inventories; they never replace the
retained definition records.

`characterTextureMetadata` stores raw PNG ancillary facts plus additive,
explicitly experimental normalized character-atlas values. Its `recordID` is
the extension-neutral resource name, while `sourcePath` identifies the exact
PNG inspected. Texture candidate paths and image bytes remain unchanged.

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
- part-type `partSource` and `partSources` to exact prepared source records;
- part-source `metadata` to an exact authored metadata record;
- part-source version `metadata` to its effective authored metadata record;
- metadata dependency/occlusion `partSource` to an exact part source;
- metadata dependency/occlusion `modifierLocation` to an exact modifier
  location; and
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
nested model shapes. `recordID` remains reserved for the source-map key.
`_type`, `_id`, and `_ref` retain their Carbon graph-hydration meaning: existing
graph IDs are validated and reserved, and relationship projection generates
non-colliding IDs only for referenced targets that still need one. They never
replace `recordID`, `typeID`, or another named domain identity. The builder
performs no acquisition, byte decoding, resource loading, policy resolution,
or rendering. Successful builder output therefore hydrates without silently
discarding input fields.

The prepared catalogs contain only source-backed values:

- `characterDefinitions`: exact indexed source path, source extension, and the
  decoder's losslessly retained JSON value;

- `characterPartTypes`: exact definition paths, logical part path, optional
  resource version and color variant, retained bloodline identities, and exact
  source relationships;
- `characterPartSources`: logical source identity, every exact authored source
  folder, and ordinary version records containing exact configuration,
  geometry, and texture candidate paths;
- `characterPartMetadata`: authored dependency, occlusion, replacement, swap,
  loose-top, boot-shin, sound, and color-area fields;
- `characterMaterialProfiles`: authored colors, pattern values, transforms,
  rotations, and specular colors;
- `characterProjectionProfiles`: authored projection values and external
  texture/mask paths; and
- `characterRecipeProfiles`: authored sex and unlinked selection/material
  entries.

These three profile catalogs are supported schema surfaces, not a claim about
the current producer output. In the currently reviewed schema-v10 build,
`characterMaterialProfiles`, `characterProjectionProfiles`, and
`characterRecipeProfiles` are empty. Material, projection, and recipe values
remain available in `characterDefinitions`, but no typed profile link yet joins
them to a selected part. Consumers must diagnose that missing join rather than
assuming the optional catalogs were populated.

Every catalog record also contains its source-map key as `recordID`. Their
exact model-shaped fields are:

| Collection | Record fields | Nested value shape |
| --- | --- | --- |
| `characterDefinitions` | `sourcePath`, `extension`, `values` | `values` is any JSON scalar, array, object, or `null` emitted by the source decoder. It is authoritative source evidence even when no typed catalog projection exists. |
| `characterPartTypes` | `sourcePath`, `sourcePaths`, `sex`, `partPath`, `resourceVersion`, `colorVariant`, `bloodlineIDs`, `partSource`, `partSources` | `sourcePaths` retains every exact definition path. `partSources` retains every exact sex-specific source relationship; `partSource` is present only when that relationship is unique. `bloodlineIDs` retains authored bloodline identities but does not assert availability, allow-list, or deny-list semantics. |
| `characterPartSources` | `sourcePath`, `sourcePaths`, `sex`, `partPath`, `versions`, `metadata` | `sourcePaths` is the complete authored folder list; `sourcePath` is its deterministic first entry for single-path consumers. Each version has `resourceVersion`, effective `metadata`, `configurationCandidates`, `geometryCandidates`, and `textureCandidates`; metadata fields are exact relationships or unresolved named identities. Version candidate arrays are a self-contained effective inventory, not implicit overrides of the unversioned record. |
| `characterPartMetadata` | `sourcePath`, `alternativeTextureSourcePath`, `forcesLooseTop`, `hidesBootShin`, `lod1Replacement`, `lod2Replacement`, `numColorAreas`, `dependentModifiers`, `occludesModifiers`, `dependencies`, `occlusions`, `soundTag`, `swapTops`, `swapBottom`, `swapSocks`, `wap` | Raw dependency and occlusion fields remain string arrays. Each ordered `CjsCharacterModifierReference` retains `authoredValue`, an optional normalized unsuffixed `modifierPath`, and optional exact `partSource` and `modifierLocation` relationships. |
| `characterMaterialProfiles` | `sourcePath`, `colors`, `pattern`, `patternColors`, `patternTransform`, `patternRotation`, `specularColors` | Every color entry is `{ "value": [r, g, b, a] }`. |
| `characterProjectionProfiles` | `sourcePath`, `label`, `mode`, `angleRotation`, `aspectRatio`, `azimuth`, `texturePath`, `maskPath`, `headEnabled`, `bodyEnabled`, `flipX`, `flipY`, `height`, `incline`, `layer`, `maskPathEnabled`, `offset`, `pitch`, `planarBeta`, `planarScale`, `position`, `radius`, `roll`, `scale`, `yaw` | `offset` is a two-value vector and `position` is a three-value vector. |
| `characterRecipeProfiles` | `sourcePath`, `sex`, `entries` | Each entry has `category`, `path`, `weight`, `colorVariation`, `colors`, `specularColors`, `pattern`, `patternColors`, `patternTransform`, and `patternRotation`; color entries use the same `{ "value": [...] }` shape. |
| `characterTextureMetadata` | `sourcePath`, `sourceFormat`, `width`, `height`, raw `oFFs`/`pHYs` values and units, normalized `offsetX`/`offsetY`/`extentX`/`extentY`, metadata flags, `placementEncoding`, `placementPolicy`, `placementStatus` | `recordID` is the extension-neutral resource name. Raw PNG facts remain exact. Normalized millionths values are additive character policy and are labelled `experimental-policy`, not PNG semantics. |

Schema v10 does not infer resource relationships. A producer that reads sparse
baseline-plus-override authoring data must materialize effective candidate
arrays and metadata for every published version before building the combined
library. Empty arrays mean no candidates; the runtime resolver never merges
version records.

The tools-core producer projects an exact decoded `metadata.yaml` object into
`characterPartMetadata` and links it to its baseline or ordinary
`v<number>` source folder. The authoritative `characterDefinitions` value is
retained unchanged; only the additive typed record maps the authored
`dependantModifiers` spelling to `dependentModifiers`. Metadata folders with
no selectable `.type` remain available as metadata-only part sources with
their exact indexed candidates. An ordered modifier reference sits beside each
unchanged raw dependency or occlusion value. The producer resolves only a safe
unsuffixed path with an exact source/index or modifier-location join. Optional
suffixes remain opaque; neither hydration nor the runtime resolver parses them.

Candidate arrays do not assert semantic selection. The combined library does
not contain inferred model families, filename-derived texture roles, compiled
recipe links, material fallbacks, or LOD/configuration/geometry pairings.
External configuration graphs, geometry data, images, animations, and effects
remain resource-manager inputs rather than embedded library objects.

One published character resource can use the same definition identity for
more than one sex. The appearance resolver selects an exact source from
`partSources` through the resource's authored `resGender`. Missing or multiple
matches remain diagnostics. It never selects the deterministic `sourcePath`
representative as rendering policy.

## Combined catalog and editor mutation

The twenty collections form one combined runtime catalog. Individually
published definition files are producer inputs; their decoded values survive
inside `characterDefinitions`, so a runtime frontend does not reconstruct the
catalog from the publication files.

An editor may hydrate and insert same-shaped values with
`library.Create(documentName, values)`, or add an already-hydrated record with
`library.Add(documentName, record)`. The latter preserves that exact instance.
`Remove` detaches a record, `Delete` additionally runs an optional explicit
domain teardown callback, and `Clear` empties one document without guessing
record destruction.

These operations apply the document property's normal flag/update contract.
Each collection has a lazy private-index invalidation flag, consumed when that
document is next queried. The library emits `recordadded`, `recordremoved`,
`recorddeleted`, and `documentcleared` so an editor can react to incremental
changes. Private indexes and flags are runtime state and are excluded from the
JSON shape. Direct array mutation remains possible because the arrays are the
model fields; call `Reindex()` after bypassing the named methods.

`CjsCharacterLibraryManager` can install the combined model directly or obtain
its decoded object through one injected loader. Plain schema-v10 values contain
all twenty document arrays and pass the same no-loss shape check. Schemas 7,
8, and 9 remain readable and migrate to schema v10; schemas 7 and 8 predate
the texture-metadata array and therefore normalize it to an empty catalog.

A configured runtime-resource manager supports incremental inspection through
`library.InspectResourceForData(path)`. The library first returns an existing
extension-neutral metadata record. Otherwise it requests the corresponding
`.png` representation through `resMan.GetObject`; ResMan reuses a resident raw
PNG resource or performs its ordinary source read and keeps the resulting
resource available. Passing the extension-neutral name, `.dds`, or `.png`
addresses the same library record. Concurrent requests share one operation,
and successful discovery uses the ordinary `recordadded` mutation event.
