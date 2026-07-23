# Resources class catalog

Status: Evolving  
Scope: `@carbonenginejs/runtime-resource` classes under `src/resources`  
Audience: Users, maintainers, and automated readers  
Summary: Provides one-sentence purpose descriptors for the Carbon-shaped semantic resource and data classes in src/resources.

<!-- class:AudioGeometryResData -->
## `AudioGeometryResData`

Data record mirroring Carbon's per-mesh audio-geometry block: an id plus the vertices, indices, and min/max bounds consumed by audio occlusion.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/AudioGeometryResData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:GStateBindingCallbackData -->
## `GStateBindingCallbackData`

Data record mirroring Carbon's GState binding callback payload, holding the `gsf_path` string that identifies the Granny state file to bind.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/GStateBindingCallbackData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:MeshDecalData -->
## `MeshDecalData`

Data record mirroring Carbon's per-mesh decal block: an index-buffer allocation reference, a LOD mask, and the per-LOD decal ranges.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/MeshDecalData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:MeshDecalLodData -->
## `MeshDecalLodData`

Data record mirroring Carbon's per-LOD decal range, holding the start index and primitive count for one decal LOD.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/MeshDecalLodData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2EffectRes -->
## `Tr2EffectRes`

Resource record that owns effect/shader payload facts, including the permutation description, while engine packages decide shader-module, pipeline, bind-group, and sampler realization.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2EffectRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2GrannyIntersectionResult -->
## `Tr2GrannyIntersectionResult`

Data record mirroring Carbon's Granny intersection-query result: hit position, normal, UV, bone index, and mesh/area indices with per-field presence flags.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2GrannyIntersectionResult.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2GrannyStateRes -->
## `Tr2GrannyStateRes`

Resource that holds a plain GState payload, which may carry additive skeleton/state data without models, and validates that skeleton data or additive animations are present.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2GrannyStateRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2ImageRes -->
## `Tr2ImageRes`

Resource record that holds a validated canonical RGBA image payload and mirrors its width/height metadata, leaving any device texture realization to engine packages.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2ImageRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2LightProfileRes -->
## `Tr2LightProfileRes`

Resource that holds a plain light-profile payload, which may be richer than the data retained by the resource or the active engine adapter.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2LightProfileRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2MaterialArea -->
## `Tr2MaterialArea`

Persisted data record mirroring Carbon's material-area node, pairing a material parameter-store reference with a metatype string.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2MaterialArea.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2MaterialMesh -->
## `Tr2MaterialMesh`

Persisted data record mirroring Carbon's material-mesh node, holding the dictionary of material areas for one mesh.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2MaterialMesh.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2MaterialRes -->
## `Tr2MaterialRes`

Persisted data record mirroring Carbon's material resource root, holding a name and the dictionary of material meshes.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2MaterialRes.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2ShaderPermutation -->
## `Tr2ShaderPermutation`

Data record mirroring Carbon's shader-permutation description: name, option list, default option, description text, and permutation type.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2ShaderPermutation.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TextureLodManager -->
## `Tr2TextureLodManager`

CPU-side registry of texture resources participating in LOD management that owns deterministic membership and Carbon-shaped memory counters, while device allocation and budget policy stay in engine packages.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TextureLodManager.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2TextureLodUpdateRequest -->
## `Tr2TextureLodUpdateRequest`

Data record mirroring Carbon's texture-LOD update request: the frame number, requested mip change, and RAM-cache flag.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TextureLodUpdateRequest.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePackChannel -->
## `Tr2TexturePackChannel`

Persisted data record mirroring Carbon's pack-step channel selection: the source channel index, fill value, and source texture path for one output channel.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePackChannel.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipeline -->
## `Tr2TexturePipeline`

Persisted CPU bitmap-transformation pipeline that executes its ordered steps asynchronously to produce a canonical plain RGBA payload and reports the resource paths its load and pack steps depend on.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipeline.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:Tr2TexturePipelineParams -->
## `Tr2TexturePipelineParams`

Data record mirroring Carbon's texture-pipeline execution parameters, holding the maximum output width and height.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineParams.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipelineStepCompress -->
## `Tr2TexturePipelineStepCompress`

Persisted pipeline-step record mirroring Carbon's compress step, naming the target pixel format and per-channel error weights.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineStepCompress.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipelineStepGenerateMips -->
## `Tr2TexturePipelineStepGenerateMips`

Attribute-free persisted marker step mirroring Carbon's mip-generation step; the mip generation itself happens where the pipeline executes.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineStepGenerateMips.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipelineStepLimitSize -->
## `Tr2TexturePipelineStepLimitSize`

Persisted pipeline-step record mirroring Carbon's size-limit step, holding the maximum width and height the bitmap may keep.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineStepLimitSize.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipelineStepLoad -->
## `Tr2TexturePipelineStepLoad`

Persisted pipeline-step record mirroring Carbon's load step, holding the source texture path the pipeline reads.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineStepLoad.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:Tr2TexturePipelineStepPack -->
## `Tr2TexturePipelineStepPack`

Persisted pipeline-step record mirroring Carbon's pack step, naming the target pixel format and the four per-channel pack sources.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/Tr2TexturePipelineStepPack.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGeometryRes -->
## `TriGeometryRes`

Resource record that owns geometry payload facts (meshes, optional skeletons and animations) and LOD-force metadata, while engine packages decide device buffers, vertex declarations, and draw-time state.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:TriGeometryResAreaData -->
## `TriGeometryResAreaData`

Data record mirroring Carbon's geometry area block: a named draw range with bounds, joint bindings, skinning/morph flags, and ray-tracing structure references.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryResAreaData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGeometryResJointData -->
## `TriGeometryResJointData`

Data record mirroring Carbon's geometry joint entry: a joint name, parent-joint index, and inverse world transform.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryResJointData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGeometryResLodData -->
## `TriGeometryResLodData`

Data record mirroring Carbon's per-LOD geometry block: mesh reference, naming and screen-size selection data, vertex/primitive counts, UV densities, areas, and buffer-allocation references.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryResLodData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGeometryResMeshData -->
## `TriGeometryResMeshData`

Data record mirroring Carbon's per-mesh geometry block: name, vertex layout facts, bounds, joint bindings, audio geometry, decals, and the LOD list.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryResMeshData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGeometryResSkeletonData -->
## `TriGeometryResSkeletonData`

Data record mirroring Carbon's geometry skeleton block, pairing a skeleton name with its joint list.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGeometryResSkeletonData.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriGrannyRes -->
## `TriGrannyRes`

Resource that owns lifecycle identity for decoded Granny data attached as a plain payload with models or meshes, keeping reader and engine-specific behavior outside the class.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriGrannyRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept

<!-- class:TriJointBinding -->
## `TriJointBinding`

Data record mirroring Carbon's joint binding: a joint name with its oriented-bounding-box minimum and maximum.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriJointBinding.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriMorphTargetGeometryConstants -->
## `TriMorphTargetGeometryConstants`

Data record mirroring Carbon's morph-target geometry constants: vertex-buffer stride, position/tangent offsets and types, and vertex count.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriMorphTargetGeometryConstants.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriRtGeometryConstants -->
## `TriRtGeometryConstants`

Data record mirroring Carbon's ray-tracing geometry constants: index/vertex buffer ids and strides plus attribute offsets and types.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriRtGeometryConstants.js`
- Visibility: Public
- Kind: Faithful Carbon port

<!-- class:TriTextureRes -->
## `TriTextureRes`

Resource record that owns Carbon-style texture identity and validated texture, RGBA, or video payload facts with mirrored dimension/format metadata, while engine packages decide what those facts become on a device.

- Export: `@carbonenginejs/runtime-resource`
- Source: `src/resources/TriTextureRes.js`
- Visibility: Public
- Kind: Adapted Carbon concept
