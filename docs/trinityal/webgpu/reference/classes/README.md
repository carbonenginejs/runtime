# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal/webgpu` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the WebGPU engine package.

<!-- class:CjsWebgpuBackendCandidate -->
## `CjsWebgpuBackendCandidate`

WebGPU participant in runtime backend selection.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBackendCandidate.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBindGroup -->
## `CjsWebgpuBindGroup`

Immutable WebGPU-facing bind-group descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBindGroup.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBuffer -->
## `CjsWebgpuBuffer`

Immutable WebGPU-facing buffer binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBuffer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBufferAL -->
## `CjsWebgpuBufferAL`

A `Tr2BufferAL` backed by a real `GPUBuffer`.

- Source: `src/trinityal/webgpu/CjsWebgpuBufferAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuCapsAL -->
## `CjsWebgpuCapsAL`

The capabilities the WebGPU backend reports.

- Source: `src/trinityal/webgpu/CjsWebgpuCapsAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuConstantBufferAL -->
## `CjsWebgpuConstantBufferAL`

A `Tr2ConstantBufferAL` whose contents live in a CPU shadow copy, suballocated into the frame's constant arena when they are bound.

- Source: `src/trinityal/webgpu/CjsWebgpuConstantBufferAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuDevice -->
## `CjsWebgpuDevice`

Engine-owned WebGPU device boundary.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuDevice.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPackage -->
## `CjsWebgpuPackage`

Immutable descriptor-only consumer for `Carbon WebGPU` package data.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuPackage.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipeline -->
## `CjsWebgpuPipeline`

Immutable WebGPU-facing pass/pipeline descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuPipeline.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuRenderContextAL -->
## `CjsWebgpuRenderContextAL`

WebGPU behind the abstraction layer, holding a work queue as Metal does.

- Source: `src/trinityal/webgpu/CjsWebgpuRenderContextAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuResource -->
## `CjsWebgpuResource`

Immutable WebGPU-facing binding/resource descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuResource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuResourceSetAL -->
## `CjsWebgpuResourceSetAL`

A `Tr2ResourceSetAL` holding the resolved bindings a draw's bind groups are assembled from.

- Source: `src/trinityal/webgpu/CjsWebgpuResourceSetAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuSampler -->
## `CjsWebgpuSampler`

Immutable WebGPU-facing sampler binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuSampler.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSamplerStateAL -->
## `CjsWebgpuSamplerStateAL`

A `Tr2SamplerStateAL` backed by a `GPUSampler` created from Carbon's authored sampler description.

- Source: `src/trinityal/webgpu/CjsWebgpuSamplerStateAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuShaderAL -->
## `CjsWebgpuShaderAL`

A `Tr2ShaderAL` holding a real `GPUShaderModule`.

- Source: `src/trinityal/webgpu/CjsWebgpuShaderAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuShaderModule -->
## `CjsWebgpuShaderModule`

Immutable WebGPU-facing shader-module descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuShaderModule.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuShaderProgramAL -->
## `CjsWebgpuShaderProgramAL`

A `Tr2ShaderProgramAL` linking compiled stages.

- Source: `src/trinityal/webgpu/CjsWebgpuShaderProgramAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuTexture -->
## `CjsWebgpuTexture`

Immutable WebGPU-facing texture binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuTexture.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTextureAL -->
## `CjsWebgpuTextureAL`

A `Tr2TextureAL` backed by a WebGPU `GPUTexture`, created with all of its data.

- Source: `src/trinityal/webgpu/CjsWebgpuTextureAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuConstantArena -->
## `CjsWebgpuConstantArena`

A per-frame arena of `GPUBuffer` pages that constant buffers are suballocated into when they are bound.

- Source: `src/trinityal/webgpu/core/CjsWebgpuConstantArena.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuEncodeState -->
## `CjsWebgpuEncodeState`

A per-pass record of what is already bound, so a run's second and later batches skip the sets their first batch performed.

- Source: `src/trinityal/webgpu/core/CjsWebgpuEncodeState.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuMipGenerator -->
## `CjsWebgpuMipGenerator`

Renders a texture's mip chain on a command encoder, one level from the one above.

- Source: `src/trinityal/webgpu/core/CjsWebgpuMipGenerator.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPerFrameSource -->
## `CjsWebgpuPerFrameSource`

Supplies the per-frame constant registers from one scene.

- Source: `src/trinityal/webgpu/core/CjsWebgpuPerFrameSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipelineCache -->
## `CjsWebgpuPipelineCache`

A generation-bound cache of asynchronously built pipeline objects.

- Source: `src/trinityal/webgpu/core/CjsWebgpuPipelineCache.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPsoDescription -->
## `CjsWebgpuPsoDescription`

A pipeline description, filled by the abstraction layer's setters.

- Source: `src/trinityal/webgpu/core/CjsWebgpuPsoDescription.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuRenderTarget -->
## `CjsWebgpuRenderTarget`

Owns a WebGPU presentation surface and its per-frame attachments.

- Source: `src/trinityal/webgpu/core/CjsWebgpuRenderTarget.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSamplerSource -->
## `CjsWebgpuSamplerSource`

Resolves an effect's declared samplers against one device.

- Source: `src/trinityal/webgpu/core/CjsWebgpuSamplerSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchDispatcher -->
## `CjsWebgpuTrinityBatchDispatcher`

Engine-side adapter for canonical Trinity render batches.

- Source: `src/trinityal/webgpu/core/CjsWebgpuTrinityBatchDispatcher.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchResolver -->
## `CjsWebgpuTrinityBatchResolver`

Resolves Trinity batches against one WebGPU device.

- Source: `src/trinityal/webgpu/core/CjsWebgpuTrinityBatchResolver.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityPassEncoder -->
## `CjsWebgpuTrinityPassEncoder`

Internal encoder for caller-owned WebGPU render-pass plans over prepared Trinity batch maps.

- Source: `src/trinityal/webgpu/core/CjsWebgpuTrinityPassEncoder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuUtils -->
## `CjsWebgpuUtils`

The WebGPU backend's counterpart of Metal's `MetalUtils`.

- Source: `src/trinityal/webgpu/core/CjsWebgpuUtils.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuWorkQueue -->
## `CjsWebgpuWorkQueue`

Owns the encoder lifetime for one frame, as Carbon's `MetalWorkQueue` does.

- Source: `src/trinityal/webgpu/core/CjsWebgpuWorkQueue.js`
- Visibility: Internal
- Kind: Carbon
