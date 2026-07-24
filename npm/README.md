# @carbonenginejs/runtime-trinity

Faithful CarbonEngine Trinity/Eve scene-graph model (the serializable Trinity
Graph) and visual resource classes. Ports Tr2*/Eve* 1:1 from CarbonEngine.
GPU-free.

Part of the CarbonEngineJS runtime/engine tier. GPU-free JavaScript source,
decorated for CarbonEngineJS schema metadata.

## Status

Active Carbon-faithful ports cover generated schema classes plus handwritten
controller, curve, Eve, particle, shader-model, and utility behavior.
`tools-core` owns Carbon scanning, schema generation, and class emission.
Reviewed generated output is copied into `src/generated`; this package does
not import `tools-core` or depend on its workspace or scratch directories.

This runtime owns serializable CPU-side state and behavior. Geometry, texture,
and effect resources are supplied by resource runtimes; WebGPU/WebGL device,
upload, binding, and destruction lifecycles belong to renderer runtimes.

## WebGPU Main semantic extraction

Two GPU-free helpers expose the proven runtime values needed by the first
bounded Eve space-object Main binding profile:

- `extractTr2EffectConstantValues(effect, reflectedConstants)` reads only the
  requested reflected float constants across `parameters` and
  `constParameters`. Dynamic parameters use `CopyValueToEffect`, preserving
  rerouted values and sRGB-to-linear conversion. Missing, duplicate, malformed,
  array, resource-like, or unsupported values fail closed.
- `createEveSpaceObjectMainPerObjectValues({ object, shared, shipData,
  vsOverrides, psOverrides })` maps `EveSpaceObject2` transform aliases,
  trustworthy clip values, `EveSpacePerObjectData` fields/SH alias, and custom
  masks into frozen plain `perObjectVS`/`perObjectPS` values.

The per-object precedence is object-derived values, then explicitly supplied
shared data, then VS/PS overrides. `shipData` is always required because no
source-proven builder currently exists. Ellipsoid `w`, screen size, morph/bone
offsets, impact fields, and similar optional values are copied only when the
shared data or overrides supply them; they are never guessed.

There is deliberately no per-frame scene builder yet. Previous matrices,
shadow state, projection conventions, gamma/mip policy, frame/jitter values,
resolution, and other renderer-owned state are not completely represented by
the Trinity scene graph. The active renderer must provide the complete
`perFrameVS` and `perFramePS` semantic objects before an engine serializer is
called.

Baseline checks:

```sh
npm run build:npm
npm test
```

## Turrets and missiles

The maintained Eve combat-effect graph now includes Carbon's portable turret,
stretch, and MIRV missile behavior:

- `EveMobile` maps authored `locator_*` transforms (and optional animated bone
  transforms) into `EveTurretSet` instances. Turret sets own state changes,
  paired turret/damage-locator selection, looping-fire rechecks, tracking fades,
  muzzle transforms, target updates, firing effects, and ambient/controller
  forwarding.
- `EveSpaceObject2` supplies the targetable damage-locator, miss-position,
  radius, impact-material, and shield-ellipsoid collision surface consumed by
  both turrets and missiles.
- `EveTransform`, `EveMissile`, and `EveMissileWarhead` own CPU transforms,
  launch/eject/tracking states, Carbon fixed-seed Perlin path offsets, target
  switching, impacts, explosion callbacks, particles, visibility, and dynamic
  MIRV bounds. Their per-object constant data (world plus missile size) is
  published through the RawData store — `GetPerObjectData` Allocs the record by
  name and Sets logical values, the store packs per the engine layout.
- `EveEffectRoot2` and `EveRootTransform` own detached effect placement,
  controller/curve propagation, targetable sphere behavior, child update and
  renderable traversal, and authored effect LOD. This makes effect-root impact
  graphs executable without making Trinity responsible for their draw calls.

Native animation-pose realization, geometry/resource loading, quad submission,
draw batches, device buffers, and shader uploads remain renderer/runtime-engine
responsibilities. Trinity exposes duck-typed pose, emitter, renderable, and
constant-data seams without importing a browser graphics API. A generated
effect child remains data-only until its own maintained runtime behavior is
implemented; root traversal does not invent missing child rendering behavior.

Character GState ownership lives in `runtime-character`:
`Tr2GStateAnimation` and `Tr2GStateParameter` are not Trinity exports. The
generic `Tr2GrannyAnimation` graph remains here for non-character skinned
geometry, while `Tr2GrannyStateRes` remains a runtime-resource class. The
generic updater samples legacy scalar vector tracks and modern morph channels,
composes layers in native lexical order, exposes a detached morph snapshot,
and applies `GrannyBoneOffset` corrections after animation sampling but before
world-transform composition.

`Tr2Mesh` owns the native LOD-0 indexed morph-weight state, including persisted
manual weights and baked flags. `EveChildMesh` rebuilds its CPU morph record
buffer during asynchronous updates: exact-name animation values override mesh
weights, values below `0.001` remain inactive, and active runtime/baked records
are partitioned before an engine backend uploads or evaluates them. This
package prepares those records but does not perform GPU deformation or baking.

## Implementation-gap audit

Explicit generated and maintained implementation gaps can be inventoried with:

```sh
npm run audit:gaps
```

Promoted-class public method parity can be checked against the compiled Carbon
schema with:

```sh
npm run audit:parity
```

The parity audit resolves JavaScript inheritance, requires `@carbon.method`
exposure, and excludes the explicitly documented `src/dropped` quarantine. It
uses the sibling `tools-core/.scratch/schema-build` by default; pass
`-- --schema-root <directory>` or set `CARBON_SCHEMA_ROOT` for another compiled
schema location.

The command reports `@impl.notImplemented` methods and `@type.unknown`
properties by class, family, source owner, and line. It excludes `src/dropped`
by default because every quarantined file has a file-specific disposition in
`src/dropped/README.md`; use `-- --include-dropped` only to inspect that
quarantine. Marker output is a lower bound: maintained classes must also be
checked against Carbon public headers, interfaces, implementations, and Blue
exposure to find methods omitted rather than stubbed.

As of 2026-07-21, the audited in-scope snapshot contains 127 explicit method
gaps across 32 classes and no unknown properties, down from 389/106 and 85/34
respectively. The completed wave covers Carbon's
missing `EveSpaceObject2` bounds/frustum surface, CPU primitive and line
collections, line graphs, render-debug accumulation and backend-neutral render
intents, bullet-storm/explosion lifecycle behavior, child controller/resource
forwarding, tactical trails, and ship booster-locator rebuilding. Remaining
gaps are concentrated in coherent native, GPU, font, animation, bitmap/atlas,
particle, scene-picking, and swarm families; they are intentionally still
explicit until a browser owner or backend seam is established.

The promoted-class parity audit checks 270 maintained classes, excludes 18
documented quarantines, and currently reports no omitted or unexposed Carbon
methods, missing schemas/classes, or unresolved base classes.

The child reference/socket resource seam is synchronous and injected. Socket
parameter auto-creation currently covers the emitted string parameter type;
additional Carbon template types require corresponding `tools-core` emission
before runtime-trinity can own them faithfully.

Calculated whole-object bounds are planned as a separate lazy cache rather
than a mutation of Carbon's authored culling bounds. The intended object-local
box and sphere caches use `__state.flags` token `"bounds"`; only a successful
`GetObjectBounding*` recomputation clears it. World AABBs derive from the local
cache and current transform. Explicit visual ownership paths—not generic model
graph traversal—decide which children, attachments, turrets, boosters, and
dynamic effects contribute.

## Graph ownership and GPU realization

Carbon class ownership follows graph fidelity, not graphics terminology.
`TriDevice`, `TriRenderJob`, render steps, render contexts, targets, buffers,
effects, shaders and presentation records remain canonical Trinity classes.
They describe Carbon object graphs and must be registerable, hydratable,
inspectable and serializable without a canvas or GPU backend.

Those classes do not own live GPU objects. WebGPU and WebGL engines separately
own resource realization, context/device loss, synchronization, presentation,
uploads, pipelines/programs, bindings, command execution and destruction.
Backend objects must stay outside persisted schema fields, normally in
engine-owned associations.

We deliberately do not insert a `runtime-device` package between Trinity and
the engines. WebGPU and WebGL have materially different lifecycles; a shared
device lifecycle would either leak backend concepts or become a misleading
lowest-common-denominator abstraction. Applications or `runtime-core` may
select and inject an engine directly. A separate shared contract should only be
introduced after two real engines demonstrate a stable common seam that is
larger than structural capability checks.

This keeps the package graph small and avoids constructor duplication,
cross-package enum ownership, import-order registration, partial inheritance
families, and generator exclusions for classes that are still graph data.

## Render-job execution contract

`TriRenderJob` and `Tr2RenderJobs` own Carbon's backend-neutral execution
semantics: ordered step snapshots, `RJ_IN_PROGRESS` cursor persistence, nested
job result mapping, recurring/once/chained scheduling, and target/depth stack
validation and unwind. `TriRenderJob` exposes its status vocabulary as class
statics; `TriRenderStep` does the same for step results.

`Run(realTime, simTime, executor)` accepts a duck-typed executor/context. Trinity
stores no generic RHI object and defines no `CjsRenderGraphExecutor` helper.
WebGL may execute a step immediately; WebGPU may plan pass boundaries and encode
commands, but both must preserve the observable order and yield boundary.
Nested jobs receive the same executor identity.

The default `Tr2RenderContext` is only a GPU-free intent stack and diagnostic
surface. Live contexts, targets, encoders, command buffers, handles,
presentation, and device-loss state remain engine-owned. JS execution
intentionally hardens Carbon's exception and leaked-stack paths with
deterministic `finally` cleanup and diagnostics.

Maintained target/depth, clear, viewport, view, projection, resolve, copy,
mipmap and presentation steps normalize Carbon arguments into this intent
surface. They do not import WebGL/WebGPU APIs or decide pass boundaries.

## Render-batch collection

`src/trinityCore/` hosts the GPU-free render-batch collection layer mirroring
Carbon's `TriRenderBatch`/`TriRenderBatchAccumulator`: `Tr2RenderBatch` (a neutral
DATA struct — effect key, geometry source, per-object data, render mode, draw
args, `groupCount`; no render method), `ITriRenderBatchAccumulator`/
`TriRenderBatchAccumulator` (collect → sort → GDPR group-count), `TriRenderBatchMap`
(one accumulator per `TriBatchType`, `GetBatchesFromRenderables`), `Tr2PerObjectData`,
and `Tr2MeshBase.GetBatches`/`CreateGeometryBatch` (per-area builder emitting a
deferred geometry descriptor).

A batch is neutral CPU DATA; the engine realizes referenced resources and
dispatches the finalized accumulators — runtime-trinity never holds GPU handles.
The target architecture (library-level `CjsBatchManager`, pull-realize via
`__state.rebuild` tokens, one CPU path for WebGL1/WebGL2/WebGPU) remains
planned and is not part of the current public runtime contract.

## Distribution CPU contract

The Eve distribution family is maintained as browser-portable CPU/object-graph
behavior. Locator, parent-locator, and volume placement generators build the
Carbon initial-placement pool; spawn and lifetime modifiers transform those
records; burst, interval, controller, sphere, plane, and snake spawners drive
the same `IEveDistributionRulesParent` contract. Carbon's `uint32_t&`
placement counter is represented by one explicit mutable `{ value }` object.

Sphere, ellipsoid, and box volumes expose Carbon point generation and change
callbacks without creating renderer resources. Parent-locator generation uses
the public `EveSpaceObject2.GetLocatorsForSet` contract, and volume generation
uses `IEveVolume.GeneratePointsInVolume` directly. These paths intentionally
do not probe alternate method names or infer renderer capabilities.

## Post-process graph contract

`Tr2PostProcess2` and `Tr2PostProcessAttributes` are device-free graph classes.
Trinity owns effect activation and quality gates, LUT ordering, priority/intensity
volume blending, and the rebuilding of authored effect records. The 56 Carbon
post-process attributes are exposed as their exact enabled/value pairs; macro
placeholders are not part of the JavaScript contract.

Live post-processing remains backend work. WebGL and WebGPU executors must
independently realize temporary and persistent textures, exposure buffers,
TAA/upscaler history, compute or fragment alternatives, fullscreen passes,
readback, and loss recovery. They must preserve Carbon's observable pass order,
but Trinity does not prescribe a shared RHI or serialize those internal passes
as `TriRenderStep` objects.

## Provenance

CarbonEngine and Fenris Creations (CCP Games) are named for interoperability and
provenance context. This package's runtime code is CarbonEngineJS original work
that ports or adapts CarbonEngine class structure and behavior, verified against
the CarbonEngine C++ source. Not affiliated with or endorsed by CCP Games.
