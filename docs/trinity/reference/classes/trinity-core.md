# Trinity core, shader, and device classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinity/core`, `@carbonenginejs/runtime/trinity/shader`, `@carbonenginejs/runtime/trinity/ui`
Audience: Engine authors and integrators
Summary: Catalogs GPU-free constant data, shader and material facades, and device-presentation records an engine realizes from the Trinity graph.

<!-- class:RawData -->
## `RawData`

A packed constant-data slice bound to a resolved layout.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/rawData/RawData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriPoolAllocator -->
## `TriPoolAllocator`

Registers constant-data struct shapes and leases packed payloads from a per-engine arena.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/rawData/TriPoolAllocator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VertexDefinition -->
## `Tr2VertexDefinition`

A mesh's vertex element list, and the matching of it to a shader's inputs.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/vertex/Tr2VertexDefinition.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BindingVector3 -->
## `Tr2BindingVector3`

Tr2BindingVector3 (trinityCore) - generated from schema shapeHash a8ef1406....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/binding/Tr2BindingVector3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsShadowMapExecutor -->
## `CjsShadowMapExecutor`

Defines the nominal backend contract for realizing Trinity's cascaded-shadow intents.

Its base methods throw until an engine supplies physical atlas and pass work.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/context/CjsShadowMapExecutor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsVolumetricsExecutor -->
## `CjsVolumetricsExecutor`

Nominal backend contract for realizing Trinity's volumetric and froxel-fog intents.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/context/CjsVolumetricsExecutor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2Renderable -->
## `ITr2Renderable`

Trinity-owned contract for objects collected through the renderable path.

Its Carbon visibility default is concrete; required batch, transparency,
sorting, and per-object-data methods throw until a provider implements them.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/ITr2Renderable.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2ImpostorSource -->
## `ITr2ImpostorSource`

Contract for an object that can be captured into an impostor atlas.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/mesh/ITr2ImpostorSource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2ImpostorSourceImpostorHash -->
## `ITr2ImpostorSourceImpostorHash`

Camera directions used to decide when an impostor must be recaptured.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/mesh/ITr2ImpostorSource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2InstanceData -->
## `ITr2InstanceData`

Contract for a provider of instance-stream data and layout metadata.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/mesh/ITr2InstanceData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2InstanceDataInstanceData -->
## `ITr2InstanceDataInstanceData`

One realized instance-buffer slice returned by an ITr2InstanceData provider.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/mesh/ITr2InstanceData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2UpscalingTechniqueInfo -->
## `Tr2UpscalingTechniqueInfo`

One device-reported upscaling technique and the quality settings and frame generation support available for it.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/device/Tr2UpscalingTechniqueInfo.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Transform -->
## `Tr2Transform`

Provides the common placeable-renderable transform behavior.

It advances curve sets, composes SRT state, preserves motion history, applies
Carbon's camera modifiers, delegates batches, and computes sort distance.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/Tr2Transform.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ShadowMap -->
## `Tr2ShadowMap`

Produces cascaded-shadow endpoints, bounds, frusta, and logical per-split data.

Physical rendering delegates to the installed shadow executor.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/Tr2ShadowMap.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VolumetricsRenderer -->
## `Tr2VolumetricsRenderer`

Blends froxel-fog state and writes Carbon's inline per-frame fog constants.

Physical fog, volumetric, environment-map, and shadow rendering delegate
through the nominal throwing `CjsVolumetricsExecutor` engine contract.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/volumetrics/Tr2VolumetricsRenderer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DynamicBinding -->
## `Tr2DynamicBinding`

A value binding described by object paths: it resolves both endpoints against its owner's parameter map, builds a weak TriValueBinding and starts copying after a configured delay.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/binding/Tr2DynamicBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ExternalParameter -->
## `Tr2ExternalParameter`

A named handle onto one attribute - optionally one vector component - of another object, exposing it for type-checked reads and writes.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/binding/Tr2ExternalParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PyValueBinding -->
## `Tr2PyValueBinding`

Tr2PyValueBinding (trinityCore) - generated from schema shapeHash 435f9fdc....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/binding/Tr2PyValueBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriValueBinding -->
## `TriValueBinding`

Copies one attribute of a source object onto an attribute of a destination object, applying a scale and per-component offset through a type-checked copy plan built when the endpoints resolve.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/binding/TriValueBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsBatchManager -->
## `CjsBatchManager`

Owns the per-library render-batch producer and collector registry and drives the GPU-free per-frame flow of realize, build, finalize into one accumulator per batch type.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/CjsBatchManager.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:GrannyBoneOffset -->
## `GrannyBoneOffset`

Per-bone rotation and translation offsets layered on top of an animated rig, keyed by bone name until bound into the rig's joint order.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/GrannyBoneOffset.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITriRenderBatchAccumulator -->
## `ITriRenderBatchAccumulator`

Abstract base for render-batch accumulators: holds the shared rendering mode, user data and per-object-data store, and declares the collect and sort contract concrete accumulators implement.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/ITriRenderBatchAccumulator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerFrameLayouts -->
## `CjsPerFrameLayouts`

Resolved per-frame layouts, keyed by struct name.

- Export: @carbonenginejs/runtime/trinity/perframe
- Source: src/trinity/core/rawData/CjsPerFrameLayouts.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerObjectLayouts -->
## `CjsPerObjectLayouts`

Resolved per-object layouts, keyed by struct name.

- Export: @carbonenginejs/runtime/trinity/perobject
- Source: src/trinity/core/rawData/CjsPerObjectLayouts.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BoundingLineSet -->
## `Tr2BoundingLineSet`

A line set that draws an axis-aligned bounding box and its picking volume.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2BoundingLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveLineSet -->
## `Tr2CurveLineSet`

Owns editable curve-line records and their portable CPU runtime state.

That state includes Carbon's tessellated segment counts, local bounds,
transparent sorting, and the explicit physical line-stream draw obligation.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2CurveLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DebugRenderer -->
## `Tr2DebugRenderer`

Resolves which debug visualisations an object draws, from per-owner options over a default set.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2DebugRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DepthStencil -->
## `Tr2DepthStencil`

Tr2DepthStencil (trinityCore) - generated from schema shapeHash 9acb2c99....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/Tr2DepthStencil.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DirectInstanceData -->
## `Tr2DirectInstanceData`

Instance data whose buffer lives entirely on the GPU: Trinity keeps only the CPU-side layout metadata, stride, instance count and bounds.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2DirectInstanceData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ExpressionTermInfo -->
## `Tr2ExpressionTermInfo`

Describes one term the expression language exposes - a variable, a function or a string function - with its category, argument names and help text.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/variable/Tr2ExpressionTermInfo.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuBuffer -->
## `Tr2GpuBuffer`

Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/Tr2GpuBuffer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITr2PoseModifier -->
## `ITr2PoseModifier`

Carbon's canonical modify-the-sampled-pose hook: implemented by consumers that adjust a freshly sampled animation pose in place (turret aiming, character look-at fixups) and registered non-owning on the animation host.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/ITr2PoseModifier.js
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GrannyAnimation -->
## `Tr2GrannyAnimation`

Tr2GrannyAnimation (trinityCore) - promoted from generated; shapeHash 056bad2a.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/Tr2GrannyAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2InstancedMesh -->
## `Tr2InstancedMesh`

A mesh drawn once per entry of a separate instance-data stream, with static bounds or bounds expanded by the per-instance size.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2InstancedMesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2LineGraph -->
## `Tr2LineGraph`

A rolling sample history with named markers and running statistics, drawn as a line graph.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2LineGraph.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2LineSet -->
## `Tr2LineSet`

A set of coloured lines with an accompanying picking-triangle list, submitted as one buffer.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2LineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ManipulationTool -->
## `Tr2ManipulationTool`

The interactive manipulator base: axis selection, drag handling and the callback a move reports through.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/tool/Tr2ManipulationTool.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MaterialParameterStore -->
## `Tr2MaterialParameterStore`

Tr2MaterialParameterStore (trinityCore) - generated from schema shapeHash 119f32c2....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/Tr2MaterialParameterStore.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Mesh -->
## `Tr2Mesh`

A mesh backed by a geometry resource, adding the resource path plus the morph-target weights and baked-morph state on top of Tr2MeshBase.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2Mesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MeshArea -->
## `Tr2MeshArea`

One drawable range of a mesh: the index and count of geometry groups plus the effect, shadow, depth and LOD state that decide how the range is batched.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2MeshArea.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MeshBase -->
## `Tr2MeshBase`

Base mesh: owns one mesh-area list per batch type and turns the displayed areas into GPU-free render batches and shadow area blocks.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2MeshBase.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PerObjectData -->
## `Tr2PerObjectData`

GPU-free base for per-object render data, carrying the object id a batch is picked and identified by; the GPU upload path is engine-owned.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/rawData/Tr2PerObjectData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PrimaryRenderContext -->
## `Tr2PrimaryRenderContext`

Tr2PrimaryRenderContext (trinityCore) - generated from schema shapeHash 92b87061....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/context/Tr2PrimaryRenderContext.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PrimitiveSet -->
## `Tr2PrimitiveSet`

A drawable set of primitives with a world transform, sort value and bounding sphere.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2PrimitiveSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuadRenderer -->
## `Tr2QuadRenderer`

Collects quads from every registered effect into one merged instance buffer and emits them as batches.

`AddQuads` copies terminal instance bytes without interpreting them. Producers
that own mixed-width records, such as Eve's 108-byte quad layouts, pack their
float32 rows and float16 tails before submission. Numeric arrays remain a
float32-compatible convenience for uniformly typed records.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/Tr2QuadRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuadRendererEffectRecord -->
## `Tr2QuadRendererEffectRecord`

One registered quad effect (Carbon Tr2QuadRenderer::EffectRecord).

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/Tr2QuadRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderBatch -->
## `Tr2RenderBatch`

One draw's worth of CPU descriptor state - material and shader key, geometry binding, draw arguments and sort keys - holding no device resources.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAreaBlock -->
## `TriRenderBatchAreaBlock`

A contiguous (startIndex, count) run of mesh groups, as consumed by the shadow and overlay area-block paths.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAreaBlocksWithSharedMaterial -->
## `TriRenderBatchAreaBlocksWithSharedMaterial`

Groups the area blocks that draw with one shared shader material on the shadow and overlay path.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderContext -->
## `Tr2RenderContext`

Tr2RenderContext (trinityCore) - generated from schema shapeHash 73e2a4e7....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/context/Tr2RenderContext.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderTarget -->
## `Tr2RenderTarget`

Tr2RenderTarget (trinityCore) - generated from schema shapeHash dc39c914....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/Tr2RenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RuntimeGpuBuffer -->
## `Tr2RuntimeGpuBuffer`

Tr2RuntimeGpuBuffer (trinityCore) - generated from schema shapeHash 0cb23744....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/Tr2RuntimeGpuBuffer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RotationTool -->
## `Tr2RotationTool`

Extends the manipulation tool with quaternion rotation state and angular precision.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/tool/Tr2RotationTool.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RuntimeInstanceData -->
## `Tr2RuntimeInstanceData`

Owns a CPU-side instance stream - a vertex element layout, the packed per-instance rows and their bounding box - and can spawn the same rows into a particle system on demand.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2RuntimeInstanceData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalingTool -->
## `Tr2ScalingTool`

An interactive scaling manipulator that turns pointer drags along a selected axis into a scale.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/tool/Tr2ScalingTool.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SerializedMorphAnimation -->
## `Tr2SerializedMorphAnimation`

Tr2SerializedMorphAnimation (trinityCore) - generated from schema shapeHash 58cefc7b....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/mesh/Tr2SerializedMorphAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ShLightingManager -->
## `Tr2ShLightingManager`

Computes the spherical-harmonic coefficients that approximate secondary lighting - a primary light reflected off nearby spheres - for any receiver position in the scene.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/lighting/Tr2ShLightingManager.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SolidSet -->
## `Tr2SolidSet`

A set of coloured triangles with a running centre of mass, submitted as one buffer.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/Tr2SolidSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SwapChain -->
## `Tr2SwapChain`

Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/Tr2SwapChain.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TextureAnimation -->
## `Tr2TextureAnimation`

Advances a multi-channel texture flipbook, tracking frame and restart state per channel.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/Tr2TextureAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VariableStore -->
## `Tr2VariableStore`

Named-variable collection used by the shader system for binding.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/variable/Tr2VariableStore.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VisibilityEvent -->
## `Tr2VisibilityEvent`

Carbon's Tr2VisibilityEvent struct - the shared shape producers push into Tr2VisibilityResults and the interior/portal visibility consumers read.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/context/Tr2VisibilityResults.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VisibilityResults -->
## `Tr2VisibilityResults`

Collects the visibility events a visibility executor emits, for the interior and portal consumers to read back.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/context/Tr2VisibilityResults.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriDevice -->
## `TriDevice`

TriDevice (trinityCore) - generated from schema shapeHash 1db3a492....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/device/TriDevice.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFloat -->
## `TriFloat`

TriFloat (trinityCore) - generated from schema shapeHash b5384f79....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/variable/TriFloat.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFrustum -->
## `TriFrustum`

Carbon TriFrustum (TriFrustum.h:16-77): world-space frustum planes extracted from a composed view*projection matrix, plus the cached projection data used for on-screen pixel-coverage estimates.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriFrustum.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFrustumOrtho -->
## `TriFrustumOrtho`

Carbon TriFrustumOrtho (TriFrustumOrtho.h:9-27): orthographic shadow frustum as view matrix + view-space bounds.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriFrustumOrtho.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriLineSet -->
## `TriLineSet`

A debug line set that builds boxes, spheres, cylinders and cones out of coloured line segments.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/line/TriLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriObserverLocal -->
## `TriObserverLocal`

Holds an audio or placement observer at a fixed local position and facing inside an object, and republishes it in world space as the object moves.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/variable/TriObserverLocal.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriProjection -->
## `TriProjection`

The camera projection: the selected projection mode with its parameters, plus the 4x4 matrix built from them.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriProjection.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRect -->
## `TriRect`

An integer screen rectangle given by its left, top, right and bottom edges.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriRect.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAccumulator -->
## `TriRenderBatchAccumulator`

Concrete GPU-free batch accumulator: collects committed batches into a GDPR-eligible and a plain vector, then sorts and group-counts them on Finalize.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/TriRenderBatchAccumulator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchMap -->
## `TriRenderBatchMap`

One render-batch accumulator per TriBatchType, with the scene-level collect, finalize and clear flow over them.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/batch/TriRenderBatchMap.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRigidOrientation -->
## `TriRigidOrientation`

Integrates torque into an orientation over time, sampling the result at a given moment.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/TriRigidOrientation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriSettings -->
## `TriSettings`

A registry of named boolean, number and string settings with type-checked reads and writes and a Python-style repr.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/TriSettings.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriTorque -->
## `TriTorque`

TriTorque (trinityCore) - generated from schema shapeHash 10c5e0d6....

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/animation/TriTorque.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriVariable -->
## `TriVariable`

One named shader-binding variable: the content type fixed when it was registered, plus the value payload standing in for Carbon's typed union.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/variable/TriVariable.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriView -->
## `TriView`

The camera view matrix, together with the look-at helper that builds it.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriView.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriViewport -->
## `TriViewport`

A screen viewport rectangle in pixels together with its minimum and maximum depth.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/view/TriViewport.js
- Visibility: Public
- Kind: CarbonEngineJS
<!-- class:Tr2KelvinColor -->
## `Tr2KelvinColor`

A light colour authored as a temperature in kelvin, a tint, and a white-balance illuminant.

- Export: @carbonenginejs/runtime/trinity/core
- Source: src/trinity/core/lighting/Tr2KelvinColor.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TranslationTool -->
## `Tr2TranslationTool`

Extends the manipulation tool with the current three-axis translation result.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/tool/Tr2TranslationTool.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTrinityBatchDispatcher -->
## `CjsTrinityBatchDispatcher`

Minimum renderer contract for a finalized Trinity batch map.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/batch/CjsTrinityBatchDispatcher.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTrinityBatchResolver -->
## `CjsTrinityBatchResolver`

Nominal composition boundary that resolves Trinity CPU batch references for a concrete renderer.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/batch/CjsTrinityBatchResolver.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsDirectTrinityStepExecutor -->
## `CjsDirectTrinityStepExecutor`

Direct GPU-free executor used whenever no engine recorder is installed.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/context/CjsDirectTrinityStepExecutor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTrinityStepExecutor -->
## `CjsTrinityStepExecutor`

Nominal renderer contract driven by Trinity render contexts and jobs.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/context/CjsTrinityStepExecutor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2EffectLibraryParameters -->
## `Tr2EffectLibraryParameters`

Collects one effect library's local and global stage inputs, rerouted parameters, and resource-set state.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2EffectLibraryParameters.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectParam -->
## `Tr2EffectParam`

Maps a named effect value onto a contiguous shader-register span.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2EffectParam.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectPassParameters -->
## `Tr2EffectPassParameters`

Collects one effect pass's per-stage inputs, rerouted parameters, used resources, and resource-set state.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2EffectPassParameters.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectTechniqueInputs -->
## `Tr2EffectTechniqueInputs`

Groups the pass and library parameter records prepared for one effect technique.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2EffectTechniqueInputs.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MaterialStageInput -->
## `Tr2MaterialStageInput`

Organizes one shader stage's constants, parameters, textures, UAVs, and CPU-side constant mirror.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2MaterialStageInput.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SharedConstantBuffers -->
## `Tr2SharedConstantBuffers`

Tracks shared constant-buffer contents by size and hash together with its backing buffer and reference count.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/material/Tr2SharedConstantBuffers.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsParameter -->
## `CjsParameter`

Shared base for the shader parameter models: destination-reroute plumbing, effect-reflection lookups and Carbon's FNV1 content hashing.

- Source: `src/trinity/shader/parameter/CjsParameter.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsVectorParameter -->
## `CjsVectorParameter`

Base for the multi-component shader parameters, adding fixed-length destination reads and writes on top of CjsParameter.

- Source: `src/trinity/shader/parameter/CjsVectorParameter.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:Tr2ConstantEffectParameter -->
## `Tr2ConstantEffectParameter`

Stores one named persistent vec4 constant authored directly on an effect.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2ConstantEffectParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2FloatParameter -->
## `Tr2FloatParameter`

Single float value for a named shader constant, with optional rerouting into an external scalar destination.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2FloatParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GeometryBufferParameter -->
## `Tr2GeometryBufferParameter`

Carries a named shader-buffer path for host resolution or a caller-owned GPU buffer reference.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2GeometryBufferParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Matrix4Parameter -->
## `Tr2Matrix4Parameter`

4x4 matrix value for a named shader constant, with optional rerouting into an external 64-byte destination.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2Matrix4Parameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RuntimeTextureParameter -->
## `Tr2RuntimeTextureParameter`

A named texture slot fed by a runtime-supplied texture provider rather than an authored res path.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2RuntimeTextureParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureAnimationParameter -->
## `Tr2TextureAnimationParameter`

Exposes one named channel of a texture animation as a shader resource and invalidates attached materials as it changes.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2TextureAnimationParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Vector2Parameter -->
## `Tr2Vector2Parameter`

Two-component float value for a named shader constant, with sRGB gamma handling and optional rerouting into an external destination.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2Vector2Parameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Vector3Parameter -->
## `Tr2Vector3Parameter`

Three-component float value for a named shader constant, with sRGB gamma handling and optional rerouting into an external destination.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2Vector3Parameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Vector4Parameter -->
## `Tr2Vector4Parameter`

Four-component float value for a named shader constant, with sRGB gamma handling and optional rerouting into an external destination.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/Tr2Vector4Parameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriFloatArrayParameter -->
## `TriFloatArrayParameter`

An ordered list of vec4 rows uploaded into one named shader constant array.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/TriFloatArrayParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriTextureParameter -->
## `TriTextureParameter`

A named texture slot on an effect, owning the authored res path, the resolved texture provider and the UV-density scales that drive mip selection.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/TriTextureParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriTransformParameter -->
## `TriTransformParameter`

Composes authored translation, rotation, scale, and transform-base state into the matrix uploaded to a shader constant.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/TriTransformParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriVariableParameter -->
## `TriVariableParameter`

Forwards a named variable-store entry into a named effect constant or resource.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/TriVariableParameter.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriVector4 -->
## `TriVector4`

One vec4 row of a TriFloatArrayParameter's value list.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/parameter/TriVector4.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderOption -->
## `Tr2ShaderOption`

Mutable authored option on the Tr2Effect facade.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/reflection/Tr2ShaderOption.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerOverride -->
## `Tr2SamplerOverride`

Overrides one named sampler's address, filtering, LOD-bias, mip, and anisotropy settings.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/sampler/Tr2SamplerOverride.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerOverrideData -->
## `Tr2SamplerOverrideData`

Associates a shader sampler register with the sampler-state object to bind.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/sampler/Tr2SamplerOverrideData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DataTextureManager -->
## `Tr2DataTextureManager`

Packs shader-readable data blocks into a shared texture, whose allocation an engine adapter owns.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/Tr2DataTextureManager.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Effect -->
## `Tr2Effect`

Owns the mutable effect facade: shader path and options, authored parameters and resources, sampler overrides, variable-store resolution, and rebuild state.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/Tr2Effect.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectStateManager -->
## `Tr2EffectStateManager`

Tracks the portable render, stream, buffer, viewport, and override state used while applying an effect; the shader, shader-program and render-state registration tables its handle fields index are not implemented yet.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/Tr2EffectStateManager.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Material -->
## `Tr2Material`

Owns a resolved shader's per-technique pass and library bindings, resource invalidation, texture LOD forwarding, and draw-sort state.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/Tr2Material.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderBuffer -->
## `Tr2ShaderBuffer`

Owns a detached byte payload for one shader stage while leaving device binding to the engine.

- Export: `@carbonenginejs/runtime/trinity/shader`
- Source: `src/trinity/shader/Tr2ShaderBuffer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PresentParameters -->
## `Tr2PresentParameters`

Carries the software-device, back-buffer size, and windowed-mode values used when creating a rendering device.

- Export: `@carbonenginejs/runtime/trinity/ui`
- Source: `src/trinity/ui/Tr2PresentParameters.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BaseDeviceResourceAL -->
## `Tr2BaseDeviceResourceAL`

Base of every abstraction-layer resource, with the registry that makes live resources enumerable and releasable by memory class.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2DeviceResourceAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BitmapDimensions -->
## `Tr2BitmapDimensions`

Texture type, format, size and mip layout, with the mip arithmetic every create, map and copy is described in.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2BitmapDimensions.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MsaaDesc -->
## `Tr2MsaaDesc`

Multisample sample count and quality level.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2HalHelperStructures.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureCoordBox -->
## `Tr2TextureCoordBox`

A box within a texture, in pixels.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2HalHelperStructures.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureSubresource -->
## `Tr2TextureSubresource`

The range of faces, mip levels and pixels a map, update or copy applies to; unset means the whole resource.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2HalHelperStructures.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DepthAttachment -->
## `Tr2DepthAttachment`

What a render pass does with its depth attachment at both edges: the load action, the store action, and the depth a clear starts from.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2RenderPassAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ColorAttachment -->
## `Tr2ColorAttachment`

What a render pass does with one colour attachment at both edges: the load action, the store action, and the packed colour a clear starts from.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2RenderPassAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BufferDescriptionAL -->
## `Tr2BufferDescriptionAL`

How a buffer is laid out and what may touch it: format or stride, element count, and the GPU and CPU usage flags.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2BufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureALStub -->
## `Tr2TextureALStub`

GPU-free texture that enforces Carbon's creation rules and holds its pixels on the CPU.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2TextureALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BufferALStub -->
## `Tr2BufferALStub`

GPU-free vertex, index, structured or indirect-argument buffer whose bytes survive a map, a write and a second map.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2BufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ConstantBufferALStub -->
## `Tr2ConstantBufferALStub`

GPU-free constant buffer holding the shadow copy behind a constant register.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2ConstantBufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2CapsALStub -->
## `Tr2CapsALStub`

What the GPU-free backend reports it can do, which is deliberately not "nothing".

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2CapsALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SwapChainALStub -->
## `Tr2SwapChainALStub`

GPU-free swap chain owning one back buffer, whose presents complete immediately.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2SwapChainALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderALStub -->
## `Tr2ShaderALStub`

A compiled shader for one pipeline stage, keeping its own copy of the bytecode.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2ShaderALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderProgramALStub -->
## `Tr2ShaderProgramALStub`

A linked program that refuses a second shader for a stage it already has.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2ShaderProgramALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerStateALStub -->
## `Tr2SamplerStateALStub`

A created sampler state, holding the description it was created from.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2SamplerStateALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2VertexLayoutALStub -->
## `Tr2VertexLayoutALStub`

A vertex definition the backend has accepted, copied so a caller's later edit cannot reach it.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/al/Tr2VertexLayoutALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RenderContextALStub -->
## `Tr2RenderContextALStub`

GPU-free render context keeping real render-target and depth-stencil state, and a real back buffer, while drawing nothing.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/context/Tr2RenderContextALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RingBuffer -->
## `Tr2RingBuffer`

One upload arena per data type, fenced by frame, so many objects share one buffer and are handed an offset each.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/device/Tr2RingBuffer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RingBufferOffsets -->
## `Tr2RingBufferOffsets`

One consumer's cursor into a ring buffer, holding where its rows landed this frame and last.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/device/Tr2RingBuffer.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Renderer -->
## `Tr2Renderer`

Renderer-wide state: the constant-buffer register map that is the contract between Trinity and every backend.

- Export: `@carbonenginejs/runtime/trinity/core`
- Source: `src/trinity/core/Tr2Renderer.js`
- Visibility: Public
- Kind: Carbon
