# Runtime SOF architecture

Status: Evolving
Scope: `@carbonenginejs/runtime-sof`
Audience: Users and maintainers integrating SOF values
Summary: Defines runtime-sof's data, dependency, output, and realization boundaries.

## Purpose

runtime-sof provides deterministic CPU-side interpretation of the Space Object
Factory catalog without acquiring resources, constructing renderer classes, or
touching a GPU or audio device.

## Dependency direction

```text
runtime-utils model/schema      runtime-resource Black reader
             \                         /
              \                       /
                    runtime-sof
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
- Registry-free projection to sparse JSON-compatible model values.
- Declared class identities for polymorphic values, including audio-emitter
  metadata, without constructing those classes.

## Ownership elsewhere

- Resource discovery, fetching, caching, and compiled-object decoding belong to
  resource and tooling layers; runtime-sof accepts narrow caller adapters.
- Trinity and audio packages own typed graph classes and optional object
  construction from values.
- Audio backends, renderer devices, GPU allocation, and runtime realization
  belong to their domain runtimes and engines.

## Constraints

- Plain values from `BuildValues*` are the sole supported public output.
- Values generation requires no class registry and must remain Trinity-free.
- Builds are deterministic unless an explicitly documented seed or clock input
  is supplied.
- `carbon.document` remains a deprecated internal/compatibility intermediate;
  new consumers must not depend on its node-table shape.
- Resolver inputs prefer self-describing model values and may also consume
  legacy `carbon.document` compatibility fragments. Every model in a values
  fragment must carry `_type` so SOF can compose it without a class registry.
- Imported legacy document fragments may preserve `raw` data; SOF-authored
  audio uses ordinary declared values instead.

## Deferred partial catalog libraries

A future runtime-owned SOF library builder must not require the monolithic
`data.black` catalog. It should support a minimum library bootstrapped from
`generic.black`, then add only the named hull, faction, race, material, pattern,
and layout definitions required by requested DNA. Complete `data.black` remains
a supported input, not a mandatory runtime download.

The eventual library value must remain serializable through `GetValues()` so a
caller may import prepared JSON, fetch a prepared gzip artifact, or build the
same value from raw resources. `tools-core` may supply indexed local bytes and
persist that value, but partial catalog assembly and dependency closure belong
to runtime-sof. Duplicate and replacement behavior must follow Carbon's
individual `EveSOFDataMgr::Update*` operations rather than depending on a
ccpwgl-only convention.

## Related documentation

- [Package documentation](README.md)
- [Class catalog](reference/classes/README.md)
- [Package README](../README.md)
