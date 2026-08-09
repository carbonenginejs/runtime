# Trinity core classes

Status: Evolving
Scope: `@carbonenginejs/runtime-trinity/trinityCore`
Audience: Engine authors and integrators
Summary: Catalogs the GPU-free constant-data classes an engine binds when it realizes the Trinity graph.

<!-- class:RawData -->
## `RawData`

A packed constant-data slice bound to a resolved layout.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/rawData/RawData.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriPoolAllocator -->
## `TriPoolAllocator`

Registers constant-data struct shapes and leases packed payloads from a per-engine arena.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/rawData/TriPoolAllocator.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsFrameDriver -->
## `CjsFrameDriver`

Runs Carbon's backend-neutral frame body in order, against injected engine hooks.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/CjsFrameDriver.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VertexDefinition -->
## `Tr2VertexDefinition`

A mesh's vertex element list, and the matching of it to a shader's inputs.

- Export: `@carbonenginejs/runtime-trinity/trinityCore`
- Source: `src/trinityCore/Tr2VertexDefinition.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BindingVector3 -->
## `Tr2BindingVector3`

Tr2BindingVector3 (trinityCore) - generated from schema shapeHash a8ef1406....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/binding/Tr2BindingVector3.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DynamicBinding -->
## `Tr2DynamicBinding`

A value binding described by object paths: it resolves both endpoints against its owner's parameter map, builds a weak TriValueBinding and starts copying after a configured delay.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/binding/Tr2DynamicBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ExternalParameter -->
## `Tr2ExternalParameter`

A named handle onto one attribute - optionally one vector component - of another object, exposing it for type-checked reads and writes.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/binding/Tr2ExternalParameter.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PyValueBinding -->
## `Tr2PyValueBinding`

Tr2PyValueBinding (trinityCore) - generated from schema shapeHash 435f9fdc....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/binding/Tr2PyValueBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriValueBinding -->
## `TriValueBinding`

Copies one attribute of a source object onto an attribute of a destination object, applying a scale and per-component offset through a type-checked copy plan built when the endpoints resolve.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/binding/TriValueBinding.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsBatchManager -->
## `CjsBatchManager`

Owns the per-library render-batch producer and collector registry and drives the GPU-free per-frame flow of realize, build, finalize into one accumulator per batch type.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/CjsBatchManager.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:GrannyBoneOffset -->
## `GrannyBoneOffset`

Per-bone rotation and translation offsets layered on top of an animated rig, keyed by bone name until bound into the rig's joint order.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/GrannyBoneOffset.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:ITriRenderBatchAccumulator -->
## `ITriRenderBatchAccumulator`

Abstract base for render-batch accumulators: holds the shared rendering mode, user data and per-object-data store, and declares the collect and sort contract concrete accumulators implement.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/ITriRenderBatchAccumulator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerFrameLayouts -->
## `CjsPerFrameLayouts`

Resolved per-frame layouts, keyed by struct name.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/rawData/CjsPerFrameLayouts.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsPerObjectLayouts -->
## `CjsPerObjectLayouts`

Resolved per-object layouts, keyed by struct name.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/rawData/CjsPerObjectLayouts.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2BoundingLineSet -->
## `Tr2BoundingLineSet`

A line set that draws an axis-aligned bounding box and its picking volume.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2BoundingLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2CurveLineSet -->
## `Tr2CurveLineSet`

A line set that draws curved and sphere-projected lines by tessellating them into straight segments.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2CurveLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DebugRenderer -->
## `Tr2DebugRenderer`

Resolves which debug visualisations an object draws, from per-owner options over a default set.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2DebugRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DepthStencil -->
## `Tr2DepthStencil`

Tr2DepthStencil (trinityCore) - generated from schema shapeHash 9acb2c99....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2DepthStencil.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2DirectInstanceData -->
## `Tr2DirectInstanceData`

Instance data whose buffer lives entirely on the GPU: Trinity keeps only the CPU-side layout metadata, stride, instance count and bounds.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2DirectInstanceData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ExpressionTermInfo -->
## `Tr2ExpressionTermInfo`

Describes one term the expression language exposes - a variable, a function or a string function - with its category, argument names and help text.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2ExpressionTermInfo.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GpuBuffer -->
## `Tr2GpuBuffer`

Tr2GpuBuffer (trinityCore) - generated from schema shapeHash 7a225a45....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2GpuBuffer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2GrannyAnimation -->
## `Tr2GrannyAnimation`

Tr2GrannyAnimation (trinityCore) - promoted from generated; shapeHash 056bad2a.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2GrannyAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2InstancedMesh -->
## `Tr2InstancedMesh`

A mesh drawn once per entry of a separate instance-data stream, with static bounds or bounds expanded by the per-instance size.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2InstancedMesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2LineGraph -->
## `Tr2LineGraph`

A rolling sample history with named markers and running statistics, drawn as a line graph.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2LineGraph.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2LineSet -->
## `Tr2LineSet`

A set of coloured lines with an accompanying picking-triangle list, submitted as one buffer.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2LineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ManipulationTool -->
## `Tr2ManipulationTool`

The interactive manipulator base: axis selection, drag handling and the callback a move reports through.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2ManipulationTool.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MaterialParameterStore -->
## `Tr2MaterialParameterStore`

Tr2MaterialParameterStore (trinityCore) - generated from schema shapeHash 119f32c2....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2MaterialParameterStore.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2Mesh -->
## `Tr2Mesh`

A mesh backed by a geometry resource, adding the resource path plus the morph-target weights and baked-morph state on top of Tr2MeshBase.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2Mesh.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MeshArea -->
## `Tr2MeshArea`

One drawable range of a mesh: the index and count of geometry groups plus the effect, shadow, depth and LOD state that decide how the range is batched.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2MeshArea.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2MeshBase -->
## `Tr2MeshBase`

Base mesh: owns one mesh-area list per batch type and turns the displayed areas into GPU-free render batches and shadow area blocks.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2MeshBase.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PerObjectData -->
## `Tr2PerObjectData`

GPU-free base for per-object render data, carrying the object id a batch is picked and identified by; the GPU upload path is engine-owned.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2PerObjectData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PrimaryRenderContext -->
## `Tr2PrimaryRenderContext`

Tr2PrimaryRenderContext (trinityCore) - generated from schema shapeHash 92b87061....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2PrimaryRenderContext.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2PrimitiveSet -->
## `Tr2PrimitiveSet`

A drawable set of primitives with a world transform, sort value and bounding sphere.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2PrimitiveSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuadRenderer -->
## `Tr2QuadRenderer`

Collects quads from every registered effect into one merged instance buffer and emits them as batches.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2QuadRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2QuadRendererEffectRecord -->
## `Tr2QuadRendererEffectRecord`

One registered quad effect (Carbon Tr2QuadRenderer::EffectRecord).

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2QuadRenderer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderBatch -->
## `Tr2RenderBatch`

One draw's worth of CPU descriptor state - material and shader key, geometry binding, draw arguments and sort keys - holding no device resources.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAreaBlock -->
## `TriRenderBatchAreaBlock`

A contiguous (startIndex, count) run of mesh groups, as consumed by the shadow and overlay area-block paths.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAreaBlocksWithSharedMaterial -->
## `TriRenderBatchAreaBlocksWithSharedMaterial`

Groups the area blocks that draw with one shared shader material on the shadow and overlay path.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RenderBatch.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderContext -->
## `Tr2RenderContext`

Tr2RenderContext (trinityCore) - generated from schema shapeHash 73e2a4e7....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RenderContext.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RenderTarget -->
## `Tr2RenderTarget`

Tr2RenderTarget (trinityCore) - generated from schema shapeHash dc39c914....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RenderTarget.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RuntimeGpuBuffer -->
## `Tr2RuntimeGpuBuffer`

Tr2RuntimeGpuBuffer (trinityCore) - generated from schema shapeHash 0cb23744....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RuntimeGpuBuffer.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2RuntimeInstanceData -->
## `Tr2RuntimeInstanceData`

Owns a CPU-side instance stream - a vertex element layout, the packed per-instance rows and their bounding box - and can spawn the same rows into a particle system on demand.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2RuntimeInstanceData.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ScalingTool -->
## `Tr2ScalingTool`

An interactive scaling manipulator that turns pointer drags along a selected axis into a scale.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2ScalingTool.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SerializedMorphAnimation -->
## `Tr2SerializedMorphAnimation`

Tr2SerializedMorphAnimation (trinityCore) - generated from schema shapeHash 58cefc7b....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2SerializedMorphAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ShLightingManager -->
## `Tr2ShLightingManager`

Computes the spherical-harmonic coefficients that approximate secondary lighting - a primary light reflected off nearby spheres - for any receiver position in the scene.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2ShLightingManager.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SolidSet -->
## `Tr2SolidSet`

A set of coloured triangles with a running centre of mass, submitted as one buffer.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2SolidSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2SwapChain -->
## `Tr2SwapChain`

Tr2SwapChain (trinityCore) - generated from schema shapeHash 955529ab....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2SwapChain.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2TextureAnimation -->
## `Tr2TextureAnimation`

Advances a multi-channel texture flipbook, tracking frame and restart state per channel.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2TextureAnimation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VariableStore -->
## `Tr2VariableStore`

Named-variable collection used by the shader system for binding.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2VariableStore.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VisibilityEvent -->
## `Tr2VisibilityEvent`

Carbon's Tr2VisibilityEvent struct - the shared shape producers push into Tr2VisibilityResults and the interior/portal visibility consumers read.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2VisibilityResults.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2VisibilityResults -->
## `Tr2VisibilityResults`

Collects the visibility events a visibility executor emits, for the interior and portal consumers to read back.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/Tr2VisibilityResults.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriDevice -->
## `TriDevice`

TriDevice (trinityCore) - generated from schema shapeHash 1db3a492....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriDevice.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFloat -->
## `TriFloat`

TriFloat (trinityCore) - generated from schema shapeHash b5384f79....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriFloat.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFrustum -->
## `TriFrustum`

Carbon TriFrustum (TriFrustum.h:16-77): world-space frustum planes extracted from a composed view*projection matrix, plus the cached projection data used for on-screen pixel-coverage estimates.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriFrustum.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriFrustumOrtho -->
## `TriFrustumOrtho`

Carbon TriFrustumOrtho (TriFrustumOrtho.h:9-27): orthographic shadow frustum as view matrix + view-space bounds.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriFrustumOrtho.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriLineSet -->
## `TriLineSet`

A debug line set that builds boxes, spheres, cylinders and cones out of coloured line segments.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriLineSet.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriObserverLocal -->
## `TriObserverLocal`

Holds an audio or placement observer at a fixed local position and facing inside an object, and republishes it in world space as the object moves.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriObserverLocal.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriProjection -->
## `TriProjection`

The camera projection: the selected projection mode with its parameters, plus the 4x4 matrix built from them.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriProjection.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRect -->
## `TriRect`

An integer screen rectangle given by its left, top, right and bottom edges.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriRect.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchAccumulator -->
## `TriRenderBatchAccumulator`

Concrete GPU-free batch accumulator: collects committed batches into a GDPR-eligible and a plain vector, then sorts and group-counts them on Finalize.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriRenderBatchAccumulator.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRenderBatchMap -->
## `TriRenderBatchMap`

One render-batch accumulator per TriBatchType, with the scene-level collect, finalize and clear flow over them.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriRenderBatchMap.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriRigidOrientation -->
## `TriRigidOrientation`

Integrates torque into an orientation over time, sampling the result at a given moment.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriRigidOrientation.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriSettings -->
## `TriSettings`

A registry of named boolean, number and string settings with type-checked reads and writes and a Python-style repr.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriSettings.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriTorque -->
## `TriTorque`

TriTorque (trinityCore) - generated from schema shapeHash 10c5e0d6....

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriTorque.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriVariable -->
## `TriVariable`

One named shader-binding variable: the content type fixed when it was registered, plus the value payload standing in for Carbon's typed union.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriVariable.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriView -->
## `TriView`

The camera view matrix, together with the look-at helper that builds it.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriView.js
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:TriViewport -->
## `TriViewport`

A screen viewport rectangle in pixels together with its minimum and maximum depth.

- Export: @carbonenginejs/runtime-trinity/trinityCore
- Source: src/trinityCore/TriViewport.js
- Visibility: Public
- Kind: CarbonEngineJS
