# Runtime character documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime integrators and maintainers
Summary: Documents model-shaped character JSON and current native character/interior classes.

## Purpose

`runtime-character` owns a source-neutral schema-v10 character document format,
a separate schema-v4 resolved appearance-plan format, and the current Carbon
character/interior identities assigned to this package. It is GPU-free;
acquisition remains caller-owned through structural loaders.

The builder copies caller-supplied record fields, names each source map key as
`recordID`, and adds only established relationships. The resulting JSON has
the same shape as `CjsCharacterLibrary`; inherited `from`, `SetValues`, and
`GetValues` own hydration and serialization of its direct source-backed
`CjsModel` records under `src/character`. Current source-backed
native classes live under `src/trinity`. Historical Incarna-only identities
belong under `src/incarna` when pinned evidence proves they are required.

The removed character-library schema-v1/v2 `CjsCharacter*` model family is not
a compatibility surface. The appearance-plan schema-v4 is a distinct
standalone model graph under `src/character/planning`. Its initial resolver
projects exact paper-doll selections and colour selections, preserves every
exact source-version contribution, follows bounded exact typed dependencies,
suppresses active selections through exact typed modifier-location occlusions
and typed clothing-removal relationships, and retains proved utility-shape
requests. It fills part candidates only when
uniquely determined. Recursive dependency policy, LOD, material, texture-role,
coverage, pass ordering, and rendering remain unresolved. They must not inherit
a prototype renderer's unproven filename heuristics.

The legacy GLES editor is nevertheless the broadest reviewed executable
reference and the replacement's parity worklist. Its compact schema could
carry optional `typeID`, but identity coverage and provenance were incomplete.
The current library instead retains direct source records and decoded
definition values before adding typed projections. This is not a decision to
abandon the older editor's more advanced behavior: working outcomes are carried
forward while heuristic lookups are replaced by typed, programmatic inputs.

Decoded authoring definitions remain first-class records in the combined
library. Typed catalogs are additive projections for known relationships; an
unrecognized definition is retained as JSON rather than omitted.

The package also exposes verified GPU-free modifier-order and shared-atlas
layout policy. These utilities supply resolver inputs; they do not add renderer
lifecycle commands to the serializable appearance plan.

## Documentation map

- [Architecture and ownership](architecture.md)
- [Runtime usage](guides/runtime-usage.md)
- [Combined library pipeline](guides/combined-library-pipeline.md)
- [Character document contract](reference/prepared-libraries.md)
- [Character appearance plans](reference/character-appearance-plans.md)
- [Character CPU, GPU, and format boundary](reference/cpu-gpu-and-format-boundary.md)
- [Legacy GLES character reference](reference/legacy-gles-character-reference.md)
- [Class catalog](reference/classes/README.md)
- [Roadmap](roadmap.md)
