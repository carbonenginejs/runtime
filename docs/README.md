# Runtime character documentation

Status: Evolving
Scope: `@carbonenginejs/runtime-character`
Audience: Character-runtime integrators and maintainers
Summary: Documents transparent character JSON and current native character/interior classes.

## Purpose

`runtime-character` owns a source-neutral schema-v3 character document format
and the current Carbon character/interior identities assigned to this package.
It is GPU-free and I/O-free.

The document format preserves caller-supplied JSON, adds only established
relationships, and does not hydrate records into speculative semantic models.
Current source-backed native classes live under `src/trinity`. Historical
Incarna-only identities belong under `src/incarna` when pinned evidence proves
they are required.

The removed schema-v1/v2 `CjsCharacter*` model family is not a compatibility
surface. New semantic classes must be rebuilt from current evidence and, when
they extend `CjsModel`, must accept their JSON record through `.from(record)`.

## Documentation map

- [Architecture and ownership](architecture.md)
- [Runtime usage](guides/runtime-usage.md)
- [Character document contract](reference/prepared-libraries.md)
- [Class catalog](reference/classes/README.md)
- [Roadmap](roadmap.md)
