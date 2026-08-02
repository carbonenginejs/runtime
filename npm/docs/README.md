# Runtime character documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime integrators and maintainers
Summary: Documents model-shaped character JSON and current native character/interior classes.

## Purpose

`runtime-character` owns a source-neutral schema-v4 character document format,
a separate schema-v1 resolved appearance-plan format, and the current Carbon
character/interior identities assigned to this package. It is GPU-free and
I/O-free.

The builder copies caller-supplied record fields, names each source map key as
`recordID`, and adds only established relationships. The resulting JSON has
the same shape as `CjsCharacterLibrary`; inherited `from`, `SetValues`, and
`GetValues` own hydration and serialization of its direct source-backed
`CjsModel` records under `src/character`. Current source-backed
native classes live under `src/trinity`. Historical Incarna-only identities
belong under `src/incarna` when pinned evidence proves they are required.

The removed character-library schema-v1/v2 `CjsCharacter*` model family is not
a compatibility surface. The new appearance-plan schema-v1 is a distinct
standalone model graph under `src/character/planning`; source-to-plan
resolution and rendering remain future work. They must not inherit the working
GLES demo's unproven filename heuristics.

## Documentation map

- [Architecture and ownership](architecture.md)
- [Runtime usage](guides/runtime-usage.md)
- [Character document contract](reference/prepared-libraries.md)
- [Character appearance plans](reference/character-appearance-plans.md)
- [Class catalog](reference/classes/README.md)
- [Roadmap](roadmap.md)
