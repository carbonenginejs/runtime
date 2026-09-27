// Source: trinity/trinityal/dx11/Tr2RenderContextDx11.h
// Source: trinity/trinityal/dx11/Tr2RenderContextDx11.cpp
// Source: trinity/trinityal/dx11/Tr2PrimaryRenderContextDx11.h
// Source: trinity/trinityal/dx11/Tr2PrimaryRenderContextDx11.cpp
//
// The WebGL2 render context: dx11's `Tr2RenderContextAL` and
// `Tr2PrimaryRenderContextAL` as one class, answering the interface the stub
// context defines (`stub/Tr2RenderContextALStub`), which the contract lint
// holds every backend to. Where that interface departs from Carbon's signatures
// - booleans for most verbs, a `Tr2RenderStateSetup` for render states, an
// options record for `Clear` - it is the stub's departure, argued there.
//
// THE BACK BUFFER IS A TEXTURE. dx11 attaches a `Tr2TextureAL` to the swap
// chain's buffer (`Tr2PrimaryRenderContextDx11.cpp:510-552`) and binds it with
// any depth buffer. WebGL2's own drawing buffer cannot share a framebuffer with
// a texture depth buffer, so the back buffer here is an ordinary render-target
// texture, created by `SetPresentParameters` as the stub creates its own, and
// `Present` copies it to the canvas.
//
// EVERY TARGET IS STORED TOP-DOWN, AS D3D STORES IT. The GLSL emitter's
// `clipYFlip` profile negates clip-space Y when its `ssyf` uniform says so, so
// row 0 of every render target is the top row, as in D3D. Viewports and
// scissor rectangles therefore carry D3D's coordinates unchanged, and the one
// flip happens in `Present`'s copy to the canvas, whose row 0 is the bottom.
//
// ONE FRAMEBUFFER. dx11 binds render-target and depth-stencil views
// (`SetRtDsToDevice`, `Tr2RenderContextDx11.cpp:1322-1423`); WebGL2 attaches
// the same subresources to one framebuffer object, re-attached when a binding
// changes.
//
// ONE CLASS FOR TWO. dx11's `Tr2PrimaryRenderContextAL` derives from
// `Tr2RenderContextAL` and adds the device, the back buffer, `Present`, caps,
// frame numbers and upscaling. The stub merges them, and the contract lint
// holds every backend to the stub's class, so this merges them too; the
// primary context's donor-coverage finding is recorded for that reason.
//
// BOUND AT THE DRAW. dx11 binds a program, a constant buffer or a resource
// set on the device as it is set. A WebGL2 uniform, texture unit and vertex
// attribute belong to the bound program, so the setters record and each draw
// applies them after dx11's own state application (`ApplyShadowRenderStates`).
//
// KNOWN GAPS: sRGB writes (`RS_SRGBWRITEENABLE`) change nothing, since a
// target renders in its own format; wireframe and point fill refuse the draw;
// indirect draws and compute refuse; the coverage-discard mode is kept but no
// shader reads it yet.

import { CjsSchema, impl } from "#schema";
import { CompareFunc, CullMode, FillMode, HasFlag, PixelFormat, RenderState, ShaderType, Topology, Tr2GpuUsage, UpscalingResult, UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import { float32FromBits } from "#utils/bytes";
import { ALResult, Failed } from "../ALResult.js";
import { Tr2DrawUPHelper } from "../Tr2DrawUPHelper.js";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { Tr2ResourceSetAL } from "../Tr2ResourceSetAL/Tr2ResourceSetAL.js";
import { Tr2ConstantUsageAL } from "../stub/Tr2ConstantBufferALStub.js";
import { SamplerDescriptionKey } from "../Tr2HalHelperStructures/Tr2SamplerDescription.js";
import { Tr2BufferALWebgl2 } from "./Tr2BufferALWebgl2.js";
import { Tr2CapsALWebgl2 } from "./Tr2CapsALWebgl2.js";
import { Tr2ConstantBufferALWebgl2 } from "./Tr2ConstantBufferALWebgl2.js";
import { Tr2FenceALWebgl2 } from "./Tr2FenceALWebgl2.js";
import { Tr2ResourceSetALWebgl2 } from "./Tr2ResourceSetALWebgl2.js";
import { Tr2SamplerStateALWebgl2 } from "./Tr2SamplerStateALWebgl2.js";
import { Tr2ShaderALWebgl2 } from "./Tr2ShaderALWebgl2.js";
import { Tr2ShaderProgramALWebgl2 } from "./Tr2ShaderProgramALWebgl2.js";
import { Tr2TextureALWebgl2 } from "./Tr2TextureALWebgl2.js";
import { Tr2VertexLayoutALWebgl2 } from "./Tr2VertexLayoutALWebgl2.js";

/** dx11's `MAX_RENDER_TARGET` (`Tr2RenderContextDx11.h:294`). */
const MAX_RENDER_TARGET = 8;

/** `D3D11_CULL_MODE` and `D3D11_FILL_MODE` values the emulated rasterizer holds. */
const CULL_NONE = 1;
const CULL_FRONT = 2;
const CULL_BACK = 3;
const FILL_SOLID = 3;

/** dx11's default blend description (`Tr2RenderContextDx11.cpp:42-51`), as D3D11 values. */
const DEFAULT_BLEND = Object.freeze({
  blendEnable: false, srcBlend: 2, destBlend: 1, blendOp: 1,
  srcBlendAlpha: 2, destBlendAlpha: 1, blendOpAlpha: 1, writeMask: 0xf, separateAlpha: false
});

/** dx11's default depth-stencil description (`:53-69`). */
const DEFAULT_DEPTH_STENCIL = Object.freeze({
  depthEnable: true, depthWrite: true, depthFunc: CompareFunc.CMP_LESS, stencilEnable: false,
  stencilMask: 0xff, stencilRef: 0, stencilFail: 1, stencilDepthFail: 1, stencilPass: 1, stencilFunc: CompareFunc.CMP_ALWAYS
});

/** dx11's default rasterizer description (`:71-82`). */
const DEFAULT_RASTERIZER = Object.freeze({
  fillMode: FILL_SOLID, cullMode: CULL_BACK, depthBias: 0, slopeScaledDepthBias: 0, depthClipEnable: true
});

/** Carbon's `SetInvertedDepthTest` table (`Tr2EffectStateManager.cpp:834-850`), by `ZFUNC` value. */
const INVERTED_DEPTH_TEST = Object.freeze([
  0, CompareFunc.CMP_NEVER, CompareFunc.CMP_GREATER, CompareFunc.CMP_EQUAL, CompareFunc.CMP_GREATEREQUAL,
  CompareFunc.CMP_LESS, CompareFunc.CMP_NOTEQUAL, CompareFunc.CMP_LESSEQUAL, CompareFunc.CMP_ALWAYS
]);

/** Carbon's `SetInvertedCullMode` table (`:815-826`), by `CULLMODE` value. */
const INVERTED_CULL_MODE = Object.freeze([ 0, CullMode.CULLMODE_NONE, CullMode.CULLMODE_CCW, CullMode.CULLMODE_CW ]);

/** Carbon's `SetWireframeRendering` table (`:800-812`), by `FILLMODE` value. */
const WIREFRAME_FILL_MODE = Object.freeze([ 0, FillMode.FM_POINT, FillMode.FM_WIREFRAME, FillMode.FM_WIREFRAME ]);

/**
 * dx11's alpha factor for a colour factor when separate alpha blending is off
 * (`Tr2RenderStateEmulationDx11.cpp` `GetBlendState`), indexed by D3D11_BLEND
 * value and copied as it is. BUG, reproduced (CE-48 in the Carbon known-defects
 * docket): the table is two entries short of D3D11's numbering from
 * `BLEND_FACTOR` (14) on, so 14 and 15 remap to the second-source alphas
 * rather than to themselves, and 18 and 19 read past its end. The past-the-end
 * reads are undefined behaviour and cannot be reproduced; here they come back
 * undefined, which `ApplyBlendState` refuses.
 */
const ALPHA_BLEND_REMAP = Object.freeze([ 1, 1, 2, 5, 6, 5, 6, 7, 8, 7, 8, 11, 14, 15, 18, 19, 18, 19 ]);

/** dx11's `CB_SLOT_COUNT` (`Tr2RenderContextDx11.h:276`): constant-buffer registers per stage. */
const CB_SLOT_COUNT = 16;

/** The GLSL emitter's clip-space flip uniform (`clipYFlip`, `DxbcGlslEmitter.js`). */
const CLIP_Y_FLIP_UNIFORM = "ssyf";

/** Whether the first `size` bytes of two arrays match. */
function BytesEqual(a, b, size)
{
  for (let i = 0; i < size; i++) if (a[i] !== b[i]) return false;
  return true;
}

/** `floats` floats read from `bytes`, the first `available` of them present, the rest zero. */
function PaddedFloats(bytes, available, floats)
{
  const out = new Float32Array(floats);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  for (let i = 0; i < available; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

/** A `D3D11_COMPARISON_FUNC` as WebGL2's. */
function ComparisonOf(gl, value)
{
  return [ gl.NEVER, gl.NEVER, gl.LESS, gl.EQUAL, gl.LEQUAL, gl.GREATER, gl.NOTEQUAL, gl.GEQUAL, gl.ALWAYS ][value] ?? gl.ALWAYS;
}

/** A `D3D11_BLEND_OP` as WebGL2's, or null for none. */
function BlendOperationOf(gl, value)
{
  return [ null, gl.FUNC_ADD, gl.FUNC_SUBTRACT, gl.FUNC_REVERSE_SUBTRACT, gl.MIN, gl.MAX ][value] ?? null;
}

/** A `D3D11_STENCIL_OP` as WebGL2's. */
function StencilOperationOf(gl, value)
{
  return [ gl.KEEP, gl.KEEP, gl.ZERO, gl.REPLACE, gl.INCR, gl.DECR, gl.INVERT, gl.INCR_WRAP, gl.DECR_WRAP ][value] ?? gl.KEEP;
}

/**
 * The process-wide primary render context, as the stub and the WebGPU
 * context keep it: a module-level binding reached through the three statics.
 */
let primaryRenderContext = null;


/**
 * A packed ARGB clear colour as four floats, in dx11's order
 * (`Tr2RenderContextDx11.cpp:1285-1292`). A four-float colour is taken as
 * r, g, b, a, as the WebGPU context takes it.
 */
function ClearColor(value)
{
  if (typeof value === "number")
  {
    const f = 1 / 255;
    return [ f * ((value >>> 16) & 0xff), f * ((value >>> 8) & 0xff), f * (value & 0xff), f * ((value >>> 24) & 0xff) ];
  }

  if (value && value.length >= 4) return [ value[0], value[1], value[2], value[3] ];

  return [ 0, 0, 0, 0 ];
}


/**
 * A render context on a WebGL2 device.
 */
export class Tr2RenderContextALWebgl2
{
  /**
   * The shader stages this backend runs, a bit per stage: `SHADER_TYPE_MASK`.
   * Vertex and pixel only, until compute is lowered to fragment passes.
   */
  static SHADER_TYPE_MASK = (1 << 0) | (1 << 1);

  /** The WebGL2 context. */
  _gl = null;

  /** Whether `CreateDevice` succeeded. */
  _isValid = false;

  /** m_caps */
  _caps = null;

  /** m_defaultBackBuffer; see the head comment. */
  _defaultBackBuffer = new Tr2TextureALWebgl2();

  /** m_presentParameters, kept under Carbon's misspelt accessor. */
  _presentParameters = null;

  /** m_boundRenderTarget[MAX_RENDER_TARGET]: `{ texture, slice }`. */
  _boundRenderTargets = Array.from({ length: MAX_RENDER_TARGET }, () => ({ texture: null, slice: 0 }));

  /** m_renderTargetHighWaterMark */
  _renderTargetHighWaterMark = 0;

  /** m_boundDepthStencil */
  _depthStencil = null;

  /** m_stackRT[MAX_RENDER_TARGET] */
  _renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);

  /** m_stackDS */
  _depthStencilStack = [];

  /** The viewport last set, as `Tr2Viewport`: `{ x, y, width, height, minZ, maxZ }`. */
  _viewport = null;

  /** m_useReadOnlyDepthView */
  _readOnlyDepth = false;

  /** The framebuffer every binding is attached to; see the head comment. */
  _framebuffer = null;

  /** The framebuffer `Present` reads the back buffer through. */
  _presentFramebuffer = null;

  /** What `_framebuffer` has attached now, so a change detaches the stale points. */
  _attached = new Map();

  /** m_allRenderStates: the last value each state was set to, 0xffffffff for unknown. */
  _allRenderStates = null;

  /** m_renderStateEmulation.m_currentBlend.RenderTarget[0], with m_separateAlphaBlendEnabled. */
  _blend = null;

  /** m_renderStateEmulation.m_currentDepthStencil, with m_currentStencilRef. */
  _depthStencilState = null;

  /** m_renderStateEmulation.m_currentRasterizer */
  _rasterizer = null;

  /** m_dirtyFlag: which emulated states the next draw sets. */
  _dirty = null;

  /** RS_SRGBWRITEENABLE as last set; see `SetRenderStatesImpl`. */
  _srgbWrite = false;

  /** m_isDepthReadOnly: the read-only flag the targets were last bound with. */
  _isDepthReadOnly = false;

  /** m_recodingFrame (sic) */
  _recordingFrame = 1;

  /** m_renderedFrame */
  _renderedFrame = 0;

  /** m_frameFences: `{ sync, recordedFrame }`. */
  _frameFences = [];

  /** Carbon's `Tr2SamplerStateALFactory`, keyed on the description. */
  _samplerStates = new Map();

  // State the verbs of later work bind. Stored now, as the stub stores it.

  _topology = Topology.TOP_INVALID;

  _vertexLayout = null;

  _streams = [];

  _indexBuffer = null;

  _indexStride = 0;

  _shaderProgram = null;

  _resourceSet = null;

  _renderStateSetup = null;

  /** Per (stage, register): `{ buffer, shared }`, what `SetConstants` bound. */
  _constantSlots = [];

  /** m_sharedConstantBuffers: per (stage, register), the copy a ONE_SHOT bind lands in. */
  _sharedConstantBuffers = [];

  /** The `WebGLProgram` last put in use. */
  _currentProgram = null;

  /** Each program's `ssyf` location, or null where it has none. */
  _clipFlipLocations = new WeakMap();

  /** Attribute locations the last draw enabled. */
  _enabledAttributes = new Set();

  /** m_drawUP */
  _drawUP = new Tr2DrawUPHelper();

  /** Draws that reached the device. */
  _drawCount = 0;

  _renderStateOverrides = null;

  /**
   * @param {object} [composition] The device half; omit for a context with no device.
   * @param {WebGL2RenderingContext} [composition.gl] The WebGL2 context to draw through.
   */
  constructor({ gl = null } = {})
  {
    this._gl = gl;
    this._ResetRenderStates();
    primaryRenderContext = this;
  }

  /**
   * The WebGL2 context every resource reaches its device through.
   *
   * @returns {WebGL2RenderingContext|null} The context.
   */
  @impl.custom
  GetWebgl2()
  {
    return this._gl;
  }

  /**
   * Records the primary render context (`Tr2RenderContextDx11.cpp:804-807`).
   *
   * @param {object|null} renderContext The context to make primary.
   */
  static SetPrimaryRenderContext(renderContext)
  {
    primaryRenderContext = renderContext;
  }

  /**
   * The primary render context, which must exist (`:809-813`, an assert).
   *
   * @returns {object} The primary context.
   */
  static GetPrimaryRenderContext()
  {
    if (primaryRenderContext === null) throw new Error("Tr2RenderContextALWebgl2: there is no primary render context");

    return primaryRenderContext;
  }

  /**
   * The primary render context, or null.
   *
   * @returns {object|null} The primary context.
   */
  static GetPrimaryRenderContextPointer()
  {
    return primaryRenderContext;
  }

  /**
   * Brings the device up (`Tr2PrimaryRenderContextDx11.cpp:124-441`). The
   * WebGL2 context already exists, made by whoever owns the canvas; this checks
   * it and applies the present parameters, validity first, because creating
   * the back buffer asks this context whether it is valid.
   *
   * @param {object} [presentParameters] `{ mode: { width, height } }`.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  CreateDevice(presentParameters = null)
  {
    const gl = this._gl;
    if (!gl || gl.isContextLost()) return ALResult.E_FAIL;

    this._framebuffer = gl.createFramebuffer();
    this._presentFramebuffer = gl.createFramebuffer();
    this._caps = new Tr2CapsALWebgl2(gl);
    this._isValid = true;

    return presentParameters ? this.SetPresentParameters(presentParameters) : ALResult.S_OK;
  }

  /**
   * Whether a device was created and is still usable.
   *
   * @returns {boolean} The flag.
   */
  IsValid()
  {
    return this._isValid && !this._gl.isContextLost();
  }

  /**
   * What this backend can do.
   *
   * @returns {Tr2CapsALWebgl2} The capabilities.
   */
  GetCaps()
  {
    if (!this._caps) this._caps = new Tr2CapsALWebgl2(this._gl);
    return this._caps;
  }

  // THE FACTORIES. Carbon's AL types are compile-time typedefs; we ship every
  // backend at once, so the context that knows its backend makes them. Each is
  // the stub's factory with this backend's class.

  /**
   * Creates a buffer.
   *
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents.
   * @returns {Tr2BufferALWebgl2|null} The buffer, or null when Create refused.
   */
  CreateBuffer(description, initialData = null)
  {
    const buffer = new Tr2BufferALWebgl2();
    return Failed(buffer.Create(description, initialData, this)) ? null : buffer;
  }

  /**
   * Creates a constant buffer; with no size, an empty one to be created later.
   *
   * @param {number} [size] Bytes.
   * @param {number} [usage] A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents.
   * @returns {Tr2ConstantBufferALWebgl2|null} The buffer, or null when a sized Create refused.
   */
  CreateConstantBuffer(size = 0, usage = Tr2ConstantUsageAL.REUSABLE, initialData = null)
  {
    const buffer = new Tr2ConstantBufferALWebgl2();
    if (size > 0 && Failed(buffer.Create(size, usage, initialData, this))) return null;
    return buffer;
  }

  /**
   * Creates a fence against this context.
   *
   * @returns {Tr2FenceALWebgl2|null} The fence, or null when Create refused.
   */
  CreateFence()
  {
    const fence = new Tr2FenceALWebgl2();
    return Failed(fence.Create(this)) ? null : fence;
  }

  /**
   * Creates a texture.
   *
   * @param {object} desc A `Tr2BitmapDimensions`.
   * @param {object} options `{ gpuUsage, cpuUsage, msaa, initialData }`.
   * @returns {Tr2TextureALWebgl2|null} The texture, or null when Create refused.
   */
  CreateTexture(desc, options)
  {
    const texture = new Tr2TextureALWebgl2();
    return Failed(texture.Create(desc, options ?? {}, this)) ? null : texture;
  }

  /**
   * Creates a resource set; with `implementationOnly`, the backend object and
   * its result for the shared `Tr2ResourceSetAL` handle to own.
   *
   * @param {object} description A `Tr2ResourceSetDescriptionAL`.
   * @param {object} program A `Tr2ShaderProgramALWebgl2`.
   * @param {boolean} [implementationOnly] Whether the handle is asking.
   * @returns {object|null} The set, `{ result, implementation }`, or null.
   */
  @impl.custom
  CreateResourceSet(description, program, implementationOnly = false)
  {
    if (implementationOnly)
    {
      const implementation = new Tr2ResourceSetALWebgl2();
      const result = implementation.Create(description, program, this);
      if (Failed(result)) implementation.Destroy();
      return { result, implementation };
    }

    const resourceSet = new Tr2ResourceSetAL();
    return Failed(resourceSet.Create(description, program, this)) ? null : resourceSet;
  }

  /**
   * The sampler state for a description, created once per distinct description:
   * Carbon's factory lookup on the primary context (`Tr2SamplerStateAL.cpp:25-28`).
   *
   * @param {object} description A `Tr2SamplerDescription`.
   * @returns {Tr2SamplerStateALWebgl2|null} The shared state, or null.
   */
  CreateSamplerState(description)
  {
    const key = SamplerDescriptionKey(description);
    if (key === null) return null;

    const existing = this._samplerStates.get(key);
    if (existing) return existing;

    const state = new Tr2SamplerStateALWebgl2();
    if (Failed(state.Create(description, this))) return null;

    this._samplerStates.set(key, state);
    return state;
  }

  /**
   * Creates a vertex layout.
   *
   * @param {object[]|object} definition The vertex definition.
   * @returns {Tr2VertexLayoutALWebgl2|null} The layout, or null when Create refused.
   */
  CreateVertexLayout(definition)
  {
    const layout = new Tr2VertexLayoutALWebgl2();
    return Failed(layout.Create(definition, this)) ? null : layout;
  }

  /**
   * Creates one shader stage.
   *
   * @param {number} stageType A `ShaderType`.
   * @param {ArrayBufferView|string} bytecode The GLSL source.
   * @param {object|null} signature The reflected signature.
   * @param {string} [shaderPath] A debug label.
   * @returns {Tr2ShaderALWebgl2|null} The shader, or null when Create refused.
   */
  CreateShader(stageType, bytecode, signature, shaderPath = "")
  {
    const shader = new Tr2ShaderALWebgl2();
    return Failed(shader.Create(stageType, bytecode, signature, shaderPath, this)) ? null : shader;
  }

  /**
   * Links stages into a program.
   *
   * @param {object[]} shaders The stages.
   * @returns {Tr2ShaderProgramALWebgl2|null} The program, or null when Create refused.
   */
  CreateShaderProgram(shaders)
  {
    const program = new Tr2ShaderProgramALWebgl2();
    return Failed(program.Create(shaders, this)) ? null : program;
  }

  // THE BACK BUFFER AND PRESENT.

  /**
   * Creates the back buffer at the requested size, binds it to slot zero with
   * no depth-stencil, and sizes the canvas to match
   * (`Tr2PrimaryRenderContextDx11.cpp:443-552`). dx11 resizes the swap
   * chain's buffers and attaches the new one; here the back buffer is created
   * as the stub creates its own, `B8G8R8A8_UNORM` with one mip.
   *
   * @param {object} presentParameters `{ mode: { width, height } }`.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  SetPresentParameters(presentParameters)
  {
    if (!presentParameters || !presentParameters.mode) return ALResult.E_INVALIDARG;
    if (!this.IsValid()) return ALResult.E_FAIL;

    const { width, height } = presentParameters.mode;
    const canvas = this._gl.canvas;
    if (canvas && (canvas.width !== width || canvas.height !== height))
    {
      canvas.width = width;
      canvas.height = height;
    }

    this._defaultBackBuffer.Destroy();
    this._defaultBackBuffer = new Tr2TextureALWebgl2();

    const result = this._defaultBackBuffer.Create(
      Tr2BitmapDimensions.texture2D(width, height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
      { gpuUsage: Tr2GpuUsage.RENDER_TARGET },
      this
    );
    if (Failed(result)) return result;

    this._presentParameters = presentParameters;
    this.SetViewport({ x: 0, y: 0, width, height, minZ: 0, maxZ: 1 });
    this._depthStencil = null;
    this.SetRenderTarget(0, this._defaultBackBuffer);

    return ALResult.S_OK;
  }

  /**
   * The present parameters last applied, under Carbon's misspelt name.
   *
   * @returns {object|null} The parameters.
   */
  GetPresentParamaters()
  {
    return this._presentParameters;
  }

  /**
   * The default back buffer.
   *
   * @returns {Tr2TextureALWebgl2} The back buffer, created or not.
   */
  GetDefaultBackBuffer()
  {
    return this._defaultBackBuffer;
  }

  /**
   * The back buffer's pixel format (`Tr2PrimaryRenderContextDx11.cpp:505-508`).
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetBackBufferFormat()
  {
    return this._defaultBackBuffer.IsValid() ? this._defaultBackBuffer.GetFormat() : PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /**
   * Whether a texture is the default back buffer (`Tr2RenderContextDx11.cpp:2254-2257`).
   *
   * @param {object} renderTarget The texture.
   * @returns {boolean} True for the back buffer.
   */
  IsBackBuffer(renderTarget)
  {
    return renderTarget === this._defaultBackBuffer;
  }

  /**
   * Shows the frame (`Tr2PrimaryRenderContextDx11.cpp:554-696`): the back
   * buffer is copied to the canvas, flipped, since the canvas's row 0 is its
   * bottom; see the head comment. A frame fence is put and earlier ones
   * collected, as dx11 does, which is what advances the rendered frame
   * number; and the back buffer is bound again.
   *
   * Presenting does not end the frame: the browser shows the canvas once
   * control returns to it.
   *
   * @returns {number} An `ALResult`: whether the frame was shown.
   */
  @impl.adapted
  Present()
  {
    if (!this.IsValid()) return ALResult.E_FAIL;

    const gl = this._gl;
    const backBuffer = this._defaultBackBuffer;

    if (backBuffer.IsValid())
    {
      const width = backBuffer.GetWidth();
      const height = backBuffer.GetHeight();

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this._presentFramebuffer);
      backBuffer.AttachToFramebuffer(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, 0, 0);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
      gl.disable(gl.SCISSOR_TEST);
      gl.blitFramebuffer(0, 0, width, height, 0, gl.drawingBufferHeight, gl.drawingBufferWidth, 0, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);
    }

    this._PutFrameFence();
    this._recordingFrame++;
    this._CollectFrameFences();

    this.SetRenderTarget(0, backBuffer);
    return ALResult.S_OK;
  }

  /** dx11's frame fence put, reusing a collected fence slot (`:598-622`). */
  _PutFrameFence()
  {
    const gl = this._gl;
    let fence = this._frameFences.find(candidate => candidate.recordedFrame === 0);

    if (!fence)
    {
      fence = { sync: null, recordedFrame: 0 };
      this._frameFences.push(fence);
    }

    if (fence.sync) gl.deleteSync(fence.sync);
    fence.sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    fence.recordedFrame = this._recordingFrame;
  }

  /** dx11's frame fence collection (`:635-646`): a signalled fence's frame is rendered. */
  _CollectFrameFences()
  {
    const gl = this._gl;

    for (const fence of this._frameFences)
    {
      if (!fence.recordedFrame) continue;
      if (gl.getSyncParameter(fence.sync, gl.SYNC_STATUS) !== gl.SIGNALED) continue;

      this._renderedFrame = Math.max(this._renderedFrame, fence.recordedFrame);
      fence.recordedFrame = 0;
    }
  }

  /**
   * The frame being recorded (`Tr2PrimaryRenderContextDx11.cpp:864-867`).
   *
   * @returns {number} The frame number.
   */
  GetRecordingFrameNumber()
  {
    return this._recordingFrame;
  }

  /**
   * The last frame the GPU has finished (`:869-872`).
   *
   * @returns {number} The frame number.
   */
  GetRenderedFrameNumber()
  {
    return this._renderedFrame;
  }

  /**
   * Opens a scene (`Tr2RenderContextDx11.cpp:897-926`): the bound program and
   * resource set are forgotten, so the scene binds its own.
   *
   * @returns {number} `S_OK`.
   */
  BeginScene()
  {
    this._shaderProgram = null;
    this._resourceSet = null;
    return ALResult.S_OK;
  }

  /**
   * Closes a scene; dx11 does nothing here.
   *
   * @returns {number} `S_OK`.
   */
  EndScene()
  {
    return ALResult.S_OK;
  }

  // RENDER TARGETS AND DEPTH.

  /**
   * Binds a render target to a slot (`Tr2RenderContextDx11.cpp:1464-1491`),
   * refusing a texture made without render-target usage.
   *
   * @param {number} slot The slot.
   * @param {object|null} renderTarget A `Tr2TextureALWebgl2`, or null to unbind.
   * @param {number} [slice] The array slice or cube face.
   * @returns {number} An `ALResult`: whether it was bound.
   */
  SetRenderTarget(slot, renderTarget, slice = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return ALResult.E_INVALIDARG;

    if (renderTarget && renderTarget.IsValid())
    {
      if (!HasFlag(renderTarget.GetGpuUsage(), Tr2GpuUsage.RENDER_TARGET)) return ALResult.E_INVALIDARG;
      this._boundRenderTargets[slot] = { texture: renderTarget, slice };
    }
    else
    {
      this._boundRenderTargets[slot] = { texture: null, slice: 0 };
    }

    this._renderTargetHighWaterMark = Math.max(this._renderTargetHighWaterMark, slot + 1);
    this._SetRtDsToDevice(slot);
    return ALResult.S_OK;
  }

  /**
   * The target bound at a slot.
   *
   * @param {number} [slot] The slot.
   * @returns {object|null} The target.
   */
  GetRenderTarget(slot = 0)
  {
    return this._boundRenderTargets[slot]?.texture ?? null;
  }

  /**
   * Saves the target bound at a slot (`:2178-2188`).
   *
   * @param {number} [slot] The slot.
   * @returns {number} An `ALResult`: whether it was saved.
   */
  PushRenderTarget(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return ALResult.E_INVALIDARG;

    this._renderTargetStacks[slot].push({ ...this._boundRenderTargets[slot] });
    return ALResult.S_OK;
  }

  /**
   * Restores the target saved for a slot (`:2190-2206`); an empty stack fails.
   *
   * @param {number} [slot] The slot.
   * @returns {number} An `ALResult`: whether one was restored.
   */
  PopRenderTarget(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return ALResult.E_INVALIDARG;

    const stack = this._renderTargetStacks[slot];
    if (!stack.length) return ALResult.E_FAIL;

    this._boundRenderTargets[slot] = stack.pop();
    this._SetRtDsToDevice(slot);
    return ALResult.S_OK;
  }

  /**
   * How many targets are saved for a slot.
   *
   * @param {number} [slot] The slot.
   * @returns {number} The stack depth.
   */
  GetStackSizeRT(slot = 0)
  {
    return this._renderTargetStacks[slot]?.length ?? 0;
  }

  /**
   * Binds the depth-stencil target (`:1442-1462`), refusing a texture made
   * without depth-stencil usage.
   *
   * @param {object|null} depthStencil A `Tr2TextureALWebgl2`, or null to unbind.
   * @returns {number} An `ALResult`: whether it was bound.
   */
  SetDepthStencil(depthStencil)
  {
    if (depthStencil && depthStencil.IsValid())
    {
      if (!HasFlag(depthStencil.GetGpuUsage(), Tr2GpuUsage.DEPTH_STENCIL)) return ALResult.E_INVALIDARG;
      this._depthStencil = depthStencil;
    }
    else
    {
      this._depthStencil = null;
    }

    this._SetRtDsToDevice(MAX_RENDER_TARGET);
    return ALResult.S_OK;
  }

  /**
   * The bound depth-stencil target.
   *
   * @returns {object|null} The target.
   */
  GetDepthStencil()
  {
    return this._depthStencil;
  }

  /**
   * Saves the bound depth-stencil target (`:2208-2212`).
   *
   * @returns {number} `S_OK`.
   */
  PushDepthStencil()
  {
    this._depthStencilStack.push(this._depthStencil);
    return ALResult.S_OK;
  }

  /**
   * Restores the saved depth-stencil target (`:2214-2225`); an empty stack fails.
   *
   * @returns {number} An `ALResult`: whether one was restored.
   */
  PopDepthStencil()
  {
    if (!this._depthStencilStack.length) return ALResult.E_FAIL;

    this._depthStencil = this._depthStencilStack.pop();
    this._SetRtDsToDevice(MAX_RENDER_TARGET);
    return ALResult.S_OK;
  }

  /**
   * How many depth-stencil targets are saved.
   *
   * @returns {number} The stack depth.
   */
  GetStackSizeDS()
  {
    return this._depthStencilStack.length;
  }

  /**
   * The size of the target at a slot (`:2227-2252`).
   *
   * @param {number} [slot] The slot.
   * @returns {{result: number, width: number, height: number}} dx11's out arguments come back here.
   */
  GetRenderTargetSize(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return { result: ALResult.E_INVALIDARG, width: 0, height: 0 };

    const target = this._boundRenderTargets[slot].texture;
    if (!target || !target.IsValid()) return { result: ALResult.E_FAIL, width: 0, height: 0 };

    return { result: ALResult.S_OK, width: target.GetWidth(), height: target.GetHeight() };
  }

  /**
   * Whether the bound depth is read-only.
   *
   * @returns {boolean} The flag.
   */
  GetReadOnlyDepth()
  {
    return this._readOnlyDepth;
  }

  /**
   * Binds depth read-only, so a pass can sample it while it stays bound
   * (`:1425-1435`). dx11 switches to a read-only depth view. WebGL2 has none,
   * and a texture that is both attached and sampled is a feedback loop GL
   * refuses to draw, so this detaches the depth while the flag is set; depth
   * testing against it is lost for those draws, which is the loss this
   * backend accepts.
   *
   * @param {boolean} enable Whether depth is read-only.
   */
  @impl.adapted
  SetReadOnlyDepth(enable)
  {
    if (this._readOnlyDepth === Boolean(enable)) return;

    this._readOnlyDepth = Boolean(enable);
    this._isDepthReadOnly = this._readOnlyDepth;
    this._SetRtDsToDevice(MAX_RENDER_TARGET);
  }

  /**
   * Attaches the bound targets to the framebuffer (`:1322-1423`). As dx11,
   * a depth-stencil whose size does not match slot zero's target is not bound
   * yet - the caller is between setting the two - and changing slot zero, or
   * binding depth with no target, resets the viewport and scissor to the new
   * size, which Trinity relies on.
   *
   * @param {number} changedSlot The slot that changed, or `MAX_RENDER_TARGET` for depth.
   */
  @impl.adapted
  _SetRtDsToDevice(changedSlot)
  {
    const gl = this._gl;
    if (!this._isValid) return;

    this._resourceSet = null;

    const primary = this._boundRenderTargets[0].texture;
    const depth = this._depthStencil;
    const depthFits = !depth || !primary || (depth.GetWidth() === primary.GetWidth()
      && depth.GetHeight() === primary.GetHeight()
      && Math.max(depth.GetMsaaDesc().samples, 1) === Math.max(primary.GetMsaaDesc().samples, 1));

    if (depthFits)
    {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this._framebuffer);

      const wanted = new Map();
      const drawBuffers = [];

      for (let slot = 0; slot < this._renderTargetHighWaterMark; slot++)
      {
        const { texture, slice } = this._boundRenderTargets[slot];
        const point = gl.COLOR_ATTACHMENT0 + slot;

        if (texture && texture.IsValid())
        {
          wanted.set(point, { texture, slice });
          drawBuffers.push(point);
        }
        else
        {
          drawBuffers.push(gl.NONE);
        }
      }

      if (depth && !this._isDepthReadOnly) wanted.set(depth.GetDepthAttachmentPoint(), { texture: depth, slice: 0 });

      this._Attach(gl, wanted);
      gl.drawBuffers(drawBuffers.length ? drawBuffers : [ gl.NONE ]);
    }

    if (changedSlot === 0 || !primary)
    {
      const sized = primary ?? depth;
      if (sized)
      {
        this.SetViewport({ x: 0, y: 0, width: sized.GetWidth(), height: sized.GetHeight(), minZ: 0, maxZ: 1 });
        gl.scissor(0, 0, sized.GetWidth(), sized.GetHeight());
      }
    }
  }

  /** Attaches what is wanted and detaches whatever was attached before and is not. */
  _Attach(gl, wanted)
  {
    for (const [ point ] of this._attached)
    {
      if (wanted.has(point)) continue;

      if (point === gl.DEPTH_ATTACHMENT || point === gl.DEPTH_STENCIL_ATTACHMENT) gl.framebufferRenderbuffer(gl.FRAMEBUFFER, point, gl.RENDERBUFFER, null);
      else gl.framebufferTexture2D(gl.FRAMEBUFFER, point, gl.TEXTURE_2D, null, 0);
    }

    for (const [ point, { texture, slice } ] of wanted)
    {
      const previous = this._attached.get(point);
      if (previous && previous.texture === texture && previous.slice === slice) continue;

      texture.AttachToFramebuffer(gl.FRAMEBUFFER, point, 0, slice);
    }

    this._attached = wanted;
  }

  /** The coverage-discard mode following draws use; see `SetCoverageDiscard`. */
  _coverageDiscard = 0;

  /**
   * Sets which pixels following draws discard, for the depth-of-field layer
   * pass (not Carbon's: the stub's `SetCoverageDiscard` has the history).
   * 0 discards nothing, 1 discards where target 0's alpha is at most 0.001,
   * 2 where its largest absolute colour channel is. The GLSL half, a uniform
   * the program reads, is not wired yet; the mode is kept for it.
   *
   * @param {number} mode 0, 1 or 2.
   */
  @impl.custom
  SetCoverageDiscard(mode)
  {
    this._coverageDiscard = mode >>> 0;
  }

  // VIEWPORT AND CLEAR.

  /**
   * Sets the viewport (`:2164-2169`). Coordinates are D3D's and need no
   * conversion; see the head comment.
   *
   * @param {object} viewport `{ x, y, width, height, minZ, maxZ }`.
   * @returns {number} `S_OK`.
   */
  SetViewport(viewport)
  {
    if (!viewport) return ALResult.E_FAIL;

    this._viewport = { x: 0, y: 0, minZ: 0, maxZ: 1, ...viewport };

    if (this._isValid)
    {
      const { x, y, width, height, minZ, maxZ } = this._viewport;
      this._gl.viewport(x, y, width, height);
      this._gl.depthRange(minZ, maxZ);
    }

    return ALResult.S_OK;
  }

  /**
   * The viewport last set.
   *
   * @returns {object|null} A copy of it.
   */
  GetViewport()
  {
    return this._viewport ? { ...this._viewport } : null;
  }

  /**
   * Clears the bound targets (`:1273-1320`): the colour of one slot, and the
   * depth and stencil of the bound depth-stencil. dx11 clears ignore masks and
   * scissor; GL clears honour both, so they are opened for the clear and the
   * render states are applied again at the next draw.
   *
   * The options are the WebGPU context's: `clearColor`, `clearDepth` and
   * `clearStencil` are dx11's `CLEARFLAGS_TARGET`, `_ZBUFFER` and `_STENCIL`;
   * a call naming none of them clears the target and depth.
   *
   * @param {object} [options] `{ color, depth, stencil, clearColor, clearDepth, clearStencil, slot }`.
   * @returns {number} `S_OK`.
   */
  @impl.adapted
  Clear(options = {})
  {
    if (!this._isValid) return ALResult.E_FAIL;

    const gl = this._gl;
    const flagged = "clearColor" in options || "clearDepth" in options || "clearStencil" in options;
    const clearTarget = flagged ? Boolean(options.clearColor) : true;
    const clearDepth = flagged ? Boolean(options.clearDepth) : true;
    const clearStencil = flagged ? Boolean(options.clearStencil) : false;
    const slot = options.slot ?? 0;

    // The masks a clear opens belong to the blend and depth-stencil states.
    gl.disable(gl.SCISSOR_TEST);
    this._dirty.blend = true;
    this._dirty.depthStencil = true;

    if (clearTarget && this._boundRenderTargets[slot]?.texture)
    {
      gl.colorMask(true, true, true, true);
      gl.clearBufferfv(gl.COLOR, slot, ClearColor(options.color ?? 0));
    }

    const depth = this._depthStencil;
    if ((clearDepth || clearStencil) && depth && !this._isDepthReadOnly)
    {
      const value = Number(options.depth ?? 1);
      const stencil = Number(options.stencil ?? 0);
      const hasStencil = depth.GetDepthAttachmentPoint() === gl.DEPTH_STENCIL_ATTACHMENT;

      gl.depthMask(true);
      gl.stencilMask(0xff);

      if (clearDepth && clearStencil && hasStencil) gl.clearBufferfi(gl.DEPTH_STENCIL, 0, value, stencil);
      else if (clearDepth) gl.clearBufferfv(gl.DEPTH, 0, [ value ]);
      else if (hasStencil) gl.clearBufferiv(gl.STENCIL, 0, [ stencil ]);
    }

    return ALResult.S_OK;
  }

  /**
   * Refused: no WebGL2 resource has unordered access.
   *
   * @returns {number} `E_FAIL`.
   */
  ClearUav()
  {
    return ALResult.E_FAIL;
  }

  // GEOMETRY AND PROGRAMS. dx11 binds each on the device as it is set; a
  // WebGL2 vertex attribute and a uniform belong to the bound program, so the
  // setters record and the draw applies (`_ApplyDrawBindings`).

  /**
   * Sets the primitive topology (`Tr2RenderContextDx11.cpp:2286-2325`). As
   * dx11, a triangle fan draws as a point list: dx11 no longer supports fans
   * and its lookup gives them `POINTLIST`, which `ComputeVertexCount` matches.
   *
   * @param {number} topology A `Topology` value.
   * @returns {number} An `ALResult` value.
   */
  SetTopology(topology)
  {
    if (topology >= Topology.TOP_MAX_TOPOLOGY) return ALResult.E_INVALIDARG;
    this._topology = topology;
    return this._isValid ? ALResult.S_OK : ALResult.E_FAIL;
  }

  /**
   * The vertex count a primitive count describes under the bound topology
   * (`:930-958`), dx11's table including its fan entry.
   *
   * @param {number} primitiveCount Primitives.
   * @returns {number} Vertices.
   */
  ComputeVertexCount(primitiveCount)
  {
    switch (this._topology)
    {
      case Topology.TOP_TRIANGLES: return primitiveCount * 3;
      case Topology.TOP_TRIANGLE_STRIP: return primitiveCount + 2;
      case Topology.TOP_LINES: return primitiveCount * 2;
      case Topology.TOP_LINE_STRIP: return primitiveCount + 1;
      case Topology.TOP_POINTS:
      case Topology.TOP_TRIANGLE_FAN: return primitiveCount;
      default: return 0;
    }
  }

  /**
   * Binds the vertex layout (`:1562-1567`).
   *
   * @param {object} layout A `Tr2VertexLayoutALWebgl2`.
   * @returns {number} `S_OK`.
   */
  SetVertexLayout(layout)
  {
    this._vertexLayout = layout;
    return ALResult.S_OK;
  }

  /**
   * Binds a vertex stream (`:1493-1506`).
   *
   * @param {number} stream The slot.
   * @param {object} buffer A `Tr2BufferALWebgl2`.
   * @param {number} offset Byte offset.
   * @param {number} stride Bytes per vertex.
   * @returns {number} `S_OK`.
   */
  SetStreamSource(stream, buffer, offset, stride)
  {
    this._streams[stream] = { buffer, offset, stride };
    return ALResult.S_OK;
  }

  /**
   * Binds the index buffer (`:1508-1518`); with no stride, the buffer's own.
   *
   * @param {object} buffer A `Tr2BufferALWebgl2`.
   * @param {number} [stride] Bytes per index.
   * @returns {number} `S_OK`.
   */
  SetIndices(buffer, stride = 0)
  {
    this._indexBuffer = buffer;
    this._indexStride = stride || (buffer ? buffer.GetDesc().stride : 0);
    return ALResult.S_OK;
  }

  /**
   * Binds the shader program (`:1569-1606`).
   *
   * @param {object} shaderProgram A `Tr2ShaderProgramALWebgl2`.
   * @returns {number} `S_OK`.
   */
  SetShaderProgram(shaderProgram)
  {
    this._shaderProgram = shaderProgram;
    return ALResult.S_OK;
  }

  /**
   * Binds a resource set (`:1977-2139`). Its units are bound at the draw,
   * against the bound program.
   *
   * @param {object} resourceSet A `Tr2ResourceSetAL`.
   * @returns {number} `S_OK`.
   */
  SetResourceSet(resourceSet)
  {
    this._resourceSet = resourceSet;
    return ALResult.S_OK;
  }

  /**
   * Binds a constant buffer to a stage register (`:1171-1271`).
   *
   * A `ONE_SHOT` buffer's bytes are copied now into the slot's shared buffer,
   * as dx11 copies them, because the caller refills it for the next bind; a
   * `REUSABLE` one is bound as it is and read at the draw. An unchanged
   * one-shot payload is skipped, as dx11's cache skips it.
   *
   * @param {object} buffer A `Tr2ConstantBufferALWebgl2`.
   * @param {number} constantType A `ShaderType`.
   * @param {number} registerIndex The constant-buffer register.
   * @returns {number} An `ALResult` value.
   */
  @impl.adapted
  SetConstants(buffer, constantType, registerIndex, _unusedArgument = 0)
  {
    if (constantType < 0 || constantType >= ShaderType.SHADER_TYPE_COUNT || registerIndex >= CB_SLOT_COUNT) return ALResult.E_INVALIDARG;

    const index = constantType * CB_SLOT_COUNT + registerIndex;

    if (buffer.GetUsage() !== Tr2ConstantUsageAL.ONE_SHOT)
    {
      this._constantSlots[index] = { buffer, shared: null };
      return ALResult.S_OK;
    }

    const data = buffer.GetMirror();
    const size = buffer.GetSize();
    if (size === 0) return ALResult.S_OK;

    let shared = this._sharedConstantBuffers[index];
    if (!shared)
    {
      shared = { constantBuffer: null, mirror: new Uint8Array(0), size: 0 };
      this._sharedConstantBuffers[index] = shared;
    }

    const slot = this._constantSlots[index];
    if (shared.size === size && slot && slot.shared === shared && BytesEqual(shared.mirror, data, size)) return ALResult.S_OK;

    if (shared.mirror.length < size) shared.mirror = new Uint8Array(size);
    shared.mirror.set(data.subarray(0, size));
    shared.size = size;

    if (!shared.constantBuffer || shared.constantBuffer.GetSize() < size)
    {
      if (shared.constantBuffer) shared.constantBuffer.Destroy();
      shared.constantBuffer = this.CreateConstantBuffer(Math.ceil(size / 16) * 16, Tr2ConstantUsageAL.REUSABLE, null);
      if (!shared.constantBuffer) return ALResult.E_FAIL;
    }

    const lock = shared.constantBuffer.Lock(this);
    if (Failed(lock.result)) return lock.result;
    lock.data.set(data.subarray(0, size));
    const unlocked = shared.constantBuffer.Unlock(this);
    if (Failed(unlocked)) return unlocked;

    this._constantSlots[index] = { buffer: shared.constantBuffer, shared };
    return ALResult.S_OK;
  }

  /**
   * Binds what the setters recorded to the bound program: the program, its
   * constant buffers, its texture units, the clip-space flip, then the vertex
   * attributes. The WebGL2 half of every dx11 draw, which binds these as they
   * are set.
   *
   * @param {number} baseVertex Added to every non-instanced stream's offset,
   *   in vertices: WebGL2 has no base vertex.
   * @param {number} startInstance Added to every instanced stream's offset.
   * @returns {boolean} Whether the draw can proceed.
   */
  @impl.custom
  _ApplyDrawBindings(baseVertex, startInstance)
  {
    const gl = this._gl;
    const program = this._shaderProgram;
    if (!program || !program.IsValid()) return false;

    const native = program.GetGpuResource();
    if (this._currentProgram !== native)
    {
      gl.useProgram(native);
      this._currentProgram = native;
    }

    this._ApplyConstants(program);
    this._ApplyTextureUnits();
    this._ApplyClipFlip(program, native);
    return this._ApplyVertexAttributes(baseVertex, startInstance);
  }

  /** Each of the program's constant buffers from the slot it reads. */
  _ApplyConstants(program)
  {
    const gl = this._gl;

    for (const record of program.GetConstantBuffers())
    {
      const slot = this._constantSlots[record.stage * CB_SLOT_COUNT + record.registerIndex];
      if (!slot) continue;

      if (record.style === "std140")
      {
        if (record.bindingPoint !== undefined) gl.bindBufferBase(gl.UNIFORM_BUFFER, record.bindingPoint, slot.buffer.GetGpuResource());
        continue;
      }

      if (!record.location) continue;

      const floats = record.sizeInVec4 * 4;
      const bytes = slot.shared ? slot.shared.mirror : slot.buffer.GetMirror();
      const available = Math.min(floats, Math.floor(bytes.byteLength / 4));
      const values = available === floats && bytes.byteOffset % 4 === 0
        ? new Float32Array(bytes.buffer, bytes.byteOffset, floats)
        : PaddedFloats(bytes, available, floats);
      gl.uniform4fv(record.location, values);
    }
  }

  /** The resource set's units: each unit's texture and sampler. */
  _ApplyTextureUnits()
  {
    const gl = this._gl;
    const set = this._resourceSet ? this._resourceSet.m_resourceSet.implementation : null;
    if (!set || !set.IsValid()) return;

    for (const unit of set.GetUnits())
    {
      gl.activeTexture(gl.TEXTURE0 + unit.unit);

      const resource = unit.resource;
      const texture = resource && resource.IsValid() ? resource.GetShaderResourceTexture(unit.colorSpace) : null;
      gl.bindTexture(unit.isBuffer || !resource ? gl.TEXTURE_2D : resource.GetTarget(), texture);
      gl.bindSampler(unit.unit, unit.sampler ? unit.sampler.GetGpuResource() : null);
    }
  }

  /**
   * Sets the emitter's clip-space flip uniform (`ssyf`) so every target is
   * stored top-down; see the head comment. A program translated without
   * `clipYFlip` has no such uniform.
   */
  _ApplyClipFlip(program, native)
  {
    let location = this._clipFlipLocations.get(program);
    if (location === undefined)
    {
      location = this._gl.getUniformLocation(native, CLIP_Y_FLIP_UNIFORM);
      this._clipFlipLocations.set(program, location);
    }
    if (location) this._gl.uniform3f(location, 0, 0, -1);
  }

  /**
   * Points each attribute of the vertex layout's plan at its stream
   * (`Tr2VertexLayoutALWebgl2.GetCurrentPlan`), or sets a constant zero for
   * one nothing feeds, and disables what the plan does not use.
   *
   * @returns {boolean} True.
   */
  _ApplyVertexAttributes(baseVertex, startInstance)
  {
    const gl = this._gl;
    const plan = this._vertexLayout ? this._vertexLayout.GetCurrentPlan() ?? [] : [];
    const used = new Set();

    for (const entry of plan)
    {
      const location = entry.location;
      const stream = entry.format ? this._streams[entry.stream] : null;
      used.add(location);

      if (!stream || !stream.buffer)
      {
        gl.disableVertexAttribArray(location);
        if (entry.constant === "INT") gl.vertexAttribI4i(location, 0, 0, 0, 0);
        else if (entry.constant === "UINT") gl.vertexAttribI4ui(location, 0, 0, 0, 0);
        else gl.vertexAttrib4f(location, 0, 0, 0, 0);
        continue;
      }

      const { format, divisor } = entry;
      const skipped = divisor > 0 ? Math.floor(startInstance / divisor) : baseVertex;
      const offset = stream.offset + entry.offset + skipped * stream.stride;

      gl.bindBuffer(gl.ARRAY_BUFFER, stream.buffer.GetGpuResource());
      if (format.integer) gl.vertexAttribIPointer(location, format.size, format.type, stream.stride, offset);
      else gl.vertexAttribPointer(location, format.size, format.type, format.normalized, stream.stride, offset);
      gl.vertexAttribDivisor(location, divisor);
      gl.enableVertexAttribArray(location);
    }

    for (const location of this._enabledAttributes)
    {
      if (!used.has(location)) gl.disableVertexAttribArray(location);
    }
    this._enabledAttributes = used;

    return true;
  }

  /** The GL primitive mode of the bound topology; a fan is points, as in dx11. */
  _PrimitiveMode()
  {
    const gl = this._gl;
    switch (this._topology)
    {
      case Topology.TOP_TRIANGLES: return gl.TRIANGLES;
      case Topology.TOP_TRIANGLE_STRIP: return gl.TRIANGLE_STRIP;
      case Topology.TOP_LINES: return gl.LINES;
      case Topology.TOP_LINE_STRIP: return gl.LINE_STRIP;
      case Topology.TOP_POINTS:
      case Topology.TOP_TRIANGLE_FAN: return gl.POINTS;
      default: return null;
    }
  }

  // RENDER STATES: dx11's emulation (`Tr2RenderContextDx11.cpp:1608-1975`,
  // `Tr2RenderStateEmulationDx11.cpp`). D3D9-style state pairs accumulate into
  // blend, depth-stencil and rasterizer descriptions, each with a dirty flag;
  // the draw applies the dirty ones. dx11 builds a D3D11 state object per
  // description; WebGL2 sets the same fields on the context.

  /**
   * Applies a render-state setup: its authored pairs, through the state
   * manager's overrides, into `SetRenderStatesImpl`.
   *
   * Carbon's state manager maps each pair through its override tables and
   * hands the context the list (`Tr2EffectStateManager.cpp:730-755`); ours
   * hands the setup and the override flags, the stub's departure, so the
   * tables are applied here: `SetInvertedDepthTest`, `SetInvertedCullMode`
   * and `SetWireframeRendering` (`:800-858`).
   *
   * @param {object} setup A `Tr2RenderStateSetup`.
   * @param {object} [overrides] `{ invertedDepthTest, invertedCullMode, wireframe }`.
   * @returns {number} An `ALResult` value; `S_OK` for no setup, as dx11 answers a null list.
   */
  @impl.adapted
  SetRenderStates(setup, overrides = null)
  {
    if (!setup) return ALResult.S_OK;

    this._renderStateSetup = setup;
    this._renderStateOverrides = overrides;

    const pairs = [];
    for (const [ state, value ] of setup.authoredStates)
    {
      let mapped = value;
      if (overrides?.invertedDepthTest && state === RenderState.RS_ZFUNC) mapped = INVERTED_DEPTH_TEST[value] ?? value;
      else if (overrides?.invertedCullMode && state === RenderState.RS_CULLMODE) mapped = INVERTED_CULL_MODE[value] ?? value;
      else if (overrides?.wireframe && state === RenderState.RS_FILLMODE) mapped = WIREFRAME_FILL_MODE[value] ?? value;
      pairs.push(state, mapped);
    }

    return this.SetRenderStatesImpl(pairs);
  }

  /**
   * The setup last applied, with its overrides.
   *
   * @returns {{setup: object|null, overrides: object|null}} The inputs.
   */
  GetRenderStates()
  {
    return { setup: this._renderStateSetup, overrides: this._renderStateOverrides };
  }

  /**
   * Sets one render state (`:1608-1612`).
   *
   * @param {number} state A `RenderState` value.
   * @param {number} value Its value.
   * @returns {number} An `ALResult` value.
   */
  SetRenderState(state, value)
  {
    return this.SetRenderStatesImpl([ state >>> 0, value >>> 0 ]);
  }

  /**
   * Folds state pairs into the emulated descriptions (`:1624-1867`). A state
   * already at its value is skipped; each change marks its description dirty.
   * Stencil and the depth-clip flag are carried as dx11 carries them.
   *
   * @param {number[]} pairs Flat `[state, value, ...]`.
   * @returns {number} `S_OK`.
   */
  SetRenderStatesImpl(pairs)
  {
    const rt0 = this._blend;
    const ds = this._depthStencilState;
    const rs = this._rasterizer;
    const RS = RenderState;

    for (let i = 0; i + 1 < pairs.length; i += 2)
    {
      const state = pairs[i] >>> 0;
      const value = pairs[i + 1] >>> 0;

      if (state >= RS.RS_MAX_STATE || this._allRenderStates[state] === value) continue;
      this._allRenderStates[state] = value;

      switch (state)
      {
        case RS.RS_ALPHABLENDENABLE: this._SetBlend("blendEnable", value !== 0); break;
        case RS.RS_SRCBLEND: this._SetBlend("srcBlend", value); break;
        case RS.RS_DESTBLEND: this._SetBlend("destBlend", value); break;
        case RS.RS_SRCBLENDALPHA: this._SetBlend("srcBlendAlpha", value); break;
        case RS.RS_DESTBLENDALPHA: this._SetBlend("destBlendAlpha", value); break;
        case RS.RS_BLENDOP: this._SetBlend("blendOp", value); break;
        case RS.RS_BLENDOPALPHA: this._SetBlend("blendOpAlpha", value); break;
        case RS.RS_COLORWRITEENABLE: this._SetBlend("writeMask", value & 0xf); break;
        case RS.RS_SEPARATEALPHABLENDENABLE: this._SetBlend("separateAlpha", value !== 0); break;

        case RS.RS_ZENABLE: this._SetDepthStencil("depthEnable", value !== 0); break;
        case RS.RS_ZWRITEENABLE: this._SetDepthStencil("depthWrite", value !== 0); break;
        case RS.RS_ZFUNC: this._SetDepthStencil("depthFunc", value); break;
        case RS.RS_STENCILENABLE: this._SetDepthStencil("stencilEnable", value !== 0); break;
        case RS.RS_STENCILMASK: this._SetDepthStencil("stencilMask", value & 0xff); break;
        case RS.RS_STENCILREF: this._SetDepthStencil("stencilRef", value); break;
        case RS.RS_STENCILFAIL: this._SetDepthStencil("stencilFail", value); break;
        case RS.RS_STENCILZFAIL: this._SetDepthStencil("stencilDepthFail", value); break;
        case RS.RS_STENCILPASS: this._SetDepthStencil("stencilPass", value); break;
        case RS.RS_STENCILFUNC: this._SetDepthStencil("stencilFunc", value); break;

        case RS.RS_FILLMODE: this._SetRasterizer("fillMode", value); break;
        // D3DCULL_NONE 1, CW 2, CCW 3; dx11's front face is clockwise.
        case RS.RS_CULLMODE: this._SetRasterizer("cullMode", value === 1 ? CULL_NONE : (value === 3 ? CULL_BACK : CULL_FRONT)); break;
        // dx11 truncates the authored float to D3D's integer bias.
        case RS.RS_DEPTHBIAS:
        case RS.RS_ZBIAS: this._SetRasterizer("depthBias", Math.trunc(float32FromBits(value))); break;
        case RS.RS_SLOPESCALEDEPTHBIAS: this._SetRasterizer("slopeScaledDepthBias", float32FromBits(value)); break;
        case RS.RS_DEPTH_CLIP_ENABLE: this._SetRasterizer("depthClipEnable", value !== 0); break;
        // dx11 rebinds its targets through their sRGB views. WebGL2 has no
        // views: a target renders in its own format, so the flag is kept and
        // changes nothing (see the head comment's known gaps).
        case RS.RS_SRGBWRITEENABLE: this._srgbWrite = value !== 0; break;
        default: break;
      }
    }

    return ALResult.S_OK;
  }

  /** One blend field, dirtying the blend state when it changes. */
  _SetBlend(field, value)
  {
    if (this._blend[field] === value) return;
    this._blend[field] = value;
    this._dirty.blend = true;
  }

  /** One depth-stencil field, dirtying the depth-stencil state when it changes. */
  _SetDepthStencil(field, value)
  {
    if (this._depthStencilState[field] === value) return;
    this._depthStencilState[field] = value;
    this._dirty.depthStencil = true;
  }

  /** One rasterizer field, dirtying the rasterizer state when it changes. */
  _SetRasterizer(field, value)
  {
    if (this._rasterizer[field] === value) return;
    this._rasterizer[field] = value;
    this._dirty.rasterizer = true;
  }

  /**
   * Sets the blend state on the context (`:1925-1938`,
   * `Tr2RenderStateEmulationDx11.cpp` `GetBlendState`). Without separate
   * alpha blending the alpha factors are derived from the colour ones through
   * dx11's remap table, defect and all (`ALPHA_BLEND_REMAP`). The blend
   * constant is always (1, 1, 1, 1), as dx11 sets it.
   *
   * @returns {boolean} False when a factor has no WebGL2 equivalent.
   */
  @impl.adapted
  ApplyBlendState()
  {
    if (!this._dirty.blend) return true;

    const gl = this._gl;
    const blend = this._blend;
    const srcAlpha = blend.separateAlpha ? blend.srcBlendAlpha : ALPHA_BLEND_REMAP[blend.srcBlend];
    const destAlpha = blend.separateAlpha ? blend.destBlendAlpha : ALPHA_BLEND_REMAP[blend.destBlend];
    const opAlpha = blend.separateAlpha ? blend.blendOpAlpha : blend.blendOp;

    if (blend.blendEnable)
    {
      const factors = [ blend.srcBlend, blend.destBlend, srcAlpha, destAlpha ].map(factor => this._BlendFactor(factor));
      const ops = [ blend.blendOp, opAlpha ].map(op => BlendOperationOf(gl, op));
      if (factors.includes(null) || ops.includes(null)) return false;

      gl.enable(gl.BLEND);
      gl.blendFuncSeparate(factors[0], factors[1], factors[2], factors[3]);
      gl.blendEquationSeparate(ops[0], ops[1]);
      gl.blendColor(1, 1, 1, 1);
    }
    else
    {
      gl.disable(gl.BLEND);
    }

    const mask = blend.writeMask;
    gl.colorMask((mask & 1) !== 0, (mask & 2) !== 0, (mask & 4) !== 0, (mask & 8) !== 0);

    this._dirty.blend = false;
    return true;
  }

  /**
   * Sets the depth-stencil state on the context (`:1940-1955`).
   *
   * @returns {boolean} True.
   */
  @impl.adapted
  ApplyDepthStencilState()
  {
    if (!this._dirty.depthStencil) return true;

    const gl = this._gl;
    const ds = this._depthStencilState;

    if (ds.depthEnable) gl.enable(gl.DEPTH_TEST);
    else gl.disable(gl.DEPTH_TEST);
    gl.depthMask(ds.depthWrite);
    gl.depthFunc(ComparisonOf(gl, ds.depthFunc));

    if (ds.stencilEnable)
    {
      gl.enable(gl.STENCIL_TEST);
      gl.stencilFunc(ComparisonOf(gl, ds.stencilFunc), ds.stencilRef, ds.stencilMask);
      gl.stencilOp(StencilOperationOf(gl, ds.stencilFail), StencilOperationOf(gl, ds.stencilDepthFail), StencilOperationOf(gl, ds.stencilPass));
    }
    else
    {
      gl.disable(gl.STENCIL_TEST);
    }
    gl.stencilMask(ds.stencilMask);

    this._dirty.depthStencil = false;
    return true;
  }

  /**
   * Sets the rasterizer state on the context (`:1957-1975`).
   *
   * Winding: dx11's front face is clockwise. Every target here is stored
   * upside down in GL's terms (see the head comment), which mirrors winding,
   * so a D3D clockwise triangle is counter-clockwise to GL: the front face is
   * `CCW`. The depth bias is `polygonOffset`, in GL's units, which the
   * specification leaves to the implementation as D3D's are left to the
   * format. Turning depth clip off needs `EXT_depth_clamp`.
   *
   * @returns {boolean} False for a fill mode other than solid, which WebGL2
   *   cannot rasterize.
   */
  @impl.adapted
  ApplyRasterizerState()
  {
    if (!this._dirty.rasterizer) return true;

    const gl = this._gl;
    const rs = this._rasterizer;
    if (rs.fillMode !== FILL_SOLID) return false;

    gl.frontFace(gl.CCW);
    if (rs.cullMode === CULL_NONE)
    {
      gl.disable(gl.CULL_FACE);
    }
    else
    {
      gl.enable(gl.CULL_FACE);
      gl.cullFace(rs.cullMode === CULL_BACK ? gl.BACK : gl.FRONT);
    }

    if (rs.depthBias !== 0 || rs.slopeScaledDepthBias !== 0)
    {
      gl.enable(gl.POLYGON_OFFSET_FILL);
      gl.polygonOffset(rs.slopeScaledDepthBias, rs.depthBias);
    }
    else
    {
      gl.disable(gl.POLYGON_OFFSET_FILL);
    }

    const clamp = gl.getExtension("EXT_depth_clamp");
    if (clamp)
    {
      if (rs.depthClipEnable) gl.disable(clamp.DEPTH_CLAMP_EXT);
      else gl.enable(clamp.DEPTH_CLAMP_EXT);
    }

    this._dirty.rasterizer = false;
    return true;
  }

  /**
   * Re-applies read-only depth and sRGB writes when they changed
   * (`:960-969`). sRGB writes change nothing here, so only read-only depth
   * can rebind the targets.
   */
  @impl.adapted
  ApplyReadOnlyDepth()
  {
    if (this._readOnlyDepth === this._isDepthReadOnly) return;

    this._isDepthReadOnly = this._readOnlyDepth;
    this._SetRtDsToDevice(MAX_RENDER_TARGET);
  }

  /**
   * Everything a draw needs set that the setters only recorded
   * (`:1869-1923`): the vertex layout's plan for the bound vertex shader, and
   * the dirty blend, depth-stencil and rasterizer states. dx11 also switches
   * the topology to patches for a hull shader; WebGL2 has none.
   *
   * @returns {boolean} Whether the draw can proceed.
   */
  @impl.adapted
  ApplyShadowRenderStates()
  {
    if (!this._isValid) return false;

    const program = this._shaderProgram;
    const layout = this._vertexLayout;

    if (layout && layout.IsValid())
    {
      // dx11 reads the program's vertex shader as a friend (`m_program->m_shaders.vertexShader`).
      const vertexShader = program ? program._vertexShader : null;
      if (!vertexShader) return false;
      if (Failed(layout.SetLayout(vertexShader, this))) return false;
    }

    return this.ApplyBlendState() && this.ApplyDepthStencilState() && this.ApplyRasterizerState();
  }

  /**
   * Forgets every cached state, so the next draw sets all of them
   * (`:2268-2284`).
   */
  ResetCapturePlayback()
  {
    this._ResetRenderStates();
  }

  /** dx11's defaults (`:42-82`) and an unknown value for every state (`:872-874`). */
  _ResetRenderStates()
  {
    this._allRenderStates = new Uint32Array(RenderState.RS_MAX_STATE).fill(0xffffffff);
    this._allRenderStates[RenderState.RS_SRGBWRITEENABLE] = 0;
    this._blend = { ...DEFAULT_BLEND };
    this._depthStencilState = { ...DEFAULT_DEPTH_STENCIL };
    this._rasterizer = { ...DEFAULT_RASTERIZER };
    this._srgbWrite = false;
    this._dirty = { blend: true, depthStencil: true, rasterizer: true };
  }

  /**
   * A D3D11 blend factor as WebGL2's, or null for one it lacks. The two
   * second-source factors need `WEBGL_blend_func_extended`.
   */
  _BlendFactor(factor)
  {
    const gl = this._gl;
    switch (factor)
    {
      case 1: return gl.ZERO;
      case 2: return gl.ONE;
      case 3: return gl.SRC_COLOR;
      case 4: return gl.ONE_MINUS_SRC_COLOR;
      case 5: return gl.SRC_ALPHA;
      case 6: return gl.ONE_MINUS_SRC_ALPHA;
      case 7: return gl.DST_ALPHA;
      case 8: return gl.ONE_MINUS_DST_ALPHA;
      case 9: return gl.DST_COLOR;
      case 10: return gl.ONE_MINUS_DST_COLOR;
      case 11: return gl.SRC_ALPHA_SATURATE;
      case 14: return gl.CONSTANT_COLOR;
      case 15: return gl.ONE_MINUS_CONSTANT_COLOR;
      default:
      {
        const extended = gl.getExtension("WEBGL_blend_func_extended");
        if (!extended) return null;
        return { 16: extended.SRC1_COLOR_WEBGL, 17: extended.ONE_MINUS_SRC1_COLOR_WEBGL, 18: extended.SRC1_ALPHA_WEBGL, 19: extended.ONE_MINUS_SRC1_ALPHA_WEBGL }[factor] ?? null;
      }
    }
  }

  // DRAWS (`Tr2RenderContextDx11.cpp:971-1148`): apply the recorded states,
  // then the bindings, then draw.

  /**
   * Draws indexed and instanced, dx11's five-argument overload (`:1017-1037`).
   *
   * @param {number} indexCountPerInstance Indices per instance.
   * @param {number} instanceCount Instances.
   * @param {number} [startIndexLocation] First index.
   * @param {number} [baseVertexLocation] Added to every index.
   * @param {number} [startInstanceLocation] First instance.
   * @returns {number} An `ALResult` value.
   */
  DrawIndexedInstanced(indexCountPerInstance, instanceCount, startIndexLocation = 0, baseVertexLocation = 0, startInstanceLocation = 0)
  {
    return this._DrawIndexed(indexCountPerInstance, instanceCount, startIndexLocation, baseVertexLocation, startInstanceLocation);
  }

  /**
   * Draws instanced without indices (`:1039-1059`).
   *
   * @param {number} vertexCountPerInstance Vertices per instance.
   * @param {number} instanceCount Instances.
   * @param {number} [startVertexLocation] First vertex.
   * @param {number} [startInstanceLocation] First instance.
   * @returns {number} An `ALResult` value.
   */
  DrawInstanced(vertexCountPerInstance, instanceCount, startVertexLocation = 0, startInstanceLocation = 0)
  {
    if (!this.ApplyShadowRenderStates()) return ALResult.E_FAIL;
    this.ApplyReadOnlyDepth();

    const mode = this._PrimitiveMode();
    if (mode === null || !this._ApplyDrawBindings(0, startInstanceLocation)) return ALResult.E_FAIL;

    this._gl.drawArraysInstanced(mode, startVertexLocation, vertexCountPerInstance, instanceCount);
    this._drawCount++;
    return ALResult.S_OK;
  }

  /**
   * Draws indexed (`:971-992`). dx11's fourth argument is the base vertex,
   * whatever the stub calls it.
   *
   * @param {number} _numVertices Unused, as in dx11.
   * @param {number} startIndex First index.
   * @param {number} primitiveCount Primitives.
   * @param {number} [baseVertexLocation] Added to every index.
   * @returns {number} An `ALResult` value.
   */
  DrawIndexedPrimitive(_numVertices, startIndex, primitiveCount, baseVertexLocation = 0)
  {
    return this._DrawIndexed(this.ComputeVertexCount(primitiveCount), 1, startIndex, baseVertexLocation, 0);
  }

  /**
   * Draws without indices (`:1095-1112`).
   *
   * @param {number} startVertex First vertex.
   * @param {number} primitiveCount Primitives.
   * @returns {number} An `ALResult` value.
   */
  DrawPrimitive(startVertex, primitiveCount)
  {
    return this.DrawInstanced(this.ComputeVertexCount(primitiveCount), 1, startVertex, 0);
  }

  /**
   * Draws indexed from caller memory, through the shared helper (`:1122-1148`).
   *
   * @returns {number} An `ALResult` value.
   */
  DrawIndexedPrimitiveUP(numVertices, primitiveCount, indexData, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return this._drawUP.DrawIndexedPrimitiveUP(this._topology, numVertices, primitiveCount, indexData, vertexStreamZeroData, vertexStreamZeroStride, this);
  }

  /**
   * Draws from caller memory, through the shared helper (`:1114-1120`).
   *
   * @returns {number} An `ALResult` value.
   */
  DrawPrimitiveUP(primitiveCount, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return this._drawUP.DrawPrimitiveUP(this._topology, primitiveCount, vertexStreamZeroData, vertexStreamZeroStride, this);
  }

  /**
   * Refused: WebGL2 has no indirect draw.
   *
   * @returns {number} `E_FAIL`.
   */
  @impl.adapted
  DrawIndexedInstancedIndirect(_params, _offset)
  {
    return ALResult.E_FAIL;
  }

  /**
   * Refused: WebGL2 has no indirect draw.
   *
   * @returns {number} `E_FAIL`.
   */
  @impl.adapted
  DrawInstancedIndirect(_params, _offset)
  {
    return ALResult.E_FAIL;
  }

  /** The indexed draw every indexed verb comes to. */
  _DrawIndexed(indexCount, instanceCount, startIndex, baseVertex, startInstance)
  {
    if (!this.ApplyShadowRenderStates()) return ALResult.E_FAIL;
    this.ApplyReadOnlyDepth();

    const gl = this._gl;
    const mode = this._PrimitiveMode();
    const indices = this._indexBuffer;
    if (mode === null || !indices || !indices.IsValid()) return ALResult.E_FAIL;
    if (!this._ApplyDrawBindings(baseVertex, startInstance)) return ALResult.E_FAIL;

    const stride = this._indexStride === 2 ? 2 : 4;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices.GetGpuResource());
    gl.drawElementsInstanced(mode, indexCount, stride === 2 ? gl.UNSIGNED_SHORT : gl.UNSIGNED_INT, startIndex * stride, instanceCount);
    this._drawCount++;
    return ALResult.S_OK;
  }

  /**
   * How many draws reached the device.
   *
   * @returns {number} The count.
   */
  GetDrawCount()
  {
    return this._drawCount;
  }

  /** @returns {number} Zero; clears are not counted on a device. */
  GetClearCount()
  {
    return 0;
  }

  /**
   * Refused until compute is lowered to fragment passes.
   *
   * @returns {number} `E_FAIL`.
   */
  RunComputeShader()
  {
    return ALResult.E_FAIL;
  }

  /** @returns {number} `E_FAIL`; see `RunComputeShader`. */
  RunComputeShaderIndirect()
  {
    return ALResult.E_FAIL;
  }

  /**
   * Copies a byte range between buffers (`:1532-1560`), with
   * `copyBufferSubData`.
   *
   * @param {object} destination The destination buffer.
   * @param {number} destinationOffset Byte offset into it.
   * @param {object} source The source buffer.
   * @param {number} sourceOffset Byte offset into it.
   * @param {number} length Bytes.
   * @returns {number} An `ALResult` value.
   */
  CopySubBuffer(destination, destinationOffset, source, sourceOffset, length)
  {
    if (!this.IsValid() || !destination || !source || !destination.IsValid() || !source.IsValid()) return ALResult.E_FAIL;

    const gl = this._gl;
    gl.bindBuffer(gl.COPY_READ_BUFFER, source.GetGpuResource());
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, destination.GetGpuResource());
    gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, sourceOffset, destinationOffset, length);
    return ALResult.S_OK;
  }

  /** Declared by dx11 and never defined there; dx12's is empty (`Tr2RenderContextDx12.h:159-161`). */
  static DestroyMainThreadRenderContext()
  {
  }

  // THE REST: dx11's answers, which are mostly nothing.

  /** dx11's is empty (`:2414-2420`). */
  RenderPassHint(..._attachments)
  {
  }

  /** The stub's counterpart of `RenderPassHint`; nothing to end. */
  EndRenderPassHint()
  {
  }

  /** A marker for a GPU debugger; WebGL2 has none to name. */
  AddGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker */
  PushGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker */
  PopGpuMarker()
  {
  }

  /** @returns {boolean} False (`Tr2PrimaryRenderContextDx11.cpp:859-862`). */
  SupportsBindlessTextures()
  {
    return false;
  }

  /** @returns {number} Zero; WebGL2 does not expose video memory. */
  GetTotalVideoMemory()
  {
    return 0;
  }

  /** @returns {number} `S_OK`: a residency hint with nothing to do here. */
  UseResources(_destination, _usage, _resources)
  {
    return ALResult.S_OK;
  }

  /** @returns {number} `S_OK`, as the stub answers. */
  UseAccelerationStructure(_tlas)
  {
    return ALResult.S_OK;
  }

  /** @returns {number} `E_FAIL`; WebGL2 has no ray tracing. */
  DispatchRays()
  {
    return ALResult.E_FAIL;
  }

  /** @returns {number} `E_FAIL`; WebGL2 reports context loss with no marker. */
  GetGpuStateMarker()
  {
    return ALResult.E_FAIL;
  }

  /** @returns {number} `E_FAIL`; see `GetGpuStateMarker`. */
  GetGpuPageFaultResource()
  {
    return ALResult.E_FAIL;
  }

  /** A profiler frame event; nothing records it here. */
  MarkFrameEvent(_frameEvent)
  {
  }

  /** @returns {number} `OK`, as the stub answers, creating nothing. */
  EnableUpscaling()
  {
    return UpscalingResult.OK;
  }

  /** @returns {null} None exists. */
  GetUpscalingContext()
  {
    return null;
  }

  /** @returns {null} None is created. */
  CreateUpscalingContext()
  {
    return null;
  }

  /** There are none to delete. */
  DeleteUpscalingContext()
  {
  }

  /** @returns {object} "No upscaling", as the stub answers. */
  GetUpscalingInfo()
  {
    return {
      displayWidth: 0,
      displayHeight: 0,
      renderWidth: 0,
      renderHeight: 0,
      technique: UpscalingTechnique.NONE,
      setting: UpscalingSetting.NATIVE,
      frameGeneration: false,
      temporal: false,
      hasSharpening: false,
      upscalingAmount: 1,
      jitterX: 0,
      jitterY: 0,
      mipLevelBias: 0
    };
  }

  /** @returns {Array} Empty. */
  GetSupportedUpscalingTechniques()
  {
    return [];
  }

  /** @returns {object} "No upscaling". */
  GetUpscalingSetup()
  {
    return { technique: UpscalingTechnique.NONE, setting: UpscalingSetting.NATIVE, frameGeneration: false, temporal: false };
  }

  /**
   * Releases what a lost device invalidates (`Tr2RenderContextDx11.cpp:2264-2266`
   * is empty); the bound targets are forgotten, as the stub forgets them.
   *
   * @returns {boolean} True.
   */
  ReleaseDeviceResources()
  {
    for (const bound of this._boundRenderTargets)
    {
      bound.texture = null;
      bound.slice = 0;
    }

    return true;
  }

  /**
   * Releases the context (`Tr2RenderContextDx11.cpp:820-889`,
   * `Tr2PrimaryRenderContextDx11.cpp:63-105`).
   *
   * @returns {boolean} True.
   */
  Destroy()
  {
    const gl = this._gl;

    if (gl && this._isValid)
    {
      for (const fence of this._frameFences) if (fence.sync) gl.deleteSync(fence.sync);
      if (this._framebuffer) gl.deleteFramebuffer(this._framebuffer);
      if (this._presentFramebuffer) gl.deleteFramebuffer(this._presentFramebuffer);
    }

    this._defaultBackBuffer.Destroy();
    for (const shared of this._sharedConstantBuffers) if (shared && shared.constantBuffer) shared.constantBuffer.Destroy();
    this._sharedConstantBuffers = [];
    this._constantSlots = [];
    this._drawUP.Destroy();
    this._currentProgram = null;
    this._enabledAttributes = new Set();
    this._frameFences = [];
    this._framebuffer = null;
    this._presentFramebuffer = null;
    this._attached = new Map();
    this._boundRenderTargets = Array.from({ length: MAX_RENDER_TARGET }, () => ({ texture: null, slice: 0 }));
    this._renderTargetHighWaterMark = 0;
    this._renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);
    this._depthStencil = null;
    this._depthStencilStack = [];
    this._samplerStates.clear();
    this._shaderProgram = null;
    this._resourceSet = null;
    this._vertexLayout = null;
    this._streams = [];
    this._indexBuffer = null;
    this._recordingFrame = 0;
    this._renderedFrame = 0;
    this._isValid = false;

    return true;
  }
}

CjsSchema.define(Tr2RenderContextALWebgl2, { className: "Tr2RenderContextALWebgl2", carbon: "Tr2RenderContextAL" });
