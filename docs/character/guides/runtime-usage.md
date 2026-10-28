# Runtime character usage

Status: Evolving
Reviewed: 2026-10-29
Scope: `@carbonenginejs/runtime/character`
Audience: Runtime and application integrators
Summary: Stores and writes flat typed character sources alongside the existing document graph.

## Store original character sources

Schema 13 adds flat typed holdings beside the existing document collections.
Shared configurations live in `generic`; each other source shape has its own
list. References remain the strings written by the source file. Black, texture,
clip, rig, state and static resources are stored as paths.

```js
import {
    CjsCharacterLibrary,
    CjsCharacterLibraryBuilder,
    CjsCharacterLibraryManager,
    CjsCharacterLibraryWriter
} from "@carbonenginejs/runtime/character";

const builder = new CjsCharacterLibraryBuilder({ paths: blue.paths, resMan: blue.resMan });
const library = await builder.Build({ lazy: true });
const manager = new CjsCharacterLibraryManager(null, { sourceBuilder: builder });
const names = await manager.ListColorVariationNames();
const color = await manager.GetColorVariation(names[0]);
const originalFormat = CjsCharacterLibraryWriter.write(color);

const snapshot = library.GetValues();
const restored = CjsCharacterLibrary.from(JSON.parse(JSON.stringify(snapshot)));
const restoredManager = new CjsCharacterLibraryManager(restored);
```

`Build()` eagerly loads all configured text families. `Build({ lazy: true })`
indexes them without reading their bytes. The first kind query loads that
family in groups of at most eight; simultaneous queries share the operation.
Camera and post families contain two shapes each, identified during reading.
Their `List…Names()` methods therefore load the shared family before listing
only the requested shape. `builder.ListSourceNames(kind)` lists candidates
without reading them. Binary path records never trigger binary acquisition.

The configuration owns the logical roots, match/kind rows, exclusions and
original-format layouts. It uses Blue's path filtering and object-loading
route. Install it before loading these sources through the same resource
manager. Unmatched YAML continues through the previous object builder.

Canonical source paths are lookup identities because filenames repeat across
folders. `GetPart(partPath)` joins metadata, types, local colour/projection
names and Black/texture paths. A relative paperdoll path is accepted only when
it identifies one indexed folder. The result also exposes modifier path and
weight separately, retaining the original strings on its metadata. Joins are
cached in `parts`; a missing or ambiguous target rejects explicitly.
`ResolveReference(path)` resolves an exact indexed source. `ResolveTypeColor`
uses the part and colour names explicitly stored in a `.type` record.

The library-owned `sourceNames` map pairs each list with its lookup names.
Use `AddKind(kind, name, record)` and `RemoveKind(kind, name)` to maintain both.
If editing paired arrays directly, keep their positions aligned and call
`Reindex()`. A snapshot contains loaded records, not pending lazy reads. It
preserves concrete native subclasses through the existing values type tags.
References in the original data are not replaced with hydrated relationships.

`CjsCharacterLibraryWriter.write(record)` also accepts newly created or
JSON-hydrated records. The declared kind layout supplies Python tuples,
object/unicode tags, numeric map keys and the optional recipe sex entry.
When a reader-owned source document is available, writing additionally keeps
its key order, optional-field presence, aliases, tag spelling and duplicate
mapping pairs. An edited field that was absent is written; an unchanged class
default does not invent an authored field. `sourceDocument` and `kind` may be
supplied explicitly when reattaching a source layout after hydration.

The general `CjsYamlFormat.write`/`Write` API accepts raw values, or an actual
`yaml.Document` with `{ input: "document" }`. Its optional `sourceDocument`
preserves layout while updating raw values. This AST is different from the
inventory record returned by `ReadDocument`. Divergent edits to an existing
alias reject rather than silently changing its anchor's other uses.

Null strings/lists become empty strings/lists in the character reading profile.
Native light flags authored as 0/1 become booleans. Sculpting limits explicitly
allow repeated keys and expose the final value while retaining source pairs;
other families remain strict. Numeric values are not rounded by this profile.
JSON itself converts negative zero to zero; canonical writing preserves the
values it receives after that conversion.

The existing schema 7–12 document APIs and `prepareCatalog` remain available.
Their legacy-only classes and preparation method have lifecycle records with
removal gates under the owning character layer. Schema 13 does not run their
relationship migration or material/texture preparation.


## Build and hydrate a character library

The builder takes either an object keyed by document name or an array of
`{ name, data }` descriptors:

```js
import {
    CjsCharacterLibrary,
    CjsCharacterLibraryBuilder
} from "@carbonenginejs/runtime/character";
import { CjsSchema } from "@carbonenginejs/runtime/schema";

const values = CjsCharacterLibraryBuilder.buildFromInputs({
    documents,
    sourceTarget: "example",
    sourceBuild: "1"
});

const library = CjsCharacterLibrary.from(values);
```

The builder is deterministic when caller metadata is deterministic. It does
not discover a target or installation. `buildFromResources()` fetches one
modern cFSD document per caller-supplied reader in `readers` through
blue.resMan or a supplied `source.read(path, context)` capability, then routes
them through the normal FSD format pipeline. The runtime ships no FSD schemas;
without `readers` nothing is read and the library is built from `documents`
alone, so the twelve required documents must then be supplied decoded.
`build()` and `buildFromInputs()` accept decoded values.
Each non-empty source
record-map key is copied into the named `recordID` field. Existing fields such
as `typeID` remain ordinary domain data. Unknown fields and incompatible nested
model shapes are rejected so a successful build cannot silently lose values
during hydration.

```js
const library = await CjsCharacterLibraryBuilder.buildFromResources({
    source: { read: (path, context) => localBytes(path, context) },
    readers: characterFsdReaders,
    documents: optionalPreparedCatalogs,
    sourceTarget: "eve",
    sourceBuild: "123456"
});

const values = CjsSchema.getValues(library);
```

Browser fetch callers provide `baseUrl` or `resolveUrl` for `res:/` paths.
Passing `fsdOptions: { bitWidth: 32 }` with readers identifies legacy FSD and
currently throws its explicit unsupported-reader error. `fsdOptions` or
`resourcePaths` without readers throws `CJS_FSD_READER_REQUIRED`.

Supplied `characterDefinitions` records preserve the decoder's JSON in their
`values` field. Their typed profile catalogs are additional lookup structures;
consumers can still inspect an exact decoded definition when no typed
projection exists yet.

The builder projects proven relationships using native `_id` and `_ref`
metadata. Supplied graph metadata is preserved and reserved against generated
relationship IDs; a later `CjsSchema.getValues(library, {}, { refs: true })` export may assign a new
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
CjsSchema.setValues(resource, resourceValues);

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
import { CjsCharacterLibraryManager } from "@carbonenginejs/runtime/character";

const manager = new CjsCharacterLibraryManager(library);
// Or install a replacement explicitly:
manager.InstallLibrary(CjsCharacterLibrary.from(values));
```

An outer runtime can supply a structural loader for the combined document:

```js
manager.SetResourceLoader(path => runtime.FetchObject(path));
await manager.LoadLibraryAsync("res:/character/character-library.json");
```

The loader owns acquisition and decoding. It returns an object, not bytes.
The character layer deduplicates equivalent in-flight loads but does not become a
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

## Serialize a model graph

Use the schema values service when relationships must survive a JSON round
trip. Class registration and declared fields supply the graph contract:

```js
const json = JSON.stringify(CjsSchema.getValues(library, {}, { refs: true }));
const roundTrip = CjsCharacterLibrary.from(JSON.parse(json));
```

`refs: true` emits `_id` only for shared models and emits later occurrences as
`{ _ref }`. Identifier labels are not stable domain data; graph equivalence is
the contract.

The same rule applies to a standalone appearance plan:

```js
import { CjsCharacterAppearancePlan } from "@carbonenginejs/runtime/character";

const plan = CjsSchema.from("CjsCharacterAppearancePlan", planValues);
const planJSON = JSON.stringify(CjsSchema.getValues(plan, {}, { refs: true }));
```

`CjsCharacterAppearancePlan` is a registered class without a model base. Use
`CjsSchema.from`, `CjsSchema.setValues` and `CjsSchema.getValues` to construct,
populate and export it. Native graph copying uses `Copier.CloneTo` from the
Blue API. The library's own `CjsCharacterLibrary.from` and `SetValues` additionally
apply library-format migration. A resolver or builder decides operations,
ordering and policy before producing `planValues`; hydration applies those values.

The current resolver can produce the exact first-stage plan directly from one
hydrated paper doll:

```js
import {
    CjsCharacterAppearanceResolver,
    CjsCharacterLibrary
} from "@carbonenginejs/runtime/character";

const library = CjsCharacterLibrary.from(libraryValues);
const paperdoll = library.Get("paperdolls", paperdollID);
const resolved = CjsCharacterAppearanceResolver.resolvePaperdoll(library, paperdoll);
```

This stage preserves modifier selections and emits a plan contribution for
every strict source-version match. It selects unique candidates or qualified
retained atomic bundles. For requested LOD, family selection and fallback
behavior, see the `CjsCharacterAppearanceResolver` JSDoc. Its
`layers` collection records owner/contributor relationships, not atlas order.
Effective version metadata contributes the five verified modifier-order flags,
but this policy normalization does not reorder `plan.layers`. Raw dependency
and occlusion strings remain untouched. A producer-supplied typed dependency
may add an exact requester-owned contribution when its target resolves
uniquely; unresolved raw or typed values produce precise diagnostics and do
not fabricate a target. Exact typed location occlusions and clothing-removal
relationships can suppress their targeted active selections. Unknown modifier categories are retained
and diagnosed rather than dropped.

Until later stages supply decoded resource facts or explicit policy, textures,
coverage, targets, passes, and bindings remain empty and diagnostics explain
the unresolved work.

## Opt-in prepared catalogs

The builder defaults to schema 11. Pass `schemaVersion: 12` to retain
`rawDocuments` before typed defaults and relationship projection. Definition
records may carry original `sourceText` alongside decoded `values`; this
preserves YAML tuple, tag and alias syntax without changing decoded values.
Missing text is reported as null, never reconstructed.

Schema-12 preparation accepts exact indexed paths, source texture targets,
qualified sparse override inputs, color-selection relationships and pattern
resource evidence. It produces source-owned material bindings, exact pattern
paths and effective texture channels while preserving the original inventory.
Unknown input presence and ambiguous required relationships fail preparation.
Building schema 12 without preparation evidence is structural hydration only.

For externally verified same-stem PNG/DDS pairs, preparation may supply
`fullCanvasDdsPaths: ["res:/.../texture.dds"]`. Both paths must be original
indexed candidates and the extension-neutral PNG metadata must be retained.
The builder selects DDS only within that exact pair and records
`qualified-dds-full-canvas` in the effective binding's origin. Original
candidates, input presence and raw PNG facts remain unchanged. Other duplicate
channels still fail. This option asserts a verified full-canvas representation;
it does not compare or decode images. Consumers must not apply the PNG crop
placement again to that DDS. `InspectResourceForData(ddsPath)` still retrieves
the same metadata record as the PNG path; storage bounds and metadata identity
are separate concerns. DDS resource loading can retain compressed mip data;
the library never expands or recompresses pixels.

`CjsCharacterAppearanceResolver.resolveCatalog()` consumes exact hydrated
source, type, color and dependency identities. Its A and BC profiles remain
separate. It returns prepared inputs, not render passes or shader bindings.
The existing paper-doll resolver remains the earlier planning stage.

Use `CjsSchema.getValues(library, {}, { refs: true })` for version-aware
emission. Schema-11 exports omit every schema-12-only field, including new
model defaults; schema-11 inputs containing those fields are rejected.
Schemas 7–10 still migrate to 11 and do not acquire inferred schema-12 joins.

## Resource and graphics boundary

Library and plan data remain GPU-free. The builder orchestrates static-data
fetch/decoding through resource readers; metadata inspection can call an
injected resource manager. The manager's combined-document loader returns
decoded objects, not bytes. Selected-asset caching/lifecycle and rendering stay
with resource and graphics hosts; there is no Node/local-file fallback in
character. See `src/character/trinity/README.md`.
