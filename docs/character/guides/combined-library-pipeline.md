# Combined character-library pipeline

Status: Evolving
Scope: `@carbonenginejs/runtime/character`
Audience: Editor, tooling, and runtime integrators
Summary: Defines the individual-authoring-item to combined-runtime-catalog boundary.

## Decision

The runtime-facing character library is one combined model-shaped JSON document.
It contains all published character library items needed for selection and
planning. A frontend does not discover or reload the individual library-source
files used to produce it.

The package uses this combined-definition deployment boundary:

```text
authored source
    -> individually published library definitions
    -> one combined catalog
    -> runtime hydration and indexing
```

The character format remains a source-neutral JSON contract.

## Build pipeline

```text
modern cFSD bytes or caller-supplied source-document JSON
+ prepared character definition JSON
+ exact external resource candidates
+ optional caller-supplied identity enrichment
                    |
                    v
       character library compilation
                    |
                    v
       character-library.json(.gz)
                    |
                    v
       CjsCharacterLibrary.from(values)
```

`CjsCharacterLibraryBuilder.buildFromResources()` fetches the twelve required
modern cFSD documents by default or reads them through one injected structural
source, decodes them through `@carbonenginejs/runtime/resource`, and returns a hydrated
library. Native fetch needs `baseUrl` or `resolveUrl` for `res:/` paths.
`build()` and `buildFromInputs()` continue to accept decoded plain values. The
builder does not locate an installation, select a target/provider, manage a
cache, or query an identity service. A producer must preserve
every record when one domain identity maps to multiple character records, and
it must not invent a resource relationship when an exact join is absent.

## Folded definitions and external assets

The compiler must distinguish two kinds of input:

- Every decoded library definition is folded into the combined JSON as a
  lossless `characterDefinitions` record. Typed character items are additive
  indexes over definitions whose relationships are understood. The frontend
  needs the decoded values, not the original publication files.
- Runtime assets remain canonical `res:/` references. Configurations, geometry,
  textures, animations, and effects are acquired by the caller's
  resource manager when a selected character needs them.

Decoded definition values and derived resource facts needed for deterministic
selection may be stored in the combined catalog. A producer must fail instead
of silently dropping a supplied decoded definition. Downloaded bytes, resource
handles, cache
locations, acquisition settings, enrichment datasets, and producer index
storage paths must not be stored in it.

## Editor authoring

An editor may add same-shaped values through the document's declared model
type, or add an individual item it already hydrated:

```js
const created = library.Create("characterResources", values);
library.Add("characterResources", resource);
```

`Create` returns the hydrated record. `Add` preserves the supplied object; it
does not clone or hydrate it again. `Remove`, `Delete`, and `Clear` provide the
matching editor mutations. Direct object relationships remain ordinary references until
`GetValues({ refs: true })` projects the combined `_id` and `_ref` graph for
publication.

Collections stay visible as the model-shaped `library.documents` fields. An
editor that directly replaces or reorders array entries calls `Reindex()`
before relying on indexed lookups. Named mutations add the collection field's
lazy index-invalidation flag automatically, and lookup consumes that flag only
for the affected document. The library emits incremental record/document
events for editor views.

## Runtime installation

`CjsCharacterLibraryManager` owns the combined-library loading boundary:

```js
const manager = new CjsCharacterLibraryManager();

manager.InstallLibrary(CjsCharacterLibrary.from(values));
```

An outer runtime may instead provide one structural object loader and load the
combined document as a resource:

```js
manager.SetResourceLoader(path => runtime.FetchObject(path));
await manager.LoadLibraryAsync("res:/character/character-library.json");
```

The loader returns the decoded JSON object or an already hydrated
`CjsCharacterLibrary`. Runtime-character does not own the transport, cache,
JSON parser, resource decoder, or resource manager. Equivalent in-flight library
loads are deduplicated; completed loads are not retained as an acquisition
cache.

The manager and library keep lookup indexes in private runtime state. Those
indexes are never schema fields and never appear in serialized JSON.

## Current package ownership

- `@carbonenginejs/runtime/character` owns item models, the combined library model, hydration,
  editor insertion, private lookup indexes, the source-neutral builder, and
  orchestration of its twelve required static-data reads.
- `@carbonenginejs/runtime/resource` owns cFSD decoding and selected-resource lifecycle.
- Tools and applications own target selection, URLs/local paths, credentials,
  cache policy, and optional prepared catalogs.
- A renderer or application owns loading and realizing external assets named
  by the combined library.

## Planned integrations

Node tooling can supply exact-build local/cache bytes and persist
`library.GetValues()`. A browser application can fetch the same raw resources
or load already prepared JSON. Neither integration defines a second character
schema or build algorithm.
