# Generated-class lifecycle

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity` generated and maintained classes
Audience: Runtime authors, schema-tool authors, and maintainers
Summary: Defines how schema intake becomes reviewed runtime-trinity source.

## Purpose

Generated classes establish Carbon-compatible identity, inheritance, fields,
decorators, and exposed method obligations. They are review input rather than
the permanent home of completed runtime behavior.

The lifecycle keeps generated output reproducible while giving implemented
classes a stable, human-readable source tree.

## Current lifecycle

1. `@carbonenginejs/tools-core` scans Carbon declarations and compiles the
   reviewed schema.
2. The class emitter produces schema-shaped JavaScript in its tooling-owned
   output corpus.
3. Reviewed generated source is copied into `runtime-trinity/src/generated`;
   the runtime does not depend on the tooling workspace.
4. Runtime work verifies portable behavior against the public source,
   interfaces, schema, and tests.
5. Once the bounded portable promotion scope is reviewed and tested, the class
   moves into the maintained source area that owns its responsibility.
6. The maintained barrel exports the promoted class and the generated copy is
   removed.
7. Generation records that a hand-maintained source exists instead of
   recreating a competing class.

The parity audit remains active after promotion because later schema or
interface-contract improvements can reveal additional obligations. A promoted
class with a newly visible gap stays in its maintained home; the gap is made
explicit and completed there instead of recreating a generated duplicate.

Examples of maintained homes include:

- `src/eve/camera` for camera state;
- `src/eve/attachment/decal` for space-object decals;
- `src/eve/child/behaviors/lifecycle` and `tunnels` for cohesive behaviors;
- `src/eve/effect/multiEffect` for multi-effect graphs; and
- `src/trinityCore/binding` for dynamic and value binding classes.

## Enum ownership

Enums live with the maintained family that owns their meaning. A serialized
integer field uses `@schema.enum("EnumName")` so inspectors and user
interfaces can discover its accepted vocabulary without importing a separate
generated enum tree.

When an enum is specific to one class family, it remains beside that family.
Shared enums move only when several maintained consumers demonstrate a common
owner.

## Generated source

Generated source may include explicit `@impl.notImplemented` methods. These
markers preserve known obligations and allow the implementation-gap audit to
report them. Generated code must not silently invent device, resource,
filesystem, or native behavior.

Generated output is deterministic and should not be hand-edited as a
substitute for changing its owning schema or emitter. Runtime-specific
implementations belong in the maintained tree after review.

## Dropped quarantine

`src/dropped` is separate from `src/generated`. It contains deliberately
quarantined source with a file-specific disposition and is excluded from the
normal implementation and parity ownership surface.

A dropped class is not treated as an incomplete generated class and is not a
supported public implementation.

## Planned class descriptors

The schema emitter is planned to carry a reviewed purpose, visibility, kind,
source path, and public export for each generated class. That metadata will
produce deterministic class-purpose catalogs without guessing responsibility
from a class name.

The catalog becomes part of the documentation validation gate after the
shared checker can exclude the deliberate dropped quarantine.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Current API](../reference/api.md)
- [Implementation status and audits](../reference/implementation-status.md)
