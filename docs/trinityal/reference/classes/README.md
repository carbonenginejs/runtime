# Trinity abstraction-layer classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal`, `@carbonenginejs/runtime/trinityal/stub`
Audience: Backend authors realizing a Trinity graph on a device
Summary: Catalogs the device-facing descriptions and the GPU-free stub backend that Carbon's abstraction layer defines, which a concrete backend implements.

<!-- class:Tr2BaseDeviceResourceAL -->
## `Tr2BaseDeviceResourceAL`

Base of every abstraction-layer resource, with the registry that makes live resources enumerable and releasable by memory class.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2DeviceResourceAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BitmapDimensions -->
## `Tr2BitmapDimensions`

Texture type, format, size and mip layout, with the mip arithmetic every create, map and copy is described in.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2BitmapDimensions.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DrawUPHelper -->
## `Tr2DrawUPHelper`

Emulates the user-pointer draws every backend delegates to it, staging a caller's vertices and indices into a ring of scratch buffers and issuing an ordinary draw.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2DrawUPHelper.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MsaaDesc -->
## `Tr2MsaaDesc`

Multisample sample count and quality level.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SubresourceData -->
## `Tr2SubresourceData`

One mip of one layer: where its pixels are, and how they are laid out.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Viewport -->
## `Tr2Viewport`

The viewport a render context draws through.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2Viewport.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerDescription -->
## `Tr2SamplerDescription`

The authored sampler state a `Tr2SamplerStateAL` is created from, and the key its factory dedupes on.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2SamplerDescription.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureCoordBox -->
## `Tr2TextureCoordBox`

A box within a texture, in pixels.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2TextureCoordBox.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureSubresource -->
## `Tr2TextureSubresource`

The range of faces, mip levels and pixels a map, update or copy applies to; unset means the whole resource.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RegisterMapAL -->
## `Tr2RegisterMapAL`

Stage/register to dense resource index, with counts spanning all stages.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2RegisterMapAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ResourceSetDescriptionAL -->
## `Tr2ResourceSetDescriptionAL`

A program's mapped resources. Constant buffers bind separately through SetConstants.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2ResourceSetDescriptionAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ResourceSetAL -->
## `Tr2ResourceSetAL`

Public handle; implementation selection belongs to the creating context. The creating context selects the implementation; copied handles and context bindings retain shared ownership. Backend release follows garbage collection or explicit device-resource teardown.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2ResourceSetAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ResourceSetALStub -->
## `Tr2ResourceSetALStub`

A resource set the backend has accepted.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2ResourceSetALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2FenceALStub -->
## `Tr2FenceALStub`

GPU-free fence that tracks whether a marker is outstanding, answering as a device that finishes instantly and refusing a doubled marker or an unpaired wait.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2FenceALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2OcclusionQueryALStub -->
## `Tr2OcclusionQueryALStub`

GPU-free occlusion query that reports zero passing pixels and catches a mispaired Begin and End.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2QueryALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GpuTimerALStub -->
## `Tr2GpuTimerALStub`

GPU-free timer reporting Carbon's tiny fixed span, and minus one when no timer exists so a caller can tell that from no elapsed time.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2QueryALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PipelineStatsQueryALStub -->
## `Tr2PipelineStatsQueryALStub`

GPU-free pipeline-statistics query that always succeeds and reports an empty statistics set.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2QueryALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2VideoAdapterInfoStub -->
## `Tr2VideoAdapterInfoStub`

Adapter and display-mode enumeration answering with Carbon's single fictional adapter, whose available mode deliberately differs from its current mode.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2VideoAdapterInfoALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DepthAttachment -->
## `Tr2DepthAttachment`

How a pass treats its depth attachment.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2RenderPassAL/Tr2DepthAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ColorAttachment -->
## `Tr2ColorAttachment`

How a pass treats one colour attachment.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2RenderPassAL/Tr2ColorAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BufferDescriptionAL -->
## `Tr2BufferDescriptionAL`

How a buffer is laid out and what may touch it: format or stride, element count, and the GPU and CPU usage flags.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2BufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureALStub -->
## `Tr2TextureALStub`

GPU-free texture that enforces Carbon's creation rules and holds its pixels on the CPU.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2TextureALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BufferALStub -->
## `Tr2BufferALStub`

GPU-free vertex, index, structured or indirect-argument buffer whose bytes survive a map, a write and a second map.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2BufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ConstantBufferALStub -->
## `Tr2ConstantBufferALStub`

GPU-free constant buffer holding the shadow copy behind a constant register.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ConstantBufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2CapsALStub -->
## `Tr2CapsALStub`

What the GPU-free backend reports it can do, which is deliberately not "nothing".

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2CapsALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SwapChainALStub -->
## `Tr2SwapChainALStub`

GPU-free swap chain owning one back buffer, whose presents complete immediately.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2SwapChainALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderALStub -->
## `Tr2ShaderALStub`

A compiled shader for one pipeline stage, keeping its own copy of the bytecode.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ShaderALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderProgramALStub -->
## `Tr2ShaderProgramALStub`

A linked program that refuses a second shader for a stage it already has.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ShaderProgramALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerStateALStub -->
## `Tr2SamplerStateALStub`

A created sampler state, holding the description it was created from.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2SamplerStateALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2VertexLayoutALStub -->
## `Tr2VertexLayoutALStub`

A vertex definition the backend has accepted, copied so a caller's later edit cannot reach it.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2VertexLayoutALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BindlessResourcesAL -->
## `Tr2BindlessResourcesAL`

A list of resources handed to `UseResources` so a backend can make them resident together. Every member is empty in the stub, as in Carbon: residency is a device concern.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2RenderContextALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RenderContextALStub -->
## `Tr2RenderContextALStub`

GPU-free render context keeping real render-target and depth-stencil state, and a real back buffer, while drawing nothing.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2RenderContextALStub.js`
- Visibility: Public
- Kind: Carbon
