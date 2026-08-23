# Runtime Trinity implementation status

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity`
Audience: Runtime authors, engine authors, and maintainers
Summary: Defines the implementation audits and records current user-visible graph limitations.

## Purpose

Three complementary audits keep incomplete behavior explicit. Their command
output is authoritative for the checked source state; this page explains how
to interpret that output and records the current package-level limitation.

## Explicit implementation gaps

Run:

```sh
npm run audit:trinity:gaps
```

The gap audit inventories `@impl.notImplemented` methods and `@type.unknown`
properties in generated and maintained source. It excludes the deliberate
`src/trinity/dropped` quarantine by default.

The current source contains:

- 173 explicit methods across 57 classes; and
- one unknown property, the transient `EveModularObjectModifier.object`
  member in generated intake.

The remaining methods are concentrated in native, GPU, font, bitmap/atlas,
particle, scene-picking, smart-light, and related backend-facing families.
Markers are intentional: the runtime does not fabricate behavior before a
portable contract or engine seam is established.

Two of those methods are the required throwing operations on
`EveSmartLightBaseAttributeModifier`. Concrete smart-light modifiers override
them; the base fails loudly when an incomplete extension is used.

## Promoted-class parity

Run the parity audit against a compiled Carbon schema supplied by the caller:

```sh
npm run audit:trinity:parity -- --schema-root path/to/schema-build
```

The `CARBON_SCHEMA_ROOT` environment variable may provide the same location.
The audit resolves JavaScript inheritance, checks `@carbon.method` exposure,
and excludes deliberately quarantined classes.

Against the isolated 2026-08-22 Carbon schema refresh, the current audit checks
344 promoted classes and excludes 32 quarantined classes. It reports no
omitted or present-but-unexposed Carbon methods, missing JavaScript classes,
missing or ambiguous schemas, or unresolved non-`CjsModel` base classes.

`EveStretch2` and `EveTurretSet` now expose their complete renderable surface:
`HasTransparentBatches`, `GetSortValue`, and `GetBatches`. Their portable batch
descriptors retain Carbon's bucket, material, geometry, instance-count, and
draw-count contracts while leaving physical buffers to the selected engine.

## Type and nominal-contract gaps

Run:

```sh
npm run audit:trinity:types
```

The type audit distinguishes concrete model omissions, nominal contract gaps,
and deliberately opaque native structs. It does not treat an `I*` identity as
an acceptable duck type merely because JavaScript could call it structurally.

The current source reports 42 references across 26 missing concrete model
identities and 348 references across 62 nominal contract identities. Several
contracts belong to donor layers that have not yet moved into the combined
runtime, including audio and character-facing identities. Resolve each at its
lowest owning layer, make organization-owned implementations extend that base,
and call required methods directly. Opaque `@type.rawStruct` identities remain
informational because they describe native layouts rather than runtime classes.

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
- The frame body is ordered by `CjsFrameDriver`. Current split-package code
  still carries transitional injected hooks; combined-runtime cutover replaces
  required hooks with nominal executors that are validated once and called
  directly. Presentation is not part of the frame: the previous frame is
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
  Trinity-layer class.
- Generated classes may expose explicit obligations, but manual behavior
  belongs in maintained source from the first substantive edit. The five
  legacy Sprite2D files that carried implementations, their portable
  `Tr2Sprite2dContainerBase`, the corrected `EveSmartLightSpotLight`, and
  implemented `Obb` were promoted on 2026-08-22. The rewritten portable
  `Tr2ProjectBoundingBoxBracket` projection and its active-context curve path
  were promoted in the same tranche. `Tr2Sprite2dRenderJob` now owns its
  portable render-job traversal and picking behavior, while the common
  Sprite2D base starts with Carbon's picking state enabled and throws for
  unimplemented concrete traversal contracts. `Tr2Transform` now owns the
  common curve, SRT, mesh, sorting, motion-history, distance-scale, and all ten
  camera-modifier paths inherited by `EveTransform`; the active render context
  supplies Carbon's view position, matrices, and cached field of view. The
  particle system now accepts that inherited view-update call and derives its
  portable bounds/visibility scheduling without owning a GPU buffer.
  `Tr2ShadowMap` now owns its exact static and dynamic splits, light-space
  bounds, shimmer-stable orthographic frusta, and fixed per-split shader data.
  Its matrices remain logical until the scene's terminal RawData write. A
  nominal `CjsShadowMapExecutor` throws until an engine realizes atlas targets,
  passes, result drawing, and optional denoising.
  `Tr2VolumetricsRenderer` now owns per-attribute fog blending, quality and
  planet state, and the terminal froxel per-frame RawData writes. The scene
  owns one renderer by default and calls its per-frame fill directly; the
  promoted scene driver still needs to schedule the fog blend. Physical
  fog/volumetric resources and passes delegate through a nominal throwing
  `CjsVolumetricsExecutor`. The remaining generated methods are explicit
  throwing obligations; the generated tree no longer owns manual behavior.
  `Tr2SSAO` and `Tr2PostProcessRenderer` are also maintained now: their
  quality/settings methods are portable and implemented, while physical
  `Filter` and `Execute` remain exact-signature throwing engine obligations.
  `ITr2FroxelFogSettings` is now the maintained nominal provider contract
  consumed by the registry. `EveCurveLineSet` is also maintained and owns Eve
  transform, visibility, and per-object policy; its `Tr2CurveLineSet` base now
  rebuilds Carbon's CPU bounds, while physical line-stream batches remain one
  visible engine obligation. `EveConnector` now owns the portable connector
  geometry and animation policy and emits directly into that maintained line
  set. `EveLineContainer` owns the ordered clear/update/append/submit cycle and
  delegates visibility and bounds directly. `EveProjectBracket` now consumes
  the active frame context to project, dock, offset, round, and publish a
  tracked world position with Carbon's visibility-callback latch.
  `EveTacticalOverlay` now owns Carbon's effect-local variables, LOD and
  prior-frame segment budget, culling, and exact flat quad-instance records.
  `EveChildInstanceMeshRenderer` now owns distribution updates, visibility,
  bounds, Carbon-exact billboard transforms, and canonical CPU instance rows;
  `EveSmartLightMesh` adds the smart-light group, colour-modifier, and material
  parameter policy over that nominal base. Their instance declaration uses the
  shader-compatible `TEXCOORD8` through `TEXCOORD14` range, while engines remain
  responsible for physical buffer realization.
  Their generated classes and the standalone connector enum have been retired.
- The child reference and socket resource seam is synchronous and injected.
- Socket parameter auto-creation currently covers the emitted string
  parameter type; additional types require corresponding schema emission.
- Portable pick-batch and identity behavior is implemented for
  `EveSpaceObject2`, `EveTransform`, and the inherited transform family.
  GPU-readback scene picking remains explicit, as do decal pick-batch and
  sphere-pin pick surfaces.
- The cross-package bone-curve seam is incomplete. `Tr2BoneMatrixCurve`
  currently supplies a bone name where the `src/character` skinned-object
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
