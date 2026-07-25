# Runtime Trinity implementation status

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines the implementation audits and records current user-visible graph limitations.

## Purpose

Two complementary audits keep incomplete behavior explicit. Their command
output is authoritative for the checked source state; this page explains how
to interpret that output and records the current package-level limitation.

## Explicit implementation gaps

Run:

```sh
npm run audit:gaps
```

The gap audit inventories `@impl.notImplemented` methods and `@type.unknown`
properties in generated and maintained source. It excludes the deliberate
`src/dropped` quarantine by default.

The current source contains:

- 151 explicit methods across 47 classes; and
- no unknown properties.

The remaining methods are concentrated in native, GPU, font, bitmap/atlas,
particle, scene-picking, smart-light, and related backend-facing families.
Markers are intentional: the runtime does not fabricate behavior before a
portable contract or engine seam is established.

## Promoted-class parity

Run the parity audit against a compiled Carbon schema supplied by the caller:

```sh
npm run audit:parity -- --schema-root path/to/schema-build
```

The `CARBON_SCHEMA_ROOT` environment variable may provide the same location.
The audit resolves JavaScript inheritance, checks `@carbon.method` exposure,
and excludes deliberately quarantined classes.

The current audit checks 342 promoted classes and excludes 19 quarantined
classes. Eleven classes have 30 omitted methods:

| Contract | Classes | Omitted surface |
| --- | --- | --- |
| Pickable (16 omissions) | `EveMissile`, `EveMissileWarhead`, `EveMobile`, `EveRootTransform`, `EveSpaceObject2`, `EveSpaceObjectDecal`, `EveTransform`, `EveUiObject` | `GetPickingBatches` and `GetID` on each class. |
| Renderable (14 omissions) | `EveBoosterSet2Renderable`, `EveSpaceObjectDecal`, `EveStretch2`, `EveTurretSet` | Batch, transparency, sort-value, and per-object-data methods as applicable to each class. |

`EveSpaceObjectDecal` participates in both groups. The audit reports:

- no present-but-unexposed Carbon methods;
- no missing JavaScript classes;
- no missing or ambiguous schemas; and
- no unresolved non-`CjsModel` base classes.

## Current runtime limits

- Device creation, GPU resources, draw submission, presentation, and
  device-loss recovery require an engine package.
- Per-frame scene semantics remain engine-supplied because the Trinity graph
  does not own complete frame, history, jitter, shadow, and presentation
  state.
- Generated classes may expose explicit obligations, but manual behavior
  belongs in maintained source from the first substantive edit. Some legacy
  generated files already contain portable implementations and are being
  promoted without waiting for every native or backend gap to close.
- The child reference and socket resource seam is synchronous and injected.
- Socket parameter auto-creation currently covers the emitted string
  parameter type; additional types require corresponding schema emission.
- Calculated whole-object bounds remain planned as a separate lazy cache and
  are not inferred through generic graph traversal.

## Planned completion gates

Promotion occurs before the first substantive manual source change. Portable
behavior, decorators, exports, enum ownership, and focused tests are then
reviewed in the maintained home. When later schema improvements reveal an
inherited or interface obligation, the maintained class remains promoted and
the parity audit keeps that new gap explicit. Backend-only methods remain
explicit until an owning engine exposes a proven capability.

The public class-purpose catalog is populated as classes receive reviewed
descriptors during promotion. Completing the remaining catalog still requires
descriptor metadata and documentation validation that excludes the dropped
quarantine.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Generated-class lifecycle](../concepts/generated-class-lifecycle.md)
- [Current API](api.md)
