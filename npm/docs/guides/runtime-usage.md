# Runtime character usage

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Runtime and application integrators
Summary: Builds model-shaped character JSON and hydrates its source-backed record graph.

## Build and hydrate a character library

The builder takes either an object keyed by document name or an array of
`{ name, data }` descriptors:

```js
import {
    CjsCharacterLibrary,
    CjsCharacterLibraryBuilder
} from "@carbonenginejs/runtime-character";

const values = CjsCharacterLibraryBuilder.buildFromInputs({
    documents,
    sourceTarget: "example",
    sourceBuild: "1"
});

const library = CjsCharacterLibrary.from(values);
```

The builder is deterministic when caller metadata is deterministic. It does
not fetch, decode, or identify a source format. Each source record-map key is
copied into the named `recordID` field. Existing fields such as `typeID` remain
ordinary domain data.

The builder projects proven relationships using native `_id` and `_ref`
metadata. Those tokens are local to the serialized graph and may be renumbered.
They are not record, type, race, resource, or other domain identities.

## Read records and relationships

```js
const ancestry = library.Get("ancestries", ancestryID);
const bloodline = ancestry.bloodlineID;
const race = bloodline.raceID;
```

Known relationship fields point directly at hydrated target models. Zero
sentinels become `null`. When a positive target is absent, the original named
identifier remains on that field rather than becoming an unresolved `_ref`.

Collections are also available through the JSON-shaped `documents` model:

```js
const races = library.documents.races;
const sameRaces = library.GetDocument("races");
```

## Equivalent model hydration

`from` and `SetValues` consume the same shape:

```js
const from = CjsCharacterLibrary.from(values);

const assigned = new CjsCharacterLibrary();
assigned.SetValues(values);
```

The two instances contain equivalent model graphs. There is no retained
alternate document or identity conversion layer.

## Serialize a model graph

Use the inherited `CjsModel` export contract when relationships must survive a
JSON round trip:

```js
const json = JSON.stringify(library.GetValues({ refs: true }));
const roundTrip = CjsCharacterLibrary.from(JSON.parse(json));
```

`refs: true` emits `_id` only for shared models and emits later occurrences as
`{ _ref }`. Identifier labels are not stable domain data; graph equivalence is
the contract.

The same rule applies to a standalone appearance plan:

```js
import { CjsCharacterAppearancePlan } from "@carbonenginejs/runtime-character";

const plan = CjsCharacterAppearancePlan.from(planValues);
const planJSON = JSON.stringify(plan.GetValues({ refs: true }));
```

`CjsCharacterAppearancePlan` does not override model lifecycle methods. It uses
inherited `from`, `SetValues`, `GetValues`, and `Clone`. A resolver or builder
is responsible for deciding operations, ordering, and policy before producing
`planValues`; model hydration does not invent or police those decisions.

## Runtime boundary

The library and appearance plan are GPU-free and I/O-free. They may contain
resource paths, but resource discovery, fetching, decoding, caching, and
render realization remain outside `runtime-character`.
