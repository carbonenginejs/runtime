# Runtime character roadmap

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Maintainers
Summary: Tracks evidence-backed work after replacing the speculative v1/v2 character model.

## Current baseline

- schema-v4 model-shaped JSON construction;
- proven native `_id`/`_ref` relationship projection;
- one connected source-record model with named `recordID` values;
- direct `CjsModel` records for all twelve known source documents and the
  nested paperdoll selection records;
- a standalone schema-v1 appearance-plan data contract with local graph
  identity, provenance, reusable coverage, ordered composition, and bindings;
- current source-backed native character/interior classes under `src/trinity`;
- exact-name CPU rig binding used by `Tr2SkinnedObject`; and
- a bounded `src/incarna` tranche for recovered historical-only identities.

The old schema-v1/v2 `CjsCharacter*` graph and model family is removed.

## Next source-to-plan resolver

Keep source models direct and source-neutral. The next implementation should
resolve
selection, dependency, category coverage, atomic resource/LOD bindings,
material inputs, and ordered atlas operations into the implemented
backend-neutral character appearance-plan contract.

The working GLES demo establishes useful operation shapes and PNG placement
metadata, but its global layer ranks, filename classifiers, inferred material
defaults, footwear exception, tuck/brow rules, and custom-decal ordering are
policy or guesses. Do not promote them as authored library facts. Each future
resolved field needs a source fact, resource inspection, or an explicit
labelled policy decision.

## Document-to-native adapters

Do not connect schema-v4 records to `Tr2*` objects by filename or old v1/v2
assumptions. Each adapter requires a proven source relationship, focused
synthetic tests, and a clear resource-owner boundary.

## Native Carbon work

Continue verifying maintained `src/trinity` classes against current Carbon
headers and implementations. Generated shells, schema registration, or passing
hydration are not behavioral parity.

## Historical Incarna work

When pinned Incarna assets require an identity absent from current Carbon, add
the smallest honest hydration contract under `src/incarna`. Keep current
Carbon identities in `src/trinity`, and do not recreate unavailable lighting or
rendering systems by guesswork.
