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
not fetch, decode, or identify a source format. Each non-empty source
record-map key is copied into the named `recordID` field. Existing fields such
as `typeID` remain ordinary domain data. Unknown fields and incompatible nested
model shapes are rejected so a successful build cannot silently lose values
during hydration.

Supplied `characterDefinitions` records preserve the decoder's JSON in their
`values` field. Their typed profile catalogs are additional lookup structures;
consumers can still inspect an exact decoded definition when no typed
projection exists yet.

The builder projects proven relationships using native `_id` and `_ref`
metadata. Supplied graph metadata is preserved and reserved against generated
relationship IDs; a later `GetValues({ refs: true })` export may assign a new
equivalent set of graph-local tokens. They are not record, type, race,
resource, or other domain identities. `_type` remains the registered Carbon
model selector.

## Mutate editor items

Same-shaped JSON values can be hydrated directly into their declared document
type and added in one operation:

```js
const resource = library.Create("characterResources", resourceValues);
```

An editor can add an already-hydrated item without converting it back through
plain values:

```js
const resource = new CjsCharacterResource();
resource.SetValues(resourceValues);

library.Add("characterResources", resource);
```

The exact object is retained. `Create` and `Add` reject a duplicate `recordID`;
`Add` also rejects the wrong model class. `Remove` detaches, `Delete` accepts an
optional explicit `delete` teardown callback, and `Clear` empties a named
document. These methods lazily invalidate only the affected private lookup
index.

Listen for `recordadded`, `recordremoved`, `recorddeleted`, or
`documentcleared` on the library to update an editor incrementally. Call
`library.Reindex()` after directly replacing entries in a public document
array, because direct array writes deliberately bypass model mutation helpers.

## Install one combined runtime library

The manager accepts either the hydrated combined library or its same-shaped
plain values:

```js
import { CjsCharacterLibraryManager } from "@carbonenginejs/runtime-character";

const manager = new CjsCharacterLibraryManager(library);
```

An outer runtime can supply a structural loader for the combined document:

```js
manager.SetResourceLoader(path => runtime.FetchObject(path));
await manager.LoadLibraryAsync("res:/character/character-library.json");
```

The loader owns acquisition and decoding. It returns an object, not bytes.
Runtime-character deduplicates equivalent in-flight loads but does not become a
persistent resource cache. Starting a distinct asynchronous library request
supersedes older pending requests, even when the newer loader returns no value;
an older result never installs after a newer request has started.

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

The current resolver can produce the exact first-stage plan directly from one
hydrated paper doll:

```js
import {
    CjsCharacterAppearanceResolver,
    CjsCharacterLibrary
} from "@carbonenginejs/runtime-character";

const library = CjsCharacterLibrary.from(libraryValues);
const paperdoll = library.Get("paperdolls", paperdollID);
const resolved = CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll);
```

This stage preserves modifier selections and emits a plan contribution for
every strict source-version match. It fills configuration and geometry only
when that version contains exactly one candidate of each. Its
`layers` collection records owner/contributor relationships, not atlas order.
Effective version metadata contributes the five verified modifier-order flags,
but this policy normalization does not reorder `plan.layers`. Raw dependency
and occlusion strings remain untouched and produce one precise diagnostic per
value; they do not create, remove, or redirect parts. Unknown modifier
categories are retained and diagnosed rather than dropped.

Until later stages supply decoded resource facts or explicit policy, textures,
coverage, targets, passes, and bindings remain empty and diagnostics explain
the unresolved work.

## Runtime boundary

The library and appearance plan are GPU-free. They may contain resource paths,
but resource discovery, byte fetching, decoding, caching, and render
realization remain outside `runtime-character`. The library manager only
orchestrates a caller-provided object loader for the one combined document.
