# Trinity abstraction-layer classes

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal`, `@carbonenginejs/runtime/trinityal/stub`
Audience: Backend authors realizing a Trinity graph on a device
Summary: Catalogs the device-facing descriptions and the GPU-free stub backend that Carbon's abstraction layer defines, which a concrete backend implements.

<!-- class:Tr2BufferALStub -->
## `Tr2BufferALStub`

A buffer that holds its bytes on the CPU.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2BufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2CapsALStub -->
## `Tr2CapsALStub`

The capabilities the stub backend reports.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2CapsALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ConstantBufferALStub -->
## `Tr2ConstantBufferALStub`

A constant buffer holding its shadow copy on the CPU.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ConstantBufferALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2FenceALStub -->
## `Tr2FenceALStub`

A fence the backend has accepted.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2FenceALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2GpuTimerALStub -->
## `Tr2GpuTimerALStub`

Times a bracketed span of GPU work.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2GpuTimerALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2OcclusionQueryALStub -->
## `Tr2OcclusionQueryALStub`

Counts the pixels a bracketed draw passed.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2OcclusionQueryALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2PipelineStatsQueryALStub -->
## `Tr2PipelineStatsQueryALStub`

Collects pipeline statistics over a bracketed span.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2PipelineStatsQueryALStub/Tr2PipelineStatsQueryALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BindlessResourcesAL -->
## `Tr2BindlessResourcesAL`

Carbon's `Tr2BindlessResourcesAL` (`Tr2RenderContextStub.h:32-47`).

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2RenderContextALStub/Tr2BindlessResourcesAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RenderContextALStub -->
## `Tr2RenderContextALStub`

A render context that keeps real state and draws nothing.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2RenderContextALStub/Tr2RenderContextALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerStateALStub -->
## `Tr2SamplerStateALStub`

A sampler state the backend has accepted.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2SamplerStateALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderALStub -->
## `Tr2ShaderALStub`

A compiled shader for one pipeline stage.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ShaderALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ShaderProgramALStub -->
## `Tr2ShaderProgramALStub`

A linked program over one shader per stage.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2ShaderProgramALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SwapChainALStub -->
## `Tr2SwapChainALStub`

A swap chain whose presents complete immediately.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2SwapChainALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2TextureALStub -->
## `Tr2TextureALStub`

A texture that validates like a real one and holds its pixels on the CPU.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2TextureALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2VertexLayoutALStub -->
## `Tr2VertexLayoutALStub`

An accepted vertex definition.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2VertexLayoutALStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2VideoAdapterInfoStub -->
## `Tr2VideoAdapterInfoStub`

Adapter and display-mode enumeration.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/stub/Tr2VideoAdapterInfoStub.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BufferDescriptionAL -->
## `Tr2BufferDescriptionAL`

How a buffer is laid out and what may touch it.

- Export: `@carbonenginejs/runtime/trinityal/stub`
- Source: `src/trinityal/Tr2BufferAL/Tr2BufferDescriptionAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2BaseDeviceResourceAL -->
## `Tr2BaseDeviceResourceAL`

The base of every AL resource.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2DeviceResourceAL/Tr2BaseDeviceResourceAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DeviceResourceAL -->
## `Tr2DeviceResourceAL`

Forwards the resource registry interface to concrete backend resource methods.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2DeviceResourceAL/Tr2DeviceResourceAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DrawUPHelper -->
## `Tr2DrawUPHelper`

Emulates the user-pointer draws with scratch buffers.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2DrawUPHelper.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2MsaaDesc -->
## `Tr2MsaaDesc`

A multisample description.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2MsaaDesc.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SamplerDescription -->
## `Tr2SamplerDescription`

The authored sampler state a `Tr2SamplerStateAL` is created from, and the key its factory dedupes on.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2SamplerDescription.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2SubresourceData -->
## `Tr2SubresourceData`

One mip of one layer: where its pixels are, and how they are laid out.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js`
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

A range of faces, mip levels and pixels within a texture.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2TextureSubresource.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2Viewport -->
## `Tr2Viewport`

The viewport a render context draws through.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2HalHelperStructures/Tr2Viewport.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ColorAttachment -->
## `Tr2ColorAttachment`

How a pass treats one colour attachment.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2RenderPassAL/Tr2ColorAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2DepthAttachment -->
## `Tr2DepthAttachment`

How a pass treats its depth attachment.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2RenderPassAL/Tr2DepthAttachment.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2RegisterMapAL -->
## `Tr2RegisterMapAL`

Stage/register to dense resource index, with counts spanning all stages.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2RegisterMapAL.js`
- Visibility: Public
- Kind: Carbon

<!-- class:Tr2ResourceSetAL -->
## `Tr2ResourceSetAL`

Public handle; implementation selection belongs to the creating context.

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

<!-- class:Tr2ResourceSetDescriptionAL -->
## `Tr2ResourceSetDescriptionAL`

A program's mapped resources.

- Export: `@carbonenginejs/runtime/trinityal`
- Source: `src/trinityal/Tr2ResourceSetAL/Tr2ResourceSetDescriptionAL.js`
- Visibility: Public
- Kind: Carbon
