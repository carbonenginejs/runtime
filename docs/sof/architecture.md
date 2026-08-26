# Runtime SOF architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/sof`
Audience: Users and maintainers integrating SOF values
Summary: Defines the SOF layer's data, dependency, output, and realization boundaries.

## Purpose

The SOF layer provides deterministic CPU-side interpretation of the Space Object
Factory catalog without acquiring resources, constructing renderer classes, or
touching a GPU or audio device.

## Dependency direction

```text
runtime global/model+schema      runtime resource/formats/black
             \                         /
              \                       /
                       SOF
                         |
                         v
              plain model-values graph
                         |
                         v
       optional caller-owned typed object construction
```

## Owned responsibilities

- SOF catalog models, indexing, lookup, and detached data projections.
- DNA parsing, validation, visibility decisions, and build-class selection.
- Deterministic layout plans and GPU-free graph assembly.
- Registry-free projection to sparse JSON-compatible model values, with an
  explicit post-projection option to apply already-registered class defaults.
- Declared class identities for polymorphic values, including audio-emitter
  metadata, without constructing those classes.

## Ownership elsewhere

- Resource discovery, fetching, caching, and compiled-object decoding belong to
  resource and tooling layers; SOF accepts narrow caller adapters.
- Trinity and audio layers own typed graph classes and optional object
  construction from values.
- Audio backends, renderer devices, GPU allocation, and runtime realization
  belong to their domain runtimes and engines.

## Constraints

- Plain values from `BuildValues*` are the sole supported public output.
- Values generation requires no class registry and must remain Trinity-free.
- `BuildValues*` remains sparse by default. `{ populateDefaults: true }` applies
  `CjsSchema` defaults after projection and therefore requires the caller to
  have imported every class family named by the graph; SOF does not import
  Trinity or audio to satisfy that option.
- Builds are deterministic unless an explicitly documented seed or clock input
  is supplied.
- `carbon.document` remains a deprecated internal/compatibility intermediate;
  new consumers must not depend on its node-table shape.
- Resolver inputs prefer self-describing model values and may also consume
  legacy `carbon.document` compatibility fragments. Every model in a values
  fragment must carry `_type` so SOF can compose it without a class registry.
- Imported legacy document fragments may preserve `raw` data; SOF-authored
  audio uses ordinary declared values instead.

## Modular child construction

`EveSOF.BuildChild(owner, dna, partTag, transform)` ports Carbon's modular
space-object composition without adding a Trinity dependency. The owner may be
a self-describing plain model-values root or a caller-owned `CjsModel` instance;
the latter is exported and populated again through the same values boundary.
Invalid DNA returns `false` without changing the owner.

`BuildChildValues` is the immutable form. It returns a new values graph (or
`null` for invalid DNA), stamps the supplied part tag on the placement graph,
shared mesh instances, and locators, and updates the owner's transformed sphere
and ellipsoid. Trinity owns later hydration and live removal; SOF owns only the
device-free graph construction.

## Nominal collaborator boundaries

SOF-owned models and the combined runtime's model lifecycle are nominal
contracts. When an authored child is present, SOF calls its required method
directly; a wrong class is an error rather than a silently ignored optional
feature. Structural checks remain appropriate only for serialized values and
caller-supplied callback functions.

The canonical resource-existence input is a plain file-name list or predicate.
Browser tooling that owns a richer file index adapts it to that narrow input at
the composition boundary; SOF does not import the tools layer. Likewise, live
Trinity effect and texture-parameter adaptation belongs to Trinity or core and
must not introduce a Trinity dependency into SOF.

## Partial catalog libraries

`CjsSofLibraryBuilder` provides the dependency-closure boundary in front of
`EveSOFDataMgr`. It boots the minimum library from `generic.black`, then fetches
only the named hull, faction, race, material, pattern, and layout records needed
by requested DNA. It also closes faction default-pattern/material dependencies
and recursively follows nested layout descriptors. Complete `data.black`
remains supported through `EveSOF.LoadDataAsync`; it is not a mandatory runtime
download.

Each successful fetch updates both a partial `EveSOFData` source catalog and the
manager through Carbon's individual `Update*` methods. The source catalog is
serializable through `GetValues()`, so a caller may import prepared JSON, fetch
a prepared gzip artifact, or build the same value from raw resources.
Concurrent named requests share one in-flight operation; `{ force: true }`
explicitly replaces a record.

`EveSOF.Register({ lazyData })` installs this builder. With `lazyData: true`,
the existing `resources.getObject` capability supplies decoded Black objects;
builder options may instead provide a source function that returns decoded
objects or Black bytes.
`EveSOF.InitializeAsync()` loads `generic.black`, and every asynchronous DNA
build ensures its named catalog closure before running the unchanged
deterministic synchronous builder. `CjsLibrary.InitializeAsync()` calls that
boot path when no monolithic `dataPath` was requested.

`tools-core` may supply indexed local objects and persist the resulting values,
but provider discovery remains outside SOF. Failed required records reject the
async request; they are not replaced with guessed or empty catalog values.

## Related documentation

- [Package documentation](README.md)
- [Class catalog](reference/classes/README.md)
- [Package README](../../README.md)
