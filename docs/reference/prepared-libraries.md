# Character library document contract

Status: Evolving
Scope: `@carbonenginejs/runtime-character` schema-v4 input and lookup
Audience: Library producers and runtime consumers
Summary: Defines the model-shaped JSON document accepted by the character-library builder and runtime model.

## Shape

`CjsCharacterLibraryBuilder` converts twelve caller-supplied record maps into
JSON whose fields match `CjsCharacterLibrary`:

```json
{
  "schema": "carbonenginejs.characterLibrary",
  "schemaVersion": 4,
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
- `paperdolls`; and
- `races`.

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
- paperdoll `backgroundID` to portrait resources.

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
families, and reserves `_id`, `_ref`, `_type`, and `recordID` in raw source
records. It performs no acquisition, FSD decoding, resource loading, policy
resolution, or rendering.
