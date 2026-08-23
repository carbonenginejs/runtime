# runtime-sof decorator TODOs

## Completed field metadata

`EveSofDataMeshInstance` has four schema-backed fields with type decorators but
without Carbon's `PERSIST` metadata:

- [x] `rotation`: added `@io.persist`.
- [x] `scaling`: added `@io.persist`.
- [x] `translation`: added `@io.persist`.
- [x] `boneIndex`: added `@io.persist`.

File: `src/sof/shared/EveSofDataMeshInstance.js`.

## Boundary guardrails

- No missing `@io.rebuild` is assigned to `runtime-sof`. SOF authors document
  values and hydrates them through `SetValues`; runtime classes own scheduled
  work.
- Do not load geometry/resources or call resource-dependent getters to clear
  flags while building a document. Bounds and other authored facts should come
  directly from SOF data.
- The current schema-backed method audit has no SOF public-method decorator
  gap.
