# Eve runtime behavior

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/eve`
Audience: Runtime authors, engine authors, and integrators
Summary: Describes maintained CPU behavior for Eve combat effects, morph state, and distributions.

## Purpose

The maintained Eve tree implements portable object-graph behavior without
claiming renderer, resource-loader, or character-runtime ownership. These
contracts let engines consume faithful CPU state through explicit seams.

## Turrets and missiles

`EveMobile` maps authored `locator_*` transforms and optional animated bone
transforms into `EveTurretSet` instances. Turret sets own portable state
changes, paired turret and damage-locator selection, looping-fire checks,
tracking fades, muzzle transforms, target updates, firing effects, and
controller forwarding.

`EveSpaceObject2` supplies damage locators, miss positions, radius,
impact-material data, and the shield-ellipsoid collision surface consumed by
turrets and missiles.

`EveTransform`, `EveMissile`, and `EveMissileWarhead` own CPU transforms,
launch, eject, and tracking state, fixed-seed Perlin path offsets, target
switching, impacts, explosion callbacks, particles, visibility, and dynamic
MIRV bounds. Per-object records expose the world transform and missile size;
an engine packs and uploads those logical values.

`EveEffectRoot2` and `EveRootTransform` own detached effect placement,
controller and curve propagation, targetable-sphere behavior, child update and
renderable traversal, and authored effect level of detail.

Native pose realization, geometry loading, quad submission, device buffers,
and shader upload remain outside this package. A data-only generated child
does not gain invented rendering behavior merely because a maintained root
traverses it.

## Animation and morph state

Character GState ownership belongs to
`@carbonenginejs/runtime-character`. `Tr2GStateAnimation` and
`Tr2GStateParameter` are not Trinity exports.

The generic `Tr2GrannyAnimation` graph remains in Trinity for non-character
skinned geometry. Its updater samples legacy scalar vector tracks and modern
morph channels, composes layers in native lexical order, exposes a detached
morph snapshot, and applies `GrannyBoneOffset` corrections after animation
sampling and before world-transform composition.

`Tr2GrannyStateRes` remains owned by
`@carbonenginejs/runtime-resource`.

`Tr2Mesh` owns LOD-0 indexed morph-weight state, including manual weights and
baked flags. `EveChildMesh` rebuilds its CPU morph records during asynchronous
updates. Exact-name animation values override mesh weights; values below
`0.001` remain inactive; active runtime and baked records are partitioned
before an engine uploads or evaluates them.

Trinity prepares morph records but does not perform GPU deformation or baking.

## Frame context and transform modifiers

`EveSpaceScene` owns one `EveUpdateContext` and reuses it across frames. Before
`Update(realTime, simTime)`, the host stamps the current render context and
device, then calls `StampFrameContext` with the frustum, visibility thresholds,
LOD factor, and ray-tracing flag. `Update` adds time, origin shift, and the
data-texture manager before driving the scene collections in Carbon order.

Methods marked `@carbon.contextual` consume relocated Carbon-global state; the
context is their first argument. Transform modifiers are folded in authored
order, with the current transform passed from one modifier to the next.
`EveSpaceScene.Update` owns and stamps the context rather than consuming one,
so it is not contextual.

`EveSpaceSceneRenderDriver` remains generated schema intake, not a production
frame driver. Applications and engines still compose update, visibility,
renderable collection, lights, batches, per-frame fills, intent consumption,
and dispatch.

The generated `EveChildParticleSystem` already folds transform modifiers and
drives its portable emitter and particle-system updates. One narrower
animation seam remains open: `EveChildContainer.UpdateAsyncronous` uses the
palette threaded in its parent parameters instead of replacing it from the
container's own animation owner before the modifier fold. Its visibility pass
does obtain that owner's palette for attachments.

## Distribution contract

The Eve distribution family is browser-portable CPU behavior. Locator,
parent-locator, and volume placement generators build the initial placement
pool. Spawn and lifetime modifiers transform those records. Burst, interval,
controller, sphere, plane, and snake spawners drive the shared
`IEveDistributionRulesParent` contract.

Carbon's mutable `uint32_t&` placement counter is represented by one explicit
`{ value }` object.

Sphere, ellipsoid, and box volumes expose point generation and change
callbacks without creating renderer resources. Parent-locator generation uses
`EveSpaceObject2.GetLocatorsForSet`; volume generation uses
`IEveVolume.GeneratePointsInVolume`. These paths do not probe alternate method
names or infer renderer capabilities.

## Related documentation

- [Architecture and ownership boundaries](../architecture.md)
- [Current API](../reference/api.md)
- [Main semantic extraction](../reference/main-semantic-extraction.md)
- [Implementation status and audits](../reference/implementation-status.md)
