# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal/webgpu` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the WebGPU engine package.

<!-- class:CjsWebgpuRenderContextAL -->
## `CjsWebgpuRenderContextAL`

WebGPU behind Carbon's abstraction layer: holds the bound geometry and program state, validates it, and delegates the draw to a work queue.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuRenderContextAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuWorkQueue -->
## `CjsWebgpuWorkQueue`

Owns the encoder lifetime for one frame, opening a render pass lazily on the work that needs one and folding the declared pass hint into its attachments.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/workQueue.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuPackage -->
## `CjsWebgpuPackage`

Immutable descriptor-only consumer for `Carbon WebGPU` package data.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuPackage.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuDevice -->
## `CjsWebgpuDevice`

Engine-owned WebGPU device boundary.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuDevice.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBackendCandidate -->
## `CjsWebgpuBackendCandidate`

WebGPU participant in runtime backend selection.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBackendCandidate.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipeline -->
## `CjsWebgpuPipeline`

Immutable WebGPU-facing pass/pipeline descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuPipeline.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuShaderModule -->
## `CjsWebgpuShaderModule`

Immutable WebGPU-facing shader-module descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuShaderModule.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBindGroup -->
## `CjsWebgpuBindGroup`

Immutable WebGPU-facing bind-group descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBindGroup.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuResource -->
## `CjsWebgpuResource`

Immutable WebGPU-facing binding/resource descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuResource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBuffer -->
## `CjsWebgpuBuffer`

Immutable WebGPU-facing buffer binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuBuffer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTexture -->
## `CjsWebgpuTexture`

Immutable WebGPU-facing texture binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuTexture.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSampler -->
## `CjsWebgpuSampler`

Immutable WebGPU-facing sampler binding descriptor.

- Export: `@carbonenginejs/runtime/trinityal/webgpu`
- Source: `src/trinityal/webgpu/CjsWebgpuSampler.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuEncodeState -->
## `CjsWebgpuEncodeState`

Per-render-pass record of bound pipeline and buffers, so a grouped run's later batches skip redundant sets.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/batchGroups.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipelineCache -->
## `CjsWebgpuPipelineCache`

Generation-bound cache of asynchronously built pipeline objects, keyed exactly rather than by hash.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/pipelineCache.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuRenderTarget -->
## `CjsWebgpuRenderTarget`

Owns the presentation surface, depth and multisample attachments, pass descriptors, viewport and scissor.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/renderTarget.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchDispatcher -->
## `CjsWebgpuTrinityBatchDispatcher`

Engine-side adapter for canonical Trinity render batches.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/trinityBatchDispatcher.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityPassEncoder -->
## `CjsWebgpuTrinityPassEncoder`

Internal encoder for caller-owned WebGPU pass plans over prepared Trinity batch maps.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/trinityPassEncoder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchResolver -->
## `CjsWebgpuTrinityBatchResolver`

Resolves a Trinity batch to a WebGPU pipeline, device geometry and the bindings the pipeline declares.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/trinityBatchResolver.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTextureSource -->
## `CjsWebgpuTextureSource`

Realizes an authored texture path into a device texture, once per resource.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/textureSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSamplerSource -->
## `CjsWebgpuSamplerSource`

Creates and shares device samplers, keyed on authored sampler state rather than on a binding name.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/samplerSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPerFrameSource -->
## `CjsWebgpuPerFrameSource`

Supplies the packed per-frame constant bytes for a frame slot, which the scene owns rather than the batch.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/perFrameSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBufferAL -->
## `CjsWebgpuBufferAL`

A `Tr2BufferAL` backed by a real `GPUBuffer`, writing through a retained CPU shadow that is uploaded whole on unmap.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuBufferAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuCapsAL -->
## `CjsWebgpuCapsAL`

The capabilities this backend reports, answering Carbon's caps questions from WebGPU's guaranteed baseline and, for `shader-f16` alone, from the composed device.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuCapsAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuShaderAL -->
## `CjsWebgpuShaderAL`

A `Tr2ShaderAL` that compiles its bytecode, which here is WGSL text, into a `GPUShaderModule` and keeps the source for the pipeline and for error reporting.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuShaderAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuShaderProgramAL -->
## `CjsWebgpuShaderProgramAL`

A `Tr2ShaderProgramAL` holding validated stages and answering for their modules, since WebGPU has no link step.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuShaderAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuPsoDescription -->
## `CjsWebgpuPsoDescription`

DX12's `PSODescription` for WebGPU: the pipeline state the abstraction layer's setters describe incrementally, resolved to one cached pipeline by a canonical key.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/psoDescription.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuConstantBufferAL -->
## `CjsWebgpuConstantBufferAL`

A `Tr2ConstantBufferAL` that owns a CPU shadow and an upload token, as Metal's does: a Lock invalidates the token and the draw copies the shadow into the frame's constant arena and binds the region by page and dynamic offset.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuConstantBufferAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuConstantArena -->
## `CjsWebgpuConstantArena`

Carbon's `ConstantBufferAllocator`: the per-frame constant arena of 2 MiB pages, reset at the start of every frame, that gives each draw its own snapshot of every constant buffer bound for it.

- Export: Not exported
- Source: `src/trinityal/webgpu/core/constantArena.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuSamplerStateAL -->
## `CjsWebgpuSamplerStateAL`

A `Tr2SamplerStateAL` holding a `GPUSampler`, created once per distinct description through the context's factory and keeping the authored description beside the device object.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuSamplerStateAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuResourceSetAL -->
## `CjsWebgpuResourceSetAL`

A `Tr2ResourceSetAL` that resolves the description's textures, samplers and storage buffers against the program's bindings at creation, with dummies for what the description leaves empty, for the draw to assemble into bind groups.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuResourceSetAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuTextureAL -->
## `CjsWebgpuTextureAL`

A `Tr2TextureAL` holding a `GPUTexture` created with all its subresources, with linear and sRGB views per dimension on request.

- Export: Not exported
- Source: `src/trinityal/webgpu/CjsWebgpuTextureAL.js`
- Visibility: Internal
- Kind: Carbon
