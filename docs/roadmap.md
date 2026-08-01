# Runtime character roadmap

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Maintainers
Summary: Tracks evidence-backed work after replacing the speculative v1/v2 character model.

## Current baseline

- schema-v3 transparent JSON construction and validation;
- proven `_id`/`_ref` relationship projection;
- document-only lookup without legacy model hydration;
- current source-backed native character/interior classes under `src/trinity`;
- exact-name CPU rig binding used by `Tr2SkinnedObject`; and
- an explicit empty `src/incarna` home for historical-only identities.

The old schema-v1/v2 `CjsCharacter*` graph and model family is removed.

## Next semantic models

Add a semantic `CjsCharacter*` class only when current document evidence and a
real consumer establish its fields and behavior. New models should extend
`CjsModel`, carry schema decorators, and hydrate directly through
`CjsCharacterThing.from(jsonRecord)`.

A document-name-to-constructor registry may be added when the first such
consumer exists. Current document names already provide the type scope, so no
record-level `_type` is planned.

## Document-to-native adapters

Do not connect schema-v3 records to `Tr2*` objects by filename or old v1/v2
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
