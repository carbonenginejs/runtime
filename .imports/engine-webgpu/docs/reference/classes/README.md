# Class catalog

Status: Evolving
Scope: `@carbonenginejs/engine-webgpu` maintained classes
Audience: Users, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for every maintained class in the WebGPU engine package.

<!-- class:CjsWebgpuPackage -->
## `CjsWebgpuPackage`

Immutable descriptor-only consumer for `Carbon WebGPU` package data.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuPackage.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuDevice -->
## `CjsWebgpuDevice`

Engine-owned WebGPU device boundary.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuDevice.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipeline -->
## `CjsWebgpuPipeline`

Immutable WebGPU-facing pass/pipeline descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuPipeline.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuShaderModule -->
## `CjsWebgpuShaderModule`

Immutable WebGPU-facing shader-module descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuShaderModule.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBindGroup -->
## `CjsWebgpuBindGroup`

Immutable WebGPU-facing bind-group descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuBindGroup.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuResource -->
## `CjsWebgpuResource`

Immutable WebGPU-facing binding/resource descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuResource.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuBuffer -->
## `CjsWebgpuBuffer`

Immutable WebGPU-facing buffer binding descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuBuffer.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTexture -->
## `CjsWebgpuTexture`

Immutable WebGPU-facing texture binding descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuTexture.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuSampler -->
## `CjsWebgpuSampler`

Immutable WebGPU-facing sampler binding descriptor.

- Export: `@carbonenginejs/engine-webgpu`
- Source: `src/CjsWebgpuSampler.js`
- Visibility: Public
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuEncodeState -->
## `CjsWebgpuEncodeState`

Per-render-pass record of bound pipeline and buffers, so a grouped run's later batches skip redundant sets.

- Export: Not exported
- Source: `src/core/batchGroups.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuPipelineCache -->
## `CjsWebgpuPipelineCache`

Generation-bound cache of asynchronously built pipeline objects, keyed exactly rather than by hash.

- Export: Not exported
- Source: `src/core/pipelineCache.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuFrameExecutor -->
## `CjsWebgpuFrameExecutor`

Drives one command encoder over a planned frame's regions in order and submits once.

- Export: Not exported
- Source: `src/core/frameExecutor.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuRenderTarget -->
## `CjsWebgpuRenderTarget`

Owns the presentation surface, depth and multisample attachments, pass descriptors, viewport and scissor.

- Export: Not exported
- Source: `src/core/renderTarget.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityBatchDispatcher -->
## `CjsWebgpuTrinityBatchDispatcher`

Internal conformance adapter from duck-typed Trinity batch maps to WebGPU draws.

- Export: Not exported
- Source: `src/core/trinityBatchDispatcher.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityStepRecorder -->
## `CjsWebgpuTrinityStepRecorder`

Internal ordered recorder for duck-typed Trinity render-step intents.

- Export: Not exported
- Source: `src/core/trinityStepRecorder.js`
- Visibility: Internal
- Kind: CarbonEngineJS

<!-- class:CjsWebgpuTrinityPassEncoder -->
## `CjsWebgpuTrinityPassEncoder`

Internal encoder for caller-owned WebGPU pass plans over prepared Trinity batch maps.

- Export: Not exported
- Source: `src/core/trinityPassEncoder.js`
- Visibility: Internal
- Kind: CarbonEngineJS
