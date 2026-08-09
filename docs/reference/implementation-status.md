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

- 152 explicit methods across 50 classes; and
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

The current audit checks 321 promoted classes and excludes 32 quarantined
classes. Two classes have six omitted methods:

| Contract | Classes | Omitted surface |
| --- | --- | --- |
| Renderable (6 omissions) | `EveStretch2`, `EveTurretSet` | `HasTransparentBatches`, `GetSortValue`, and `GetBatches` on each class. |

The audit reports:

- no present-but-unexposed Carbon methods;
- no missing JavaScript classes;
- no missing or ambiguous schemas; and
- no unresolved non-`CjsModel` base classes.

## Controller compatibility proof

Controller and binding implementations are present and covered by JavaScript
tests, but exact Carbon output and ordering parity is not yet proven. Passing
the package suite establishes internal consistency, not equivalence to Carbon.
Before accepting behavioral cleanup, compare Carbon and JavaScript traces for:

1. initialization and linking order;
2. repeated equal and unequal writes;
3. scalar, boolean, array-fill, and swizzled binding destinations;
4. destination-buffer writes and dirty-mask accumulation;
5. same-frame multiple writes and frame-boundary mask consumption;
6. state-machine transition evaluation and variable masks;
7. source propagation and external events, confirming events do not affect
   controller correctness; and
8. output values and timing across representative update sequences.

Generic binding destinations suppress equal-value writes unless the field is
marked `@io.always`. Controller float variables deliberately carry that marker
so equal writes still reach their destination and dirty mask. Initialization
is silent, and the masks remain frame-consumed; those semantics are part of the
parity gate rather than incidental test behavior.

## Current runtime limits

- Device creation, GPU resources, draw submission, presentation, and
  device-loss recovery require an engine package.
- Mesh batches leave collection with complete draw arguments. The two
  suballocation bases are read from the geometry resource's allocations and are
  zero until an engine writes them, which is the correct answer for a backend
  that gives each mesh its own buffers rather than pooling.
- The frame body is ordered by `CjsFrameDriver`, with device-facing steps as
  injected hooks. Presentation is not part of it: the previous frame is
  presented at the top of the next tick, and the tick is engine-owned.
- Vertex-declaration matching is resolved once, by semantic and index, into a
  binding plan engines consume. A shader input the mesh cannot supply is
  reported rather than resolved, because the two references legitimately differ
  on the substitute.
- Per-object constant records join the layout's declared stages to a
  technique's shader-type mask. Carbon's `Standard` and `Skinned` per-object
  classes disagree on gating the pixel payload; this package takes the gated
  form for every struct.
- The public class-purpose catalog remains substantially incomplete, so the
  organization documentation checker still reports missing catalog markers for
  classes that have not yet been through promotion review.
- `EveSpaceScene` owns persistent per-frame record storage and fills scene,
  lighting, fog, shadow-quality, and volumetric values. Its fill methods
  consume stored history and jitter fields, but JavaScript does not yet
  advance them; the host must provision them or they retain identity/zero
  defaults. The driver supplies current render-context/device values, frame
  counters, dimensions, gamma/mip/upscaling settings, atlas settings, and an
  optional shadow map. Pixel fill precedes vertex fill because it resets the
  upscaling amount read by the vertex record.
- Per-object constant data is complete on the CPU side: every catalogued struct
  with a Carbon producer in this package is filled. The exceptions are values
  that are literally GPU addresses - bone-ring and morph-ring offsets - which
  keep their defaults until an engine supplies them, and `Tr2PerObjectVSData`,
  whose only Carbon filler is an interior placeable that is not a
  runtime-trinity class.
- Generated classes may expose explicit obligations, but manual behavior
  belongs in maintained source from the first substantive edit. Some legacy
  generated files already contain portable implementations and are being
  promoted without waiting for every native or backend gap to close.
- The child reference and socket resource seam is synchronous and injected.
- Socket parameter auto-creation currently covers the emitted string
  parameter type; additional types require corresponding schema emission.
- Portable pick-batch and identity behavior is implemented for
  `EveSpaceObject2`, `EveTransform`, and the inherited transform family.
  GPU-readback scene picking remains explicit, as do decal pick-batch and
  sphere-pin pick surfaces.
- The cross-package bone-curve seam is incomplete. `Tr2BoneMatrixCurve`
  currently supplies a bone name where the runtime-character skinned-object
  surface accepts a numeric index, and it does not re-resolve that index when
  the skeleton tag changes.
- Calculated whole-object bounds remain planned as a separate lazy cache and
  are not inferred through generic graph traversal.
- The generated `EveSpaceSceneRenderDriver` is a data shell. Production
  composition still needs a host or engine to order scene update, visibility,
  batch collection, per-frame fills, render-job intent consumption, backend
  realization, and dispatch.

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
