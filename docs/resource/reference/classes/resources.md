# Resources class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime/resource` classes under `src/resource`
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the Carbon-shaped semantic resource and data classes in the src/resource family tree.

<!-- class:AudioGeometryResData -->
## `AudioGeometryResData`

Data record mirroring Carbon's per-mesh audio-geometry block: an id plus the vertices, indices, and min/max bounds consumed by audio occlusion.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/audio/AudioGeometryResData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:GStateBindingCallbackData -->
## `GStateBindingCallbackData`

Data record mirroring Carbon's GState binding callback payload, holding the `gsf_path` string that identifies the Granny state file to bind.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/granny/GStateBindingCallbackData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GrannyIntersectionResult -->
## `Tr2GrannyIntersectionResult`

Data record mirroring Carbon's Granny intersection-query result: hit position, normal, UV, bone index, and mesh/area indices with per-field presence flags.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/granny/Tr2GrannyIntersectionResult.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GrannyStateRes -->
## `Tr2GrannyStateRes`

Runtime-owned GState resource.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/granny/Tr2GrannyStateRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGrannyRes -->
## `TriGrannyRes`

Runtime-owned Granny resource.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/granny/TriGrannyRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:MeshDecalData -->
## `MeshDecalData`

Data record mirroring Carbon's per-mesh decal block: an index-buffer allocation reference, a LOD mask, and the per-LOD decal ranges.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/MeshDecalData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:MeshDecalLodData -->
## `MeshDecalLodData`

Data record mirroring Carbon's per-LOD decal range, holding the start index and primitive count for one decal LOD.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/MeshDecalLodData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RaycastGeometryRes -->
## `Tr2RaycastGeometryRes`

CPU raycast session resource borrowed from a resident TriGeometryRes.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/Tr2RaycastGeometryRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryRes -->
## `TriGeometryRes`

Resource record that owns geometry payload facts (meshes, optional skeletons and animations) and LOD-force metadata.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryResAreaData -->
## `TriGeometryResAreaData`

Data record mirroring Carbon's geometry area block: a named draw range with bounds, joint bindings, skinning/morph flags, and ray-tracing structure references.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryResAreaData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryResJointData -->
## `TriGeometryResJointData`

Data record mirroring Carbon's geometry joint entry: a joint name, parent-joint index, and inverse world transform.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryResJointData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryResLodData -->
## `TriGeometryResLodData`

Data record mirroring Carbon's per-LOD geometry block: mesh reference, naming and screen-size selection data, vertex/primitive counts, UV densities, areas, and buffer-allocation references.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryResLodData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryResMeshData -->
## `TriGeometryResMeshData`

Data record mirroring Carbon's per-mesh geometry block: name, vertex layout facts, bounds, joint bindings, audio geometry, decals, and the LOD list.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryResMeshData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriGeometryResSkeletonData -->
## `TriGeometryResSkeletonData`

Data record mirroring Carbon's geometry skeleton block, pairing a skeleton name with its joint list.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriGeometryResSkeletonData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriJointBinding -->
## `TriJointBinding`

Data record mirroring Carbon's joint binding: a joint name with its oriented-bounding-box minimum and maximum.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriJointBinding.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriMorphTargetGeometryConstants -->
## `TriMorphTargetGeometryConstants`

Data record mirroring Carbon's morph-target geometry constants: vertex-buffer stride, position/tangent offsets and types, and vertex count.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriMorphTargetGeometryConstants.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriRtGeometryConstants -->
## `TriRtGeometryConstants`

Data record mirroring Carbon's ray-tracing geometry constants: index/vertex buffer ids and strides plus attribute offsets and types.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/geometry/TriRtGeometryConstants.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectConstant -->
## `Tr2EffectConstant`

Reflected shader constant metadata.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectConstant.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectDefine -->
## `Tr2EffectDefine`

Effect compile define retained as source metadata.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectDefine.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectDescription -->
## `Tr2EffectDescription`

Complete device-free effect description for one selected shader body.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectDescription.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectLibrary -->
## `Tr2EffectLibrary`

Reflected shader-library metadata.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectLibrary.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectParameterAnnotation -->
## `Tr2EffectParameterAnnotation`

Typed annotation attached to a reflected effect parameter.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectParameterAnnotation.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectResource -->
## `Tr2EffectResource`

Reflected SRV or UAV resource metadata.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectResource.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectStageInput -->
## `Tr2EffectStageInput`

Complete device-free reflection for one shader stage input.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectStageInput.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectTechnique -->
## `Tr2EffectTechnique`

Reflected effect technique and its passes and libraries.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2EffectTechnique.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Pass -->
## `Tr2Pass`

Reflected effect pass; Carbon's interned program and state handles are kept as authored data.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2Pass.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RenderStateSetup -->
## `Tr2RenderStateSetup`

One pass's registered set of render states, interpreted.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/reflection/Tr2RenderStateSetup.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerSetup -->
## `Tr2SamplerSetup`

Reflected sampler name and complete device-free sampler descriptor.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/sampler/Tr2SamplerSetup.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2EffectRes -->
## `Tr2EffectRes`

Tr2EffectRes resource record.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/shader/Tr2EffectRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MaterialArea -->
## `Tr2MaterialArea`

Associates one material-area metatype with its persisted parameter store.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/shader/Tr2MaterialArea.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MaterialMesh -->
## `Tr2MaterialMesh`

Holds the persisted material-area dictionary for one material mesh.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/shader/Tr2MaterialMesh.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MaterialRes -->
## `Tr2MaterialRes`

Root persisted material record containing its authored name and material mesh dictionary.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/shader/Tr2MaterialRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Shader -->
## `Tr2Shader`

GPU-free selected shader and its complete source reflection graph.

- Export: `@carbonenginejs/runtime/resource/shader`
- Source: `src/resource/shader/Tr2Shader.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderPermutation -->
## `Tr2ShaderPermutation`

Describes one authored effect permutation and the option values a shader resolver may select.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/shader/Tr2ShaderPermutation.js`
- Visibility: Public
- Kind: Carbon

<!-- class:CjsTextureArrayConstructor -->
## `CjsTextureArrayConstructor`

`dynamic:/texturearray/<path>;<path>...` - separate images as the layers of one 2D texture array, layer 0 first.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTextureArrayConstructor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTexturePackConstructor -->
## `CjsTexturePackConstructor`

`dynamic:/texturepack/<source>;<source>...` - up to four channels packed from separate images into one texture.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTexturePackConstructor.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTexturePipelineStepArray -->
## `CjsTexturePipelineStepArray`

Stacks the named inputs, in order, into one 2D texture array: layer 0 is the first path.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTexturePipelineStepArray.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTexturePipelineStepConvert -->
## `CjsTexturePipelineStepConvert`

Converts the pipeline's INPUTS to one pixel format before a later step reads them - block formats decoded - so a `Pack` over EVE's compressed maps works.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTexturePipelineStepConvert.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTexturePipelineStepPack -->
## `CjsTexturePipelineStepPack`

Our packer: Carbon's `Tr2TexturePipelineStepPack`, plus output formats Carbon's does not write.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTexturePipelineStepPack.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsTexturePipelineStepResize -->
## `CjsTexturePipelineStepResize`

Resamples the pipeline's INPUTS to one size before a later step reads them.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/CjsTexturePipelineStepResize.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:Tr2ImageRes -->
## `Tr2ImageRes`

Tr2ImageRes resource record.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2ImageRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureLodManager -->
## `Tr2TextureLodManager`

CPU-side registry for texture resources participating in LOD management.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TextureLodManager.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureLodUpdateRequest -->
## `Tr2TextureLodUpdateRequest`

Data record mirroring Carbon's texture-LOD update request: the frame number, requested mip change, and RAM-cache flag.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TextureLodUpdateRequest.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePackChannel -->
## `Tr2TexturePackChannel`

Persisted data record mirroring Carbon's pack-step channel selection: the source channel index, fill value, and source texture path for one output channel.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePackChannel.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipeline -->
## `Tr2TexturePipeline`

Carbon texture-specific CPU bitmap transformation pipeline.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipeline.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineParams -->
## `Tr2TexturePipelineParams`

Data record mirroring Carbon's texture-pipeline execution parameters, holding the maximum output width and height.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineParams.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineStepCompress -->
## `Tr2TexturePipelineStepCompress`

Persisted pipeline-step record mirroring Carbon's compress step, naming the target pixel format and per-channel error weights.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineStepCompress.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineStepGenerateMips -->
## `Tr2TexturePipelineStepGenerateMips`

Attribute-free persisted Blue marker step mirroring Carbon's mip-generation step; the mip generation itself happens where the pipeline executes.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineStepGenerateMips.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineStepLimitSize -->
## `Tr2TexturePipelineStepLimitSize`

Persisted pipeline-step record mirroring Carbon's size-limit step, holding the maximum width and height the bitmap may keep.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineStepLimitSize.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineStepLoad -->
## `Tr2TexturePipelineStepLoad`

Persisted pipeline-step record mirroring Carbon's load step, holding the source texture path the pipeline reads.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineStepLoad.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TexturePipelineStepPack -->
## `Tr2TexturePipelineStepPack`

Persisted pipeline-step record mirroring Carbon's pack step, naming the target pixel format and the four per-channel pack sources.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/Tr2TexturePipelineStepPack.js`
- Visibility: Public
- Kind: Carbon

<!-- class:TriTextureRes -->
## `TriTextureRes`

Resource record that owns Carbon-style texture identity and validated texture, RGBA, or video payload facts with mirrored dimension/format metadata, while engine packages decide what those facts become on a device.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/texture/TriTextureRes.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2LightProfileRes -->
## `Tr2LightProfileRes`

Runtime-owned light-profile resource.

- Export: `@carbonenginejs/runtime/resource`
- Source: `src/resource/Tr2LightProfileRes.js`
- Visibility: Public
- Kind: Carbon
