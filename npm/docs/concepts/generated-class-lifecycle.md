# Generated-class lifecycle

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity` generated and maintained classes
Audience: Runtime authors, schema-tool authors, and maintainers
Summary: Defines how schema intake becomes reviewed runtime-trinity source.

## Purpose

Generated classes establish Carbon-compatible identity, inheritance, fields,
decorators, and exposed method obligations. They are review input rather than
the permanent home of manually maintained runtime behavior.

The lifecycle keeps generated output reproducible while giving every manually
edited class a stable, human-readable source tree.

## Current lifecycle

1. `@carbonenginejs/tools-core` scans Carbon declarations and compiles the
   reviewed schema.
2. The class emitter produces schema-shaped JavaScript in its tooling-owned
   output corpus.
3. Reviewed generated source is copied into `runtime-trinity/src/generated`;
   the runtime does not depend on the tooling workspace.
4. Runtime work verifies portable behavior against the public source,
   interfaces, schema, and tests.
5. Before the first substantive manual source change, the complete class moves
   into the maintained source area that owns its responsibility.
6. Manual implementation and review continue in that maintained home.
   Unresolved obligations remain explicit with `@impl.notImplemented`.
7. The maintained barrel exports the promoted class and the generated copy is
   removed.
8. Generation records that a hand-maintained source exists instead of
   recreating a competing class.

Inspection, tests outside the class, and unchanged emitter output do not
trigger promotion. Manual behavior, source-corrected defaults or fields,
inheritance changes, decorator corrections, runtime-specific dependencies,
and class-owned enum work do.

The parity audit remains active after promotion because later schema or
interface-contract improvements can reveal additional obligations. A promoted
class with a newly visible gap stays in its maintained home; the gap is made
explicit and completed there instead of recreating a generated duplicate.

Examples of maintained homes include:

- `src/eve/camera` for camera state;
- `src/eve/attachment/decal` for space-object decals;
- `src/eve/child/behaviors/lifecycle` and `tunnels` for cohesive behaviors;
- `src/eve/effect/multiEffect` for multi-effect graphs; and
- `src/core/binding` for dynamic and value binding classes.

## Enum ownership

An enum associated with one Carbon class normally becomes a named frozen
static on that canonical owner, for example `Owner.EnumType.MEMBER`. A
serialized integer field uses `@schema.enum("EnumType")` so inspectors and
user interfaces resolve the class static and discover its accepted
vocabulary.

Ownerless vocabulary used only inside this package remains beside its
maintained family. Genuinely shared cross-package vocabulary belongs in
`@carbonenginejs/runtime-utils`, which allows runtime and graphics packages to
share the identity without importing one another. A standalone generated enum
file alone is not evidence that the enum should move to runtime-utils.

## Generated source

Generated source may include explicit `@impl.notImplemented` methods. These
markers preserve known obligations and allow the implementation-gap audit to
report them. Generated code must not silently invent device, resource,
filesystem, or native behavior.

Generated output is deterministic and should not be hand-edited as a
substitute for changing its owning schema or emitter. Runtime-specific
implementations belong in the maintained tree before the manual edit is made.

Generation runs into a tooling-owned scratch corpus or another staging
directory. Reviewed output is then copied only into generator-owned paths.
The class emitter refuses to overwrite a differing `--out` file unless
`--force` is supplied; `--force` must not target runtime source.

The generated provenance banner is not an ownership lock. Durable protection
comes from maintained and dropped skip sets, staging-first generation,
duplicate-class checks, and comparison of installed generated source with
fresh output. Newly promoted files replace the generated banner with a
hand-maintained provenance header and exact Carbon source paths.

## Dropped quarantine

`src/dropped` is separate from `src/generated`. It contains deliberately
quarantined source with a file-specific disposition and is excluded from the
normal implementation and parity ownership surface.

A dropped class is not treated as an incomplete generated class and is not a
supported public implementation. Its disposition records why this package
owns the identity, why it is rejected as a runtime model, its replacement, and
the condition for revival. Dropped files are not imported, exported,
registered, or implemented in place.

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
