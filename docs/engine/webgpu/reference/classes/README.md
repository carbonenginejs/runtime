# Class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/engine/webgpu` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the WebGPU engine package.

<!-- class:CjsWebgpuRenderContextAL -->
## `CjsWebgpuRenderContextAL`

WebGPU behind Carbon's abstraction layer: holds the bound geometry and program state, validates it, and delegates the draw to a work queue.

- Export: Not exported
- Source: `src/engine/webgpu/CjsWebgpuRenderContextAL.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuWorkQueue -->
## `CjsWebgpuWorkQueue`

Owns the encoder lifetime for one frame, opening a render pass lazily on the work that needs one and folding the declared pass hint into its attachments.

- Export: Not exported
- Source: `src/engine/webgpu/core/workQueue.js`
- Visibility: Internal
- Kind: Carbon

<!-- class:CjsWebgpuPackage -->
## `CjsWebgpuPackage`

Immutable descriptor-only consumer for `Carbon WebGPU` package data.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuPackage.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuDevice -->
## `CjsWebgpuDevice`

Engine-owned WebGPU device boundary.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuDevice.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBackendCandidate -->
## `CjsWebgpuBackendCandidate`

WebGPU participant in runtime backend selection.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuBackendCandidate.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipeline -->
## `CjsWebgpuPipeline`

Immutable WebGPU-facing pass/pipeline descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuPipeline.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuShaderModule -->
## `CjsWebgpuShaderModule`

Immutable WebGPU-facing shader-module descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuShaderModule.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBindGroup -->
## `CjsWebgpuBindGroup`

Immutable WebGPU-facing bind-group descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuBindGroup.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuResource -->
## `CjsWebgpuResource`

Immutable WebGPU-facing binding/resource descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuResource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBuffer -->
## `CjsWebgpuBuffer`

Immutable WebGPU-facing buffer binding descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuBuffer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTexture -->
## `CjsWebgpuTexture`

Immutable WebGPU-facing texture binding descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuTexture.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSampler -->
## `CjsWebgpuSampler`

Immutable WebGPU-facing sampler binding descriptor.

- Export: `@carbonenginejs/runtime/engine/webgpu`
- Source: `src/engine/webgpu/CjsWebgpuSampler.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuEncodeState -->
## `CjsWebgpuEncodeState`

Per-render-pass record of bound pipeline and buffers, so a grouped run's later batches skip redundant sets.

- Export: Not exported
- Source: `src/engine/webgpu/core/batchGroups.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipelineCache -->
## `CjsWebgpuPipelineCache`

Generation-bound cache of asynchronously built pipeline objects, keyed exactly rather than by hash.

- Export: Not exported
- Source: `src/engine/webgpu/core/pipelineCache.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuFrameExecutor -->
## `CjsWebgpuFrameExecutor`

Drives one command encoder over a planned frame's regions in order and submits once.

- Export: Not exported
- Source: `src/engine/webgpu/core/frameExecutor.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuRenderTarget -->
## `CjsWebgpuRenderTarget`

Owns the presentation surface, depth and multisample attachments, pass descriptors, viewport and scissor.

- Export: Not exported
- Source: `src/engine/webgpu/core/renderTarget.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchDispatcher -->
## `CjsWebgpuTrinityBatchDispatcher`

Engine-side adapter for canonical Trinity render batches.

- Export: Not exported
- Source: `src/engine/webgpu/core/trinityBatchDispatcher.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityStepRecorder -->
## `CjsWebgpuTrinityStepRecorder`

Internal synchronous recorder for the nominal Trinity step-executor contract.

- Export: Not exported
- Source: `src/engine/webgpu/core/trinityStepRecorder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityPassEncoder -->
## `CjsWebgpuTrinityPassEncoder`

Internal encoder for caller-owned WebGPU pass plans over prepared Trinity batch maps.

- Export: Not exported
- Source: `src/engine/webgpu/core/trinityPassEncoder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchResolver -->
## `CjsWebgpuTrinityBatchResolver`

Resolves a Trinity batch to a WebGPU pipeline, device geometry and the bindings the pipeline declares.

- Export: Not exported
- Source: `src/engine/webgpu/core/trinityBatchResolver.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTextureSource -->
## `CjsWebgpuTextureSource`

Realizes an authored texture path into a device texture, once per resource.

- Export: Not exported
- Source: `src/engine/webgpu/core/textureSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSamplerSource -->
## `CjsWebgpuSamplerSource`

Creates and shares device samplers, keyed on authored sampler state rather than on a binding name.

- Export: Not exported
- Source: `src/engine/webgpu/core/samplerSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPerFrameSource -->
## `CjsWebgpuPerFrameSource`

Supplies the packed per-frame constant bytes for a frame slot, which the scene owns rather than the batch.

- Export: Not exported
- Source: `src/engine/webgpu/core/perFrameSource.js`
- Visibility: Internal
- Kind: CarbonEngineJS
