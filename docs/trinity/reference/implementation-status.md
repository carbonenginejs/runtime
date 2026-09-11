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

The recorded gap-audit snapshot contains (not a fresh current-source count):

- 142 explicit methods across 44 classes; and
- zero unknown properties.

In that snapshot, the remaining methods were concentrated in native, GPU,
font, bitmap/atlas, particle, scene-picking, smart-light, and related
backend-facing families.
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

Against the isolated 2026-08-22 Carbon schema refresh, the recorded audit checked
344 promoted classes and excluded 32 quarantined classes. It reported no
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

The recorded `npm/dist` snapshot reported 31 references across 21 missing
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

The architecture owns [mesh draw arguments](../architecture.md#render-batch-contract),
[frame/tick ordering](../architecture.md#frame-contract), and
[vertex-declaration matching](../architecture.md#vertex-declaration-matching).
`CjsFrameDriver` requires exact lifecycle, render-context, and render-job identities.
Catalog completeness and promotion gates are below.

- Device creation, GPU resources, draw submission, presentation, and
  device-loss recovery require an engine package.
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
- The five legacy Sprite2D implementations, `Tr2Sprite2dContainerBase`,
  corrected `EveSmartLightSpotLight`, `Obb`, and the rewritten
  `Tr2ProjectBoundingBoxBracket` projection/active-context curve path were
  promoted on 2026-08-22. `Tr2Sprite2dRenderJob` owns portable render-job traversal and
  picking; the common Sprite2D base enables Carbon's picking state and throws
  for unimplemented concrete traversal contracts.
  `Tr2Transform` owns curve, SRT, mesh, sorting, motion-history, distance-scale,
  and all ten camera-modifier paths inherited by `EveTransform`; the active
  context supplies view position, matrices, and cached field of view. The
  particle system accepts the inherited view-update call and derives portable
  bounds/visibility scheduling without a GPU buffer.
  `Tr2ShadowMap` owns exact static and dynamic splits; the
  [shadow](../architecture.md#cascaded-shadow-contract),
  [fog](../architecture.md#froxel-fog-contract),
  [post-process](../architecture.md#post-process-renderer-boundary), and
  [curve-line](../architecture.md#curve-line-boundary) contracts own the
  maintained CPU behavior and explicit throwing engine obligations.
  The scene owns one `Tr2VolumetricsRenderer` by default.
  `EveProjectBracket` retains the visibility-callback latch, and
  `EveTacticalOverlay` retains LOD and the prior-frame segment budget.
  `EveChildInstanceMeshRenderer` owns distribution updates, visibility, bounds, and Carbon-exact
  billboard transforms; `EveSmartLightMesh` adds smart-light group,
  colour-modifier, and material-parameter policy. Their canonical CPU rows and
  shader-compatible declaration belong to the
  [instance-stream contract](../architecture.md#instance-stream-contract).
  These generated classes and the standalone connector enum are retired;
  remaining generated methods are explicit throwing obligations, not manual
  behavior. [Promotion starts with the first substantive edit](../concepts/generated-class-lifecycle.md#current-lifecycle).
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
- The maintained `EveSpaceSceneRenderDriver` implements a partial frame spine:
  scene update, lighting/fog updates, visibility/gather, batch submission and
  per-frame fills. It does not yet implement the complete rendering sequence.

## Planned completion gates

See [Generated-class lifecycle](../concepts/generated-class-lifecycle.md) for
promotion and maintained-home review. Later schema/interface obligations remain
explicit parity-audit gaps without undoing promotion. Backend-only methods remain
explicit until an owning engine exposes a proven capability.

The public class-purpose catalog is current for documented classes. Promotion
still requires reviewed descriptor metadata, catalog regeneration, and
documentation validation; dropped quarantine classes remain excluded.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Generated-class lifecycle](../concepts/generated-class-lifecycle.md)
- [Current API](api.md)
