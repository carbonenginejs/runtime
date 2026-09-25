# Dropped abstraction-layer class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal` classes under `src/trinityal/dropped`
Audience: Backend authors, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for abstraction-layer donor classes that are written but deliberately not live, each carrying the reason and, where the behaviour is ported under another name, where it went.

Every class here comes from a backend Carbon compiles instead of ours. That is
not on its own a reason to ignore one: `MetalWorkQueue` is the declared model
for `CjsWebgpuWorkQueue`, and of the eight below, six describe behaviour this
package already ports under different names. They are written so the
correspondence is checkable rather than assumed.

<!-- class:ConstantBufferToken -->
## `ConstantBufferToken`

Carbon's atomic constant-arena token; dropped because the port carries it as a plain field on the constant buffer.

- Source: `src/trinityal/dropped/ConstantBufferToken.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalBlendState -->
## `MetalBlendState`

Carbon's hashable Metal blend record; dropped because WebGPU folds blending into the render pipeline.

- Source: `src/trinityal/dropped/MetalBlendState.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalClearState -->
## `MetalClearState`

Carbon's per-pass load/store/clear state; dropped because WebGPU carries the same fields on each attachment.

- Source: `src/trinityal/dropped/MetalClearState.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalColor -->
## `MetalColor`

Carbon's plain RGBA aggregate for Metal clear and blend colours; dropped because vec4 already is one.

- Source: `src/trinityal/dropped/MetalColor.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalDepthBias -->
## `MetalDepthBias`

Carbon's Metal depth-bias triple; dropped because the authored render states already carry these values through Tr2RenderStateSetup into the pipeline.

- Source: `src/trinityal/dropped/MetalDepthBias.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalRenderPassHint -->
## `MetalRenderPassHint`

Carbon's deferred render-pass attachment record; ported as flattened colors/depth arguments rather than a struct.

- Source: `src/trinityal/dropped/MetalRenderPassHint.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:MetalWorkQueue -->
## `MetalWorkQueue`

Carbon's Metal command recorder; its encoder-lifetime half is ported as CjsWebgpuWorkQueue and the rest is distributed across the WebGPU backend.

- Source: `src/trinityal/dropped/MetalWorkQueue.js`
- Visibility: Internal
- Kind: Carbon dropped

<!-- class:ShaderResourceMask -->
## `ShaderResourceMask`

Carbon's per-stage bind masks; dropped because WebGPU resolves binding validity in the bind group layout.

- Source: `src/trinityal/dropped/ShaderResourceMask.js`
- Visibility: Internal
- Kind: Carbon dropped
