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

The builder projects proven relationships using native `_id` and `_ref`
metadata. Those tokens are local to the serialized graph and may be renumbered.
They are not record, type, race, resource, or other domain identities.

## Add hydrated editor items

An editor can add an already-hydrated item without converting it back through
plain values:

```js
const resource = new CjsCharacterResource();
resource.SetValues(resourceValues);

library.Add("characterResources", resource);
```

The exact object is retained. `Add` rejects the wrong model class or a duplicate
`recordID`. It also invalidates the affected private lookup index. Call
`library.Reindex()` after directly replacing entries in a public document
array.

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

This stage preserves modifier selections and emits a part only for a strict
version containing exactly one configuration and one geometry candidate. Its
`layers` collection records owner/contributor relationships, not atlas order.
Until later stages supply decoded resource facts or explicit policy, textures,
coverage, targets, passes, and bindings remain empty and diagnostics explain
the unresolved work.

## Runtime boundary

The library and appearance plan are GPU-free. They may contain resource paths,
but resource discovery, byte fetching, decoding, caching, and render
realization remain outside `runtime-character`. The library manager only
orchestrates a caller-provided object loader for the one combined document.
