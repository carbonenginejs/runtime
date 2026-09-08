# Runtime SOF architecture

Status: Evolving
Scope: `@carbonenginejs/runtime/sof`
Audience: Users and maintainers integrating SOF values
Summary: Defines the SOF layer's data, dependency, output, and realization boundaries.

## Purpose

SOF deterministically interprets Space Object Factory catalogs on the CPU.
It may request inputs through injected sources, but does not construct renderer
classes or touch GPU/audio devices.

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

## Source selector provenance

SOF values retain the original selector when the builder resolves an authored
SOF6 enum into output data. The annotation is written beside the resolved value
with the source member's exact name and an underscore prefix: `_colorType`,
`_glowColorType`, `_logoType`, `_areaType`, or `_lightColor`. For example, an
`EveSpotlightSetItem` has one `_colorType` for its derived `coneColor`,
`flareColor`, and `spriteColor`, while an `EveSpaceObjectDecal` carries the
`_glowColorType` or `_logoType` used by its decal usage.

These annotations belong only to the plain JSON output contract. Trinity target
classes do not declare them and ignore them during hydration. SOF does not infer
selectors by comparing resolved vectors with a faction palette: output colors
authored directly as vectors have no selector annotation. In particular, this
avoids manufacturing provenance for race booster colors, banner-light colors,
or generic damage-emitter colors.

## Attachment-set identity metadata

An SOF hull attachment set's authored `name` is required metadata. This applies
to the named decal, light, sprite, spotlight, plane, sprite-line, and haze set
families. The name is not cosmetic: editors and downstream runtimes use it to
identify a set across rebuilds, compare projections, present meaningful
diagnostics, and retain the author's grouping even when two sets otherwise have
the same render properties.

Every catalog, detached-data, values, document, and HTTP projection must
preserve the exact authored name. A projection must not drop it as a default,
replace it with an array position or visibility-group hash, or synthesize one
from textures or set contents. A missing or empty name is incomplete input and
must remain observable as such; it must not make multiple sets silently share
one runtime identity.

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

SOF models and the runtime model lifecycle are nominal contracts. SOF calls
present authored children's required methods directly; a wrong class is an
error. Structural checks apply only to serialized values and caller-supplied
callback functions.

Resource existence accepts a plain file-name list or predicate. Browser tooling
adapts richer indexes at composition; SOF does not import tools. Trinity/core
owns live effect and texture-parameter adaptation, without adding a Trinity
dependency to SOF.

## Partial catalog libraries

`CjsSofLibraryBuilder` fronts `EveSOFDataMgr`: boot `generic.black`, then fetch
only the hull, faction, race, material, pattern, and layout records required by
DNA, including faction default-pattern/material dependencies and nested layout
closure. Complete `data.black` remains optional through `EveSOF.LoadDataAsync`.

Successful fetches update the partial `EveSOFData` catalog and manager through
Carbon's individual `Update*` methods. `GetValues()` serializes the catalog for
prepared JSON, gzip artifacts, or equivalent values built from raw resources.
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
