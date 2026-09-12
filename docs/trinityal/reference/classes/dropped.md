# Dropped abstraction-layer class catalog

Status: Evolving
Scope: `@carbonenginejs/runtime/trinityal` classes under `src/trinityal/dropped`
Audience: Backend authors, maintainers, and automated readers
Summary: Provides one-sentence purpose descriptors for abstraction-layer donor classes that are written but deliberately not live, each carrying the reason, plus one that records an unported gap.

Every class here comes from a backend Carbon compiles instead of ours. That is
not on its own a reason to ignore one: `MetalWorkQueue` is the declared model
for `CjsWebgpuWorkQueue`, and of the seven below, five describe behaviour this
package already ports under different names. They are written so the
correspondence is checkable rather than assumed.

<!-- class:ConstantBufferToken -->
## `ConstantBufferToken`

Retained-only reference shape mirroring Carbon's atomic constant-arena token, superseded by the plain `m_token` field `CjsWebgpuConstantBufferAL` carries, because uploads here happen on one thread.

- Export: None
- Source: `src/trinityal/dropped/ConstantBufferToken.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:MetalBlendState -->
## `MetalBlendState`

Retained-only reference shape mirroring Carbon's hashable Metal blend record, superseded by the pipeline recipe `Tr2RenderStateSetup.GetWebgpuRecipe` projects, because WebGPU folds blending into the render pipeline and has no per-state setter.

- Export: None
- Source: `src/trinityal/dropped/MetalBlendState.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:MetalClearState -->
## `MetalClearState`

Retained-only reference shape mirroring Carbon's per-pass load, store and clear state, superseded by the equivalent fields WebGPU carries on each render-pass attachment.

- Export: None
- Source: `src/trinityal/dropped/MetalClearState.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:MetalColor -->
## `MetalColor`

Retained-only reference shape mirroring Carbon's plain RGBA aggregate for Metal clear and blend colours, superseded by `vec4`, which already is one.

- Export: None
- Source: `src/trinityal/dropped/MetalColor.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:MetalDepthBias -->
## `MetalDepthBias`

Carbon's three depth-bias floats, which map one-to-one onto WebGPU's `depthBias`, `depthBiasSlopeScale` and `depthBiasClamp`; recorded as an UNPORTED GAP rather than a drop, because no path projects them and shadow work on that backend needs one.

- Export: None
- Source: `src/trinityal/dropped/MetalDepthBias.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:MetalRenderPassHint -->
## `MetalRenderPassHint`

Carbon's deferred render-pass attachment record, whose behaviour this package ports on `CjsWebgpuWorkQueue` and `CjsWebgpuRenderContextAL` while flattening the struct into loose colour and depth arguments to match WebGPU's own descriptor.

- Export: None
- Source: `src/trinityal/dropped/MetalRenderPassHint.js`
- Visibility: Internal
- Kind: Faithful Carbon port

<!-- class:ShaderResourceMask -->
## `ShaderResourceMask`

Retained-only reference shape mirroring Carbon's per-stage bind masks, superseded by the stage bindings `CjsWebgpuShaderAL` carries, because WebGPU resolves binding validity when a bind group layout is created rather than per draw.

- Export: None
- Source: `src/trinityal/dropped/ShaderResourceMask.js`
- Visibility: Internal
- Kind: Faithful Carbon port
