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

- 142 explicit methods across 44 classes; and
- zero unknown properties.

The remaining methods are concentrated in native, GPU, font, bitmap/atlas,
particle, scene-picking, smart-light, and related backend-facing families.
Markers are intentional: the runtime does not fabricate behavior before a
portable contract or engine seam is established.

The 2026-08-26 portable pass closed nine markers, corrected
`Tr2ManipulationTool`'s five pure virtuals to abstract throwing root methods,
and added the missing `Tr2UpscalingTechniqueInfo` schema class. Four generated
records that conflated an interface with its nested data structure are now
maintained nominal contracts with separately named packets. The promoted
`Tr2Sprite2dScene` also exposes `displayX` and `displayY` as Carbon's scalar
aliases of `translation`; its picking method remains explicit engine work.
`EveSprite2dBracketRenderer` now has its real Sprite2D parent and makes the
previously silent GPU submission gap explicit, while
`Tr2StepExecuteRenderNode` now fulfills its inherited step contract through
the runtime render context and nominal render-node interface.
The emitter promotion also replaced incompatible ad-hoc update records with
the registered `ITr2GenericEmitterUpdateArguments` packet and restored the
previously absent `Tr2ParticleSystem.Update` CPU path; child particle systems
now call both emitters and systems directly.
`ITr2InstanceData` likewise separates the provider contract from its returned
instance-data packet. `Tr2RuntimeInstanceData` and `Tr2ParticleSystem` now
publish their ready CPU buffers, normalized layouts, counts, and bounds through
that contract; `Tr2DirectInstanceData` deliberately inherits the throwing
buffer/readiness methods until an engine supplies its physical realization.

Required interface operations are not counted as implementation gaps. Their
canonical root carries `@impl.abstract` and throws; a subclass that does not
override the operation therefore inherits the failure.

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

## 2026-08-25 Carbon closure

The current Carbon child, damage, modular, raycast, and bounding-box tranche is
implemented in maintained source:

- `EveDamageOverlay` owns damage state, faders, impacts, locator masks, packed
  data rows, and shader selection; `EveImpactOverlay` composes it, maintains
  shield ellipsoid intersections and header/impact rows, applies Carbon's
  squared shield-damage colour fade, enablement, LOD, reuse, lifetime, and
  maximum-impact rules, and preserves the legacy proxy surface.
- Child meshes and instanced child meshes own and inherit overlay effects,
  emit overlay and damage batches, apply LOD/culling, and transform clip data by
  the full inverse local matrix.
- Space-object roots propagate child ownership and part tags, merge child
  locator/geometry ranges, invalidate those merged views, route child damage,
  and run the damage-locator filter through the resource-owned raycast session.
- `Tr2RaycastGeometryRes` is a maintained resource and `TriGeometryRes` owns the
  prepare/reset/readiness/failure/intersection lifecycle. Hit results expose
  Carbon's canonical `position`, unit `normal`, and actual edge-cross-product
  `unnormalizedNormal`; `point` remains a compatibility alias.
- `EveModularObjectModifier` uses an injected SOF `BuildChild` capability;
  Trinity does not import SOF. Successful mutations immediately maintain
  aggregate sphere and Carbon inner-ellipsoid bounds, reacquire graph records
  replaced by values hydration, failed builds are atomic, and transient
  edit-session state is private rather than schema data.
- `EveChildCloud` now inherits the maintained `EveSpaceObjectChild` contract
  and owns its CPU SRT composition, world bounds, visibility gate, and exposed
  transform/sphere queries; its GPU cloud realization remains engine-owned.
- `CjsInstancedMeshManager` is the dependency-free CPU registration contract.
  Trinity calls it directly, registers terminal `RawData`, and retains the
  issuing manager separately from opaque handles; production engine
  realization remains open in the supporting engines.
- `ITr2BoundingBox` is a dependency-free global contract. Effect roots,
  transforms, planets, root transforms, and space objects inherit its abstract
  methods through dependency-safe contract mixins and override the Carbon
  provider surface. Mesh bounds include Carbon's material scale, displacement,
  and rotating-vertex expansion. Character/interior providers remain separate
  character work.
- `ITr2Renderable` is a Trinity-owned nominal contract with Carbon's concrete
  default visibility and four throwing required methods. Its 28 direct Carbon
  provider classes inherit the contract without branding broad model or entity
  roots. Batch collection calls it directly, and reflection-component
  registration rejects structural lookalikes.
- Child meshes without a live animation updater use Carbon's identity rest-pose
  palette, and overlay collection stops when geometry is unavailable.

Focused regressions cover shield rows, colour fade and impact reuse, null-draw
overlay suppression, custom-mask matrix orientation, opaque zero/frozen
manager handles, terminal instance-data registration, raycast result shape,
modular hydration identity, inner-ellipsoid bounds and failure atomicity,
legacy-cloud CPU behavior, nominal Trinity bounding providers, promoted child
ownership, and package-export tombstones. Exact suite counts belong in the
verification record for the source change, not this page.

## Type and nominal-contract gaps

Run:

```sh
npm run audit:trinity:types
```

The type audit distinguishes concrete model omissions, nominal contract gaps,
and deliberately opaque native structs. It does not treat an `I*` identity as
an acceptable duck type merely because JavaScript could call it structurally.

The refreshed `npm/dist` snapshot reports 31 references across 21 missing
concrete model identities and 274 references across 41 nominal contract
identities. The source contract surfaces now include `ITr2BoundingBox` and
`ITr2RenderNode` globally,
plus `ITr2Renderable`, `ITr2InstanceData`, `ITr2ImpostorSource`, and
`ITr2GenericEmitter` in their owning Trinity families. Focused runtime tests
must additionally prove provider ancestry because the type audit does not
inspect assignability. Resolve
each organization-owned contract at its lowest owning layer, put
`@impl.abstract` and the throwing required method on that root, make concrete
implementations extend it, and call required methods directly. Consumers do
not preflight methods on organization-owned values. Opaque `@type.rawStruct`
identities remain informational because they describe native layouts rather
than runtime classes.

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
- The frame body is ordered by core's `CjsFrameDriver`, which requires exact
  lifecycle, render-context, and render-job identities. Presentation is not
  part of the frame: the previous frame is presented at the top of the next
  tick, and the tick is engine-owned.
- Vertex-declaration matching is resolved once, by semantic and index, into a
  binding plan engines consume. A shader input the mesh cannot supply is
  reported rather than resolved, because the two references legitimately differ
  on the substitute.
- Per-object constant records join the layout's declared stages to a
  technique's shader-type mask. Carbon's `Standard` and `Skinned` per-object
  classes disagree on gating the pixel payload; this package takes the gated
  form for every struct. Each joined record retains its canonical
  `CjsConstantPayload` alongside the terminal byte view, so an engine can honor
  dirty/upload/commit lifecycle without reconstructing the owner.
- The public class-purpose catalog covers every current class with class-level
  documentation. `npm run catalog:trinity` reports no missing catalog entry.
  Promotion review must continue to install a descriptor before a new
  maintained class is considered complete.
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
  future scene driver still needs to schedule the fog blend. Physical
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

The public class-purpose catalog is current for documented classes. Promotion
still requires reviewed descriptor metadata, catalog regeneration, and
documentation validation; dropped quarantine classes remain excluded.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Generated-class lifecycle](../concepts/generated-class-lifecycle.md)
- [Current API](api.md)
