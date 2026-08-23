# Generated-class lifecycle

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity` generated and maintained classes
Audience: Runtime authors, schema-tool authors, and maintainers
Summary: Defines how schema intake becomes reviewed `src/trinity` source.

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
   output corpus. A reviewed family-qualified tools-core registry supplies the
   optional class purpose carried by the scratch schema, generated JSDoc, and
   `@type.define` metadata.
3. Reviewed generated source is installed into `src/trinity/generated`;
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

- `src/trinity/eve/camera` for camera state;
- `src/trinity/eve/attachment/decal` for space-object decals;
- `src/trinity/eve/child/behaviors/lifecycle` and `tunnels` for cohesive behaviors;
- `src/trinity/eve/effect/multiEffect` for multi-effect graphs; and
- `src/trinity/postProcess` for SSAO and post-process renderer settings; and
- `src/trinity/core/binding` for dynamic and value binding classes.

## Enum ownership

An enum associated with one Carbon class normally becomes a named frozen
static on that canonical owner, for example `Owner.EnumType.MEMBER`. A
serialized integer field uses `@schema.enum("EnumType")` so inspectors and
user interfaces resolve the class static and discover its accepted
vocabulary.

Ownerless vocabulary used only inside this package remains beside its
maintained family. Genuinely shared cross-package vocabulary belongs in
`@carbonenginejs/runtime/global`, which allows runtime and graphics packages to
share the identity without importing one another. A standalone generated enum
file alone is not evidence that the enum belongs in the shared `src/global`
foundation.

## Generated source

Generated source may include explicit `@impl.notImplemented` methods. These
markers preserve known obligations and allow the implementation-gap audit to
report them. Generated code must not silently invent device, resource,
filesystem, or native behavior.

Generated output is deterministic and should not be hand-edited as a
substitute for changing its owning schema, reviewed purpose registry, or
emitter. Runtime-specific
implementations belong in the maintained tree before the manual edit is made.

`src/trinity/generated/summary.json` is the receipt from an earlier whole-tree install,
not a live work queue or an authoritative count of the current generated tree.
The current `tools-core` emitter operates per class; promotion removes installed
files without rewriting that historical receipt. Ownership and release checks
therefore use the current source tree, barrels, parity audit, and gap audit.

`EveDamageOverlay` and `EveModularObjectModifier` are currently unexported
generated intake. They are retained for later Carbon review but deliberately
excluded from public barrels and the npm build. The former needs the complete
damage-overlay/data-texture path; the latter still has an unresolved owning
object type and depends on modular child, locator, SOF, and resource behavior.

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

`src/trinity/dropped` is separate from `src/trinity/generated`. It contains deliberately
quarantined source with a file-specific disposition and is excluded from the
normal implementation and parity ownership surface.

A dropped class is not treated as an incomplete generated class and is not a
supported public implementation. Its disposition records why this package
owns the identity, why it is rejected as a runtime model, its replacement, and
the condition for revival. Dropped files are not imported, exported,
registered, or implemented in place.

## Live deprecation records

`src/trinity/toDeprecate/{ClassName}.json` records an intended removal without moving
the live class out of its maintained domain path. Each sidecar names the
replacement, reason, declaration date, nullable removal date, source, and
removal gates. It is never imported or exported.

A recorded class remains supported, maintained, schema-registered, audited,
and protected from generator overwrite until its gates are satisfied. When it
is actually deleted, the same record changes to removed status and receives
its removal date. This metadata does not create a fourth source state:
generated, maintained, and dropped remain mutually exclusive.

## Class descriptors

The schema emitter carries each reviewed generated-class purpose from
tools-core's family-qualified registry into the scratch class schema. The class
emitter writes that purpose into class JSDoc and `@type.define`, and CjsSchema
retains it as class-specific metadata rather than inheriting it.

Visibility, kind, source path, and public export remain consumer-owned catalog
metadata because they describe the installed package graph, not Carbon's class
schema. The documentation checker validates the complete catalog, including
the deliberate dropped quarantine, against the installed source tree.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Current API](../reference/api.md)
- [Implementation status and audits](../reference/implementation-status.md)
