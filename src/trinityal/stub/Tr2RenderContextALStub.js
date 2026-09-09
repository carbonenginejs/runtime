// Source: trinity/trinityal/stub/Tr2RenderContextStub.cpp
// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
//
// The GPU-free backend, ported from the one Carbon already ships.
//
// WHAT THIS IS FOR. A headless Trinity that still carries CORRECT DATA. That is
// the requirement, and it is not the same as "runs without a GPU": a backend
// that did nothing at all would satisfy the second and fail the first, because
// nothing downstream would hold real state to inspect.
//
// So this is NOT a no-op. Carbon's stub validates its arguments, keeps genuine
// render-target and depth-stencil stacks, and reports real sizes back. Only the
// draws are empty, because a draw is the one thing that needs a GPU. The
// bookkeeping is the feature.
//
// Carbon builds this as a real target (`TrinityAL_stub`, `trinity_stub`) with a
// real device behind it (`TriDeviceStub.cpp`), consumed by its VideoPlayer and
// by the AL's own tests. It is a supported configuration there, not a
// scaffold, which is why it is worth porting rather than inventing.
//
// TWO REFUSALS ARE CARBON'S, AND DELIBERATE. `ClearUav` and buffer-to-buffer
// copies return failure rather than pretending to succeed
// (`Tr2RenderContextStub.cpp:87-101`). A caller that needs them needs a real
// backend, and silently succeeding would hide that.
//
// What this does NOT cover, matching Carbon: ray tracing (stubbed to fail
// there too) and the five `Tr2Rt*AL` types, plus `Tr2RenderPassAL` and
// `Tr2StreamlineAL`, none of which the stub implements.


import { ALResult, Failed, Tr2BitmapDimensions, Tr2BufferALStub, Tr2CapsALStub, Tr2ConstantBufferALStub, Tr2ConstantUsageAL, Tr2ResourceSetALStub, Tr2SamplerStateALStub, Tr2ShaderALStub, Tr2ShaderProgramALStub, Tr2TextureALStub, Tr2VertexLayoutALStub } from "../../trinityal/index.js";
import { SamplerDescriptionKey } from "../Tr2SamplerDescription.js";
import { INVALID_UPSCALING_CONTEXT_ID, PixelFormat, ShaderType, Topology, Tr2GpuUsage, UpscalingResult, UpscalingSetting, UpscalingTechnique } from "../../global/consts/renderContext/index.js";


function fail(message)
{
  const error = new Error(`Tr2RenderContextALStub: ${message}`);
  error.code = "CJS_AL_STUB_INVALID";
  throw error;
}


/** Carbon's `MAX_RENDER_TARGET`; the bound-target array is fixed width. */
const MAX_RENDER_TARGET = 8;

/**
 * The process-wide primary render context.
 *
 * Carbon keeps this in a function-local static reached through a free function
 * (`Tr2RenderContextStub.cpp:21-30`), and the three static accessors below all
 * delegate to it. A module-level binding is the same thing in JavaScript: one
 * slot, private to this module, reachable only through those accessors.
 *
 * The constructor claims it - Carbon's does the same
 * (`Tr2RenderContextStub.cpp:34-40`) - so the FIRST context constructed becomes
 * primary until something sets another.
 */
let primaryRenderContext = null;


/**
 * Carbon's `Tr2BindlessResourcesAL` (`Tr2RenderContextStub.h:32-47`).
 *
 * A list of resources handed to `UseResources` so a backend can make them
 * resident together. Every method is empty in the stub, exactly as in Carbon:
 * residency is a device concern and there is no device here.
 *
 * Carbon overloads `Add` for a texture, a buffer and another resource list;
 * JavaScript dispatches on one method, which is the ordinary shape of an
 * overload set here and not a divergence in behaviour.
 */
export class Tr2BindlessResourcesAL
{
  /**
   * Adds a texture, a buffer, or the contents of another list.
   *
   * @param {object} _resource The resource to make resident.
   */
  Add(_resource)
  {
  }

  /** Empties the list. */
  Clear()
  {
  }
}


/**
 * A render context that keeps real state and draws nothing.
 *
 * Implements the AL verbs only. The Trinity-level verbs a render step also
 * reaches for - projection, view transform, wireframe and the
 * render-texture helpers - are NOT here, because Carbon does not put them on
 * the AL either: they belong to `Tr2Renderer`, `Tr2EffectStateManager` and the
 * `TriStep*` types themselves.
 */
export class Tr2RenderContextALStub
{
  /** m_isValid - set by CreateDevice, and required by every resource create. */
  #isValid = false;

  /** m_boundRenderTarget[MAX_RENDER_TARGET] */
  #boundRenderTargets = new Array(MAX_RENDER_TARGET).fill(null);

  #depthStencil = null;

  // ONE STACK PER SLOT, as Carbon has (`m_stackRT[MAX_RENDER_TARGET]`). A single
  // shared stack pops the most recent push regardless of slot, so pushing slot 0
  // then slot 1 and popping slot 0 restores the wrong surface.

  /** Carbon keeps real stacks and reports their depth (GetStackSizeRT/DS). */
  #renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);

  #depthStencilStack = [];

  #viewport = null;

  /** Every draw the context was asked for, so a headless caller can assert. */
  #drawCount = 0;


  /** Clears the context asked for; the bookkeeping IS the feature here. */
  #clearCount = 0;

  /** The render-state setup last applied, and the overrides it carried. */
  #renderStateSetup = null;

  #renderStateOverrides = null;

  // m_frameNumber. THIS IS NOT THE TRINITY FRAME COUNTER. Trinity's counts
  // frames the render path has begun (`Tr2Renderer::GetCurrentFrameCounter`);
  // this one counts frames the DEVICE has finished, and the gap between them is
  // what a ring buffer fences against. Carbon's stub keeps one number and
  // derives both: recording is the next frame, rendered is this one
  // (`Tr2RenderContextStub.cpp:453-456,500-503`), which is the same as saying
  // the stub always finishes a frame before the next begins.

  /** m_frameNumber - frames the device has finished. */
  #frameNumber = 0;

  /** m_caps - the context owns its capabilities, as Carbon's does. */
  #caps = new Tr2CapsALStub();

  /** m_defaultBackBuffer - a real texture, so size and format read back. */
  #defaultBackBuffer = new Tr2TextureALStub();

  /**
   * The shader stages this context binds constants for.
   *
   * `SHADER_TYPE_MASK` (`Tr2RenderContextStub.h:228-230`), a bit per stage.
   * The stub supports the two raster stages and no compute.
   */
  static SHADER_TYPE_MASK = (1 << ShaderType.VERTEX_SHADER) | (1 << ShaderType.PIXEL_SHADER);

  /**
   * Claims the primary slot, as Carbon's constructor does.
   *
   * `Tr2RenderContextStub.cpp:34-40` assigns `this` to the primary pointer
   * unconditionally, so the most recently constructed context is primary until
   * `SetPrimaryRenderContext` says otherwise.
   */
  constructor()
  {
    primaryRenderContext = this;
  }


  /**
   * Installs the primary render context.
   *
   * @param {Tr2RenderContextALStub|null} renderContext The context to install.
   */
  static SetPrimaryRenderContext(renderContext)
  {
    primaryRenderContext = renderContext;
  }


  /**
   * The primary render context, which must exist.
   *
   * Carbon asserts before dereferencing (`Tr2RenderContextStub.cpp:51-55`);
   * asking for the primary context when there is none is a caller defect, so
   * this throws rather than handing back a null nobody checks.
   *
   * @returns {Tr2RenderContextALStub} The primary render context.
   */
  static GetPrimaryRenderContext()
  {
    if (primaryRenderContext === null) fail("there is no primary render context");

    return primaryRenderContext;
  }


  /**
   * The primary render context, or null when none is installed.
   *
   * The pointer form Carbon offers beside the reference form, for callers that
   * are asking WHETHER there is one.
   *
   * @returns {Tr2RenderContextALStub|null} The primary render context.
   */
  static GetPrimaryRenderContextPointer()
  {
    return primaryRenderContext;
  }


  /**
   * Brings the context up. Carbon's `CreateDevice` sets validity and installs
   * the present parameters (`Tr2RenderContextStub.cpp:230-243`); every resource
   * `Create` then refuses unless `IsValid()`.
   *
   * THE ORDER MATTERS AND IS CARBON'S. Validity is set BEFORE the present
   * parameters, because creating the back buffer is a resource create and so
   * asks this same context whether it is valid yet.
   *
   * @param {object} [presentParameters] Present parameters, as the AL shapes
   * them: `{ mode: { width, height } }`.
   * @returns {boolean} True once valid.
   */
  CreateDevice(presentParameters = null)
  {
    this.#isValid = true;

    if (presentParameters) this.SetPresentParameters(presentParameters);

    return true;
  }

  /**
   * Creates a buffer of this backend's own kind.
   *
   * WHY THE CONTEXT IS THE FACTORY. In Carbon, `Tr2BufferAL` is a compile-time
   * platform typedef, so Trinity writes `Tr2BufferAL m_vertexBuffer` and the
   * dx11/dx12/metal/stub class is selected by the build. JavaScript has no such
   * seam, and a Trinity class that imports a concrete buffer picks a backend at
   * authoring time - which is exactly how `Tr2RingBuffer` ended up hard-wired
   * to the stub and reaching no device.
   *
   * Carbon's `Create` already takes a `Tr2PrimaryRenderContextAL&`
   * (`Tr2BufferAL.h:47`), so the context is where the platform is known.
   *
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} The created buffer, or null when Create refused.
   */
  CreateBuffer(description, initialData = null)
  {
    const buffer = new Tr2BufferALStub();

    if (Failed(buffer.Create(description, initialData, this))) return null;

    return buffer;
  }

  /**
   * Creates a constant buffer, this backend's kind of `Tr2ConstantBufferAL`.
   *
   * WITH NO SIZE, AN EMPTY ONE. Carbon default-constructs `Tr2ConstantBufferAL`
   * as a member and calls `Create` later, when the size is known
   * (`Tr2RenderUtils.h:35-67` `FillAndSetConstants` creates on first fill). A
   * Trinity class here cannot name the backend's class, so it asks the context
   * for the empty object and fills it exactly as Carbon does.
   *
   * @param {number} [size] Bytes; zero returns an empty, invalid buffer.
   * @param {number} [usage] A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} The buffer, or null when a sized Create refused.
   */
  CreateConstantBuffer(size = 0, usage = Tr2ConstantUsageAL.REUSABLE, initialData = null)
  {
    const buffer = new Tr2ConstantBufferALStub();

    if (size > 0 && Failed(buffer.Create(size, usage, initialData, this))) return null;

    return buffer;
  }

  /**
   * Creates a resource set, this backend's kind of `Tr2ResourceSetAL`.
   *
   * @param {object} description A `Tr2ResourceSetDescriptionAL`.
   * @param {object} program A `Tr2ShaderProgramAL`.
   * @returns {object|null} The set, or null when Create refused.
   */
  /**
   * Creates a texture, this backend's kind of `Tr2TextureAL`.
   *
   * @param {object} desc A `Tr2BitmapDimensions`.
   * @param {object} options `{ gpuUsage, cpuUsage, msaa, initialData }`.
   * @returns {object|null} The texture, or null when Create refused.
   */
  CreateTexture(desc, options)
  {
    const texture = new Tr2TextureALStub();

    if (Failed(texture.Create(desc, options ?? {}, this))) return null;

    return texture;
  }

  CreateResourceSet(description, program)
  {
    const resourceSet = new Tr2ResourceSetALStub();

    if (Failed(resourceSet.Create(description, program, this))) return null;

    return resourceSet;
  }

  /** Carbon's `Tr2SamplerStateALFactory`, keyed on the description. */
  #samplerStates = new Map();

  /**
   * The sampler state for a description, created once per distinct description.
   *
   * Carbon's `Tr2SamplerStateAL::Create` is a factory lookup on the primary
   * context (`Tr2SamplerStateAL.cpp:25-28`); the factory is in the SHARED
   * facade, so the stub dedupes too, and a headless resource set compares
   * states by identity exactly as a device one does.
   *
   * @param {object} description A `Tr2SamplerDescription`.
   * @returns {object|null} The shared state, or null for no description.
   */
  CreateSamplerState(description)
  {
    const key = SamplerDescriptionKey(description);

    if (key === null) return null;

    const existing = this.#samplerStates.get(key);

    if (existing) return existing;

    const state = new Tr2SamplerStateALStub();

    if (Failed(state.Create(description, this))) return null;

    this.#samplerStates.set(key, state);

    return state;
  }

  /**
   * Creates a vertex layout, this backend's kind of `Tr2VertexLayoutAL`.
   *
   * The same reason `CreateBuffer` exists. Carbon compiles ONE backend, so its
   * `Tr2VertexLayoutAL` is unambiguous and the effect state manager holds one
   * directly, calling `hvl.Create( definition, renderContext )` the first time
   * a declaration is applied (`Tr2EffectStateManager.cpp:899-906`). We ship
   * every backend at once, so the manager cannot name a layout class and has to
   * ask the context that knows which one it is.
   *
   * @param {object[]|object} definition The vertex element list or definition.
   * @returns {object|null} The created layout, or null when Create refused.
   */
  CreateVertexLayout(definition)
  {
    const layout = new Tr2VertexLayoutALStub();

    if (Failed(layout.Create(definition, this))) return null;

    return layout;
  }

  /**
   * Creates one shader stage, this backend's kind of `Tr2ShaderAL`.
   *
   * @param {number} stageType A Carbon `ShaderType`.
   * @param {ArrayBufferView|string} bytecode The stage's bytecode.
   * @param {object|null} signature The reflected signature.
   * @param {string} [shaderPath] A debug label.
   * @returns {object|null} The created shader, or null when Create refused.
   */
  CreateShader(stageType, bytecode, signature, shaderPath = "")
  {
    const shader = new Tr2ShaderALStub();

    if (Failed(shader.Create(stageType, bytecode, signature, shaderPath, this))) return null;

    return shader;
  }

  /**
   * Links created stages into this backend's kind of `Tr2ShaderProgramAL`.
   *
   * @param {object[]} shaders The stages to link.
   * @returns {object|null} The created program, or null when Create refused.
   */
  CreateShaderProgram(shaders)
  {
    const program = new Tr2ShaderProgramALStub();

    if (Failed(program.Create(shaders, this))) return null;

    return program;
  }

  /**
   * Creates the default back buffer and binds it to slot zero.
   *
   * Carbon's back buffer is `B8G8R8A8_UNORM` with one mip
   * (`Tr2RenderContextStub.cpp:249-260`), and the create is checked: a mode
   * with no size produces no back buffer rather than a zero-sized one.
   *
   * @param {object} presentParameters `{ mode: { width, height } }`.
   * @returns {number} An `ALResult` value.
   */
  SetPresentParameters(presentParameters)
  {
    const { mode } = presentParameters;

    const result = this.#defaultBackBuffer.Create(
      Tr2BitmapDimensions.Texture2D(mode.width, mode.height, 1, PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM),
      { gpuUsage: Tr2GpuUsage.RENDER_TARGET },
      this
    );

    if (Failed(result)) return result;

    this.SetRenderTarget(0, this.#defaultBackBuffer);

    return ALResult.S_OK;
  }

  /**
   * What this backend can do.
   *
   * Carbon's context owns its caps and hands out a reference
   * (`Tr2RenderContextStub.h:70`); a caller asks the context, never the caps
   * object directly, which is why this lives here rather than on a factory.
   *
   * @returns {Tr2CapsALStub} The capabilities.
   */
  GetCaps()
  {
    return this.#caps;
  }

  /**
   * The default back buffer.
   *
   * Carbon's name, and the distinction is real: `GetBackBuffer` belongs to
   * `Tr2SwapChainAL`, a different class with a different back buffer. This one
   * is the render context's own (`Tr2RenderContextStub.h:245-248`), and was
   * called `GetBackBuffer` here until 2026-09-09.
   *
   * @returns {Tr2TextureALStub} The back buffer, created or not.
   */
  GetDefaultBackBuffer()
  {
    return this.#defaultBackBuffer;
  }

  /**
   * The back buffer's pixel format.
   *
   * @returns {number} A `PixelFormat` value.
   */
  GetBackBufferFormat()
  {
    return this.#defaultBackBuffer.GetFormat();
  }

  /**
   * The size of a bound render target.
   *
   * Carbon separates the two failures deliberately: a slot past the end of the
   * array is `E_FAIL`, while an empty slot is `E_INVALIDCALL` - the caller
   * asked a reasonable question about a target that is not there.
   *
   * @param {number} [slot] Target slot.
   * @returns {{result: number, width: number, height: number}} The size.
   */
  GetRenderTargetSize(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return { result: ALResult.E_FAIL, width: 0, height: 0 };

    const target = this.#boundRenderTargets[slot];

    if (!target || !target.IsValid()) return { result: ALResult.E_INVALIDCALL, width: 0, height: 0 };

    return { result: ALResult.S_OK, width: target.GetWidth(), height: target.GetHeight() };
  }

  /**
   * Releases every bound target and the back buffer, as a device loss does.
   *
   * @returns {boolean} True.
   */
  ReleaseDeviceResources()
  {
    this.#boundRenderTargets.fill(null);
    this.#defaultBackBuffer.Destroy();
    this.#defaultBackBuffer = new Tr2TextureALStub();

    return true;
  }

  /** Carbon's Destroy clears the bound targets and drops validity (cpp:62-69). */
  Destroy()
  {
    this.#boundRenderTargets.fill(null);
    this.#depthStencil = null;
    for (const stack of this.#renderTargetStacks) stack.length = 0;
    this.#depthStencilStack.length = 0;
    this.#isValid = false;

    return true;
  }

  /** Whether a device was created. Resource creation depends on this. */
  IsValid()
  {
    return this.#isValid;
  }

  /**
   * Binds a render target to a slot, keeping it so a caller can read it back.
   *
   * @param {number} slot Target slot.
   * @param {object|null} renderTarget The target.
   * @returns {boolean} True.
   */
  SetRenderTarget(slot, renderTarget)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    this.#boundRenderTargets[slot] = renderTarget ?? null;

    return true;
  }

  /**
   * The target bound to a slot.
   *
   * @param {number} [slot] Target slot.
   * @returns {object|null} The bound target.
   */
  GetRenderTarget(slot = 0)
  {
    return this.#boundRenderTargets[slot] ?? null;
  }

  /**
   * Saves the target bound to a slot.
   *
   * CARBON'S PUSH TAKES ONLY A SLOT (`Tr2RenderContextDx11.cpp:2178-2188`). It
   * binds nothing: the "push this target" convenience belongs to the effect
   * state manager, which pushes and then sets. Folding that into the backend
   * here would put a Trinity-level verb in the abstraction layer.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(slot = 0)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    this.#renderTargetStacks[slot].push(this.#boundRenderTargets[slot] ?? null);

    return true;
  }

  /**
   * Restores the target saved for a slot, binding it again.
   *
   * @param {number} [slot] Target slot.
   * @returns {boolean} True.
   */
  PopRenderTarget(slot = 0)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= MAX_RENDER_TARGET)
    {
      fail(`render target slot ${slot} is outside 0..${MAX_RENDER_TARGET - 1}`);
    }

    const stack = this.#renderTargetStacks[slot];

    // CARBON GUARDS AND REPORTS, it does not crash: it asserts in debug and
    // returns E_FAIL in a shipping build (Tr2RenderContextStub.cpp:349-352).
    // Throwing here was invented, under a comment that claimed Carbon did not
    // guard at all - it does, on the very next line after the assert.
    if (!stack.length) return false;

    this.#boundRenderTargets[slot] = stack.pop();

    return true;
  }

  /**
   * Carbon's GetStackSizeRT, which is per slot.
   *
   * @param {number} [slot] Target slot.
   * @returns {number} Saved targets for that slot.
   */
  GetStackSizeRT(slot = 0)
  {
    return this.#renderTargetStacks[slot]?.length ?? 0;
  }

  /**
   * Binds the depth-stencil surface.
   *
   * @param {object|null} depthStencil The surface.
   * @returns {boolean} True.
   */
  SetDepthStencil(depthStencil)
  {
    this.#depthStencil = depthStencil ?? null;

    return true;
  }

  /** The bound depth-stencil surface. */
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /**
   * Saves the bound depth-stencil. Binds nothing; see `PushRenderTarget`.
   *
   * @returns {boolean} True.
   */
  PushDepthStencil()
  {
    this.#depthStencilStack.push(this.#depthStencil);

    return true;
  }

  /**
   * Restores the depth-stencil beneath the top of the stack.
   *
   * Reports an empty stack rather than throwing, as Carbon does
   * (`Tr2RenderContextStub.cpp:365-374`).
   */
  PopDepthStencil()
  {
    if (!this.#depthStencilStack.length) return false;

    this.#depthStencil = this.#depthStencilStack.pop();

    return true;
  }

  /** Carbon's GetStackSizeDS. */
  GetStackSizeDS()
  {
    return this.#depthStencilStack.length;
  }

  /**
   * Sets the viewport.
   *
   * @param {object} viewport Viewport rectangle and depth range.
   * @returns {boolean} True.
   */
  SetViewport(viewport)
  {
    this.#viewport = viewport ?? null;

    return true;
  }

  /** The current viewport. */
  GetViewport()
  {
    return this.#viewport;
  }

  /**
   * Clears the bound targets. A clear needs no GPU to be recorded as done.
   *
   * @param {object} _options Clear colour, depth, stencil and flags.
   * @returns {boolean} True.
   */
  Clear(_options)
  {
    this.#clearCount += 1;

    return true;
  }

  /** How many clears the context asked for. @returns {number} */
  GetClearCount()
  {
    return this.#clearCount;
  }

  /**
   * REFUSED, as Carbon refuses it (`Tr2RenderContextStub.cpp:87-95`).
   *
   * @returns {boolean} False, always.
   */
  ClearUav()
  {
    return false;
  }

  /**
   * REFUSED, as Carbon refuses `CopySubBuffer` (`cpp:97-101`).
   *
   * @returns {boolean} False, always.
   */
  CopyRenderTarget()
  {
    return false;
  }

  /**
   * A render target is valid once a device exists and something is bound.
   *
   * @param {object} renderTarget The target to test.
   * @returns {boolean} Whether it can be drawn to.
   */
  IsRenderTargetValid(renderTarget)
  {
    return this.#isValid && !!renderTarget;
  }

  /**
   * Resolving a multisampled target has no meaning without a GPU, and Carbon's
   * stub carries no multisample path, so this reports success and does nothing.
   *
   * @returns {boolean} True.
   */
  ResolveRenderTarget()
  {
    return true;
  }

  /** @see ResolveRenderTarget */
  GenerateMipMaps()
  {
    return true;
  }

  /**
   * Opens the device's scene. Carbon's stub accepts it and does nothing
   * (`cpp:267-270`).
   *
   * BeginScene/EndScene is where a deferred backend has its frame boundary:
   * DX11 uses the pair for nothing, and a command-encoder backend creates its
   * command buffer on the first and submits on the second.
   *
   * @returns {boolean} True.
   */
  BeginScene()
  {
    return true;
  }

  /** @see BeginScene */
  EndScene()
  {
    return true;
  }

  /**
   * Binds the vertex declaration a following draw reads its streams through.
   *
   * @param {object} _layout A `Tr2VertexLayoutAL`.
   * @returns {boolean} True.
   */
  SetVertexLayout(_layout)
  {
    return true;
  }

  /**
   * Binds one vertex stream.
   *
   * @param {number} _stream The stream index.
   * @param {object} _buffer A `Tr2BufferAL`.
   * @param {number} _offset Byte offset into the buffer.
   * @param {number} _stride Bytes per vertex.
   * @returns {boolean} True.
   */
  SetStreamSource(_stream, _buffer, _offset, _stride)
  {
    return true;
  }

  /**
   * Binds the index buffer.
   *
   * Carbon has a stride-less overload as well; the stride defaults here rather
   * than duplicating the method, because both bodies are the same.
   *
   * @param {object} _buffer A `Tr2BufferAL`.
   * @param {number} [_stride] Bytes per index.
   * @returns {boolean} True.
   */
  SetIndices(_buffer, _stride = 0)
  {
    return true;
  }

  /**
   * Sets the primitive topology for following draws.
   *
   * THE ONE ARGUMENT CARBON'S STUB ACTUALLY VALIDATES (`cpp:112-119`), and the
   * value is a `Topology`, not a D3D topology. `Tr2RenderBatch` carries this
   * vocabulary too as of 2026-09-05, so a caller reaching this from a batch
   * has nothing to translate - which is the point, since Carbon's
   * `SubmitGeometry` hands `m_topology` straight through
   * (`Tr2RenderContext.cpp:86`).
   *
   * @param {number} topology A `Topology` value.
   * @returns {boolean} Whether the topology is one the AL knows.
   */
  SetTopology(topology)
  {
    return topology < Topology.TOP_MAX_TOPOLOGY;
  }

  /**
   * Binds the vertex and pixel shader pair following draws run.
   *
   * @param {object} _shaderProgram A `Tr2ShaderProgramAL`.
   * @returns {boolean} True.
   */
  SetShaderProgram(_shaderProgram)
  {
    return true;
  }

  /**
   * Binds a prepared set of textures, samplers and buffers in one call.
   *
   * This is the verb the resource-set caching exists for: Carbon builds a
   * `Tr2ResourceSetAL` once and rebinds it per draw, rather than binding each
   * resource individually.
   *
   * @param {object} _resourceSet A `Tr2ResourceSetAL`.
   * @returns {boolean} True.
   */
  SetResourceSet(_resourceSet)
  {
    return true;
  }

  /**
   * Binds a constant buffer at one register for one shader stage.
   *
   * The register is the one `Tr2Renderer` names - b0 effect, b1/b2 per frame,
   * b3/b4 per object - so this is where that map meets the device.
   *
   * @param {object} _buffer A `Tr2ConstantBufferAL`.
   * @param {number} _constantType A `ShaderType`.
   * @param {number} _registerIndex The constant-buffer register.
   * @param {number} [_maxRegisterCount] Zero means the buffer's own size.
   * @returns {boolean} True.
   */
  SetConstants(_buffer, _constantType, _registerIndex, _maxRegisterCount = 0)
  {
    return true;
  }

  // A SECOND `SetRenderStates` STOOD HERE and was dead: JavaScript lets the
  // later declaration win silently, so this one - Carbon's packed id/value pair
  // signature - was shadowed by the interpreted-setup version further down and
  // could never be called. Removed 2026-09-09.
  //
  // The surviving one takes a `Tr2RenderStateSetup` and the manager's overrides
  // rather than Carbon's `(pairs, count)`, and that divergence is argued where
  // it is made, in `Tr2EffectStateManager.DoApplyRenderStates`: a registered
  // setup here is interpreted ONCE at registration, so there are no raw pairs
  // left to hand over.

  /**
   * REFUSED, as Carbon refuses it (`cpp:97-101`). A buffer-to-buffer copy needs
   * a real backend, and succeeding silently would hide that.
   *
   * @returns {boolean} False, always.
   */
  CopySubBuffer()
  {
    return false;
  }

  /**
   * Whether the bound depth buffer is readable while it is also bound.
   *
   * Carbon's stub keeps no state here and always answers false (`cpp:211-217`),
   * so a caller that needs read-only depth needs a real backend.
   *
   * @param {boolean} _enable Ignored.
   */
  SetReadOnlyDepth(_enable)
  {
  }

  /** @see SetReadOnlyDepth @returns {boolean} False, always. */
  GetReadOnlyDepth()
  {
    return false;
  }

  /**
   * DECLARES what the next pass does with its attachments at both edges.
   *
   * THIS IS THE VERB A COMMAND-ENCODER BACKEND IS BUILT AROUND, and it is
   * Carbon's, not an extension. DX11 and DX12 implement it as an empty function
   * (`Tr2RenderContextDx11.cpp:2414`); Metal folds it into the pass descriptor
   * it opens the next render encoder with. Trinity declares the actions from
   * `EveSpaceScene`, `Tr2PostProcessRenderer`, `Tr2Denoiser` and
   * `Tr2ReflectionProbe`, so the load and store actions are DECLARED by the
   * caller rather than inferred from what follows.
   *
   * Carbon's two overloads differ only in how many colour attachments they
   * carry, so they collapse into one variadic list here.
   *
   * @param {...object} _attachments `Tr2ColorAttachment`s then one
   *   `Tr2DepthAttachment`.
   */
  RenderPassHint(..._attachments)
  {
  }

  /**
   * Ends the declared pass, so anything after it opens a new one.
   *
   * @see RenderPassHint
   */
  EndRenderPassHint()
  {
  }

  /**
   * Names a point in the command stream for a GPU debugger.
   *
   * All three marker verbs are empty in Carbon's stub (`cpp:399-410`), and they
   * are ported because a backend that drops them silently loses every capture
   * label - which is only ever noticed while debugging something else.
   *
   * @param {string} _marker The label.
   */
  AddGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker @param {string} _marker The label. */
  PushGpuMarker(_marker)
  {
  }

  /** @see AddGpuMarker */
  PopGpuMarker()
  {
  }

  /**
   * Whether the backend can address textures without binding them.
   *
   * @returns {boolean} False; the stub has no bindless path.
   */
  SupportsBindlessTextures()
  {
    return false;
  }

  /**
   * Accepts a render state. Carbon's stub validates the topology enum and
   * accepts the rest (`cpp:112-119`); state values are not interpreted.
   *
   * @returns {boolean} True.
   */
  SetRenderState()
  {
    return true;
  }

  /**
   * Accepts a render-state setup with the state manager's overrides.
   *
   * Carbon's backends set each resolved pair on the device; the stub has no
   * device, so it holds the last setup and reports it - the bookkeeping being
   * the feature, as everywhere else here.
   *
   * @param {object} setup A `Tr2RenderStateSetup`.
   * @param {object} [overrides] The render-state overrides applied to it.
   * @returns {boolean} Whether a setup was supplied.
   */
  SetRenderStates(setup, overrides = null)
  {
    if (!setup) return false;

    this.#renderStateSetup = setup;
    this.#renderStateOverrides = overrides;

    return true;
  }

  /** The setup last applied, with the overrides it carried. */
  GetRenderStates()
  {
    return { setup: this.#renderStateSetup, overrides: this.#renderStateOverrides };
  }


  /**
   * Counts a compute dispatch without running one.
   *
   * @returns {boolean} True.
   */
  RunComputeShader()
  {
    return true;
  }

  /** @see RunComputeShader */
  RunComputeShaderIndirect()
  {
    return true;
  }

  /**
   * Counts a draw. Carbon's draws return success and do nothing
   * (`cpp:126-186`); the count is ours, so a headless test can assert that the
   * frame reached the point of drawing.
   *
   * @returns {boolean} True.
   */
  DrawIndexedInstanced(_indexCountPerInstance, _instanceCount, _startIndexLocation, _baseVertexLocation, _startInstanceLocation)
  {
    this.#drawCount += 1;

    return true;
  }

  /** @see DrawIndexedInstanced */
  DrawInstanced(_vertexCountPerInstance, _instanceCount, _startVertexLocation, _startInstanceLocation)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts an indexed draw with no instancing.
   *
   * @param {number} _numVertices Vertices the index range spans.
   * @param {number} _startIndex First index to read.
   * @param {number} _primitiveCount Primitives to draw.
   * @param {number} [_minimumIndex] Lowest index value present.
   * @returns {boolean} True.
   */
  DrawIndexedPrimitive(_numVertices, _startIndex, _primitiveCount, _minimumIndex = 0)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts a non-indexed draw with no instancing.
   *
   * @param {number} _startVertex First vertex to read.
   * @param {number} _primitiveCount Primitives to draw.
   * @returns {boolean} True.
   */
  DrawPrimitive(_startVertex, _primitiveCount)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts an indexed draw from caller-supplied memory.
   *
   * VALIDATES ITS POINTERS, which Carbon's stub does and does nowhere else
   * (`cpp:172-199`): a user-pointer draw with nothing behind the pointer is a
   * caller error the backend can catch without a GPU.
   *
   * Carbon's two overloads differ only in 16- versus 32-bit index data, which
   * is carried by the array's own type here.
   *
   * @param {number} _numVertices Vertices the index data spans.
   * @param {number} _primitiveCount Primitives to draw.
   * @param {ArrayBufferView} indexData The indices.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} _vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether both pointers were supplied.
   */
  DrawIndexedPrimitiveUP(_numVertices, _primitiveCount, indexData, vertexStreamZeroData, _vertexStreamZeroStride)
  {
    if (!indexData || !vertexStreamZeroData) return false;

    this.#drawCount += 1;

    return true;
  }

  /**
   * Counts a non-indexed draw from caller-supplied memory.
   *
   * Carbon does NOT validate here, unlike its indexed counterpart
   * (`cpp:165-171`), and the asymmetry is transcribed rather than tidied.
   *
   * @param {number} _primitiveCount Primitives to draw.
   * @param {ArrayBufferView} _vertexStreamZeroData The vertices.
   * @param {number} _vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} True.
   */
  DrawPrimitiveUP(_primitiveCount, _vertexStreamZeroData, _vertexStreamZeroStride)
  {
    this.#drawCount += 1;

    return true;
  }

  /**
   * REFUSED, as Carbon refuses both indirect draws (`Tr2RenderContextStub.h:161-169`).
   * Reading the draw arguments from a buffer needs a GPU.
   *
   * @returns {boolean} False, always.
   */
  DrawIndexedInstancedIndirect()
  {
    return false;
  }

  /** @see DrawIndexedInstancedIndirect @returns {boolean} False, always. */
  DrawInstancedIndirect()
  {
    return false;
  }

  /** How many draws this context was asked for. */
  GetDrawCount()
  {
    return this.#drawCount;
  }

  /**
   * Presenting has nothing to show, but the frame still completed.
   *
   * Carbon's stub advances its frame number here and nowhere else
   * (`Tr2RenderContextStub.cpp:277-281`), which makes Present the frame
   * boundary a fence can be measured against.
   *
   * NOT `PresentSwapChain`, which it was called here until 2026-09-09. That
   * name belongs to the render STEP (`TriStepPresentSwapChain`); presenting a
   * particular swap chain is `Tr2SwapChainAL::Present(renderContext)`, a
   * different call on a different class. This one takes no argument.
   *
   * @returns {boolean} True.
   */
  Present()
  {
    this.#frameNumber += 1;

    return true;
  }

  /**
   * The frame being recorded now.
   *
   * @returns {number} One past the finished frame.
   */
  GetRecordingFrameNumber()
  {
    return this.#frameNumber + 1;
  }

  /**
   * The last frame the device has finished.
   *
   * @returns {number} The finished frame.
   */
  GetRenderedFrameNumber()
  {
    return this.#frameNumber;
  }


  /**
   * Video memory the adapter reports.
   *
   * Carbon's stub returns 0 (`Tr2RenderContextStub.cpp:325-328`) - not
   * "unknown", but a device with no memory, which is what a stub has.
   *
   * @returns {number} Zero.
   */
  GetTotalVideoMemory()
  {
    return 0;
  }


  /**
   * Makes a resource list resident for a draw.
   *
   * @param {number} _destination Carbon's `Tr2UseResourceDestination`.
   * @param {number} _usage Carbon's `Tr2GpuUsage::Type`.
   * @param {Tr2BindlessResourcesAL} _resources The list to make resident.
   * @returns {boolean} True. Carbon accepts it (`cpp:438-441`) despite having
   *   no bindless path here, because the declaration is a residency hint
   *   rather than a bind.
   */
  UseResources(_destination, _usage, _resources)
  {
    return true;
  }


  /**
   * Binds a top-level acceleration structure for raytracing.
   *
   * @param {object} _tlas The acceleration structure.
   * @returns {boolean} True (`Tr2RenderContextStub.cpp:443-446`).
   */
  UseAccelerationStructure(_tlas)
  {
    return true;
  }


  /**
   * Dispatches a raytracing pipeline.
   *
   * @param {object} _pipeline The raytracing pipeline state.
   * @param {object} _shaderTable The shader table.
   * @param {string} _rayGenShader The ray generation shader name.
   * @param {number} _width Dispatch width.
   * @param {number} _height Dispatch height.
   * @param {number} _depth Dispatch depth.
   * @returns {boolean} False; the stub refuses (`Tr2RenderContextStub.h:180-183`).
   */
  DispatchRays(_pipeline, _shaderTable, _rayGenShader, _width, _height, _depth)
  {
    return false;
  }


  /**
   * The GPU's last known state, for a crash report.
   *
   * @returns {boolean} False; the stub has no state to report (`cpp:413-416`).
   */
  GetGpuStateMarker()
  {
    return false;
  }


  /**
   * The resource a GPU page fault touched, for a crash report.
   *
   * @returns {boolean} False; the stub cannot fault (`cpp:419-428`).
   */
  GetGpuPageFaultResource()
  {
    return false;
  }


  /**
   * Marks a point in the frame for a profiler.
   *
   * @param {number} _frameEvent Carbon's `Tr2RenderContextEnum::FrameEvent`.
   */
  MarkFrameEvent(_frameEvent)
  {
  }


  /**
   * Turns upscaling on.
   *
   * Carbon's stub answers `OK` (`Tr2RenderContextStub.cpp:459-462`) without
   * creating anything, so a caller that only enables upscaling sees success
   * and a caller that then asks for a context gets null. That pairing is
   * Carbon's, and both halves are ported as they are.
   *
   * @param {number} _technique A `Technique` value.
   * @param {number} _setting A `Setting` value.
   * @param {boolean} _frameGeneration Whether frame generation is wanted.
   * @param {number} _adapter The adapter index.
   * @returns {number} `Result.OK`.
   */
  EnableUpscaling(_technique, _setting, _frameGeneration, _adapter)
  {
    return UpscalingResult.OK;
  }


  /**
   * An existing upscaling context.
   *
   * @param {number} _contextId The context id.
   * @returns {null} Null; the stub keeps none (`cpp:464-467`).
   */
  GetUpscalingContext(_contextId)
  {
    return null;
  }


  /**
   * Creates an upscaling context, or reuses one.
   *
   * @param {object} _params Carbon's `UpscalingContextParams`.
   * @param {number} _existingContext A context id, or `INVALID_UPSCALING_CONTEXT_ID`.
   * @returns {null} Null; the stub creates none (`cpp:469-472`).
   */
  CreateUpscalingContext(_params, _existingContext = INVALID_UPSCALING_CONTEXT_ID)
  {
    return null;
  }


  /**
   * Destroys an upscaling context.
   *
   * @param {number} _contextId The context id.
   */
  DeleteUpscalingContext(_contextId)
  {
  }


  /**
   * What an upscaling context is doing.
   *
   * @param {number} _contextId The context id.
   * @returns {object} A default-constructed `UpscalingInfo` (`cpp:478-481`).
   */
  GetUpscalingInfo(_contextId)
  {
    // Every value is the one `UpscalingInfo::UpscalingInfo()` sets
    // (`src/upscaling/Tr2UpscalingAL.cpp:72-87`). Two are not zero.
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


  /**
   * The techniques an adapter supports.
   *
   * @param {number} _adapter The adapter index.
   * @returns {Array} Empty; the stub supports none (`cpp:491-494`).
   */
  GetSupportedUpscalingTechniques(_adapter)
  {
    return [];
  }


  /**
   * The upscaling currently set up.
   *
   * Carbon fills four out-parameters with "no upscaling": technique `NONE`,
   * setting `NATIVE`, neither frame generation nor temporal. JavaScript returns
   * the record instead of writing through references.
   *
   * A DONOR ANOMALY, REPRODUCED RATHER THAN TIDIED. The stub header declares
   * this on `Tr2RenderContextAL` (`Tr2RenderContextStub.h:277`) but the body is
   * defined on `Tr2PrimaryRenderContextAL` (`Tr2RenderContextStub.cpp:483-489`),
   * a class no non-DX backend declares - metal does the same thing with
   * `DeleteUpscalingContext` (`Tr2RenderContextMetal.mm:1464`). The upscaling
   * family appears to be live only in the DX backends. The values below are the
   * ones that body assigns; a port never silently fixes Carbon, so the quirk is
   * recorded here rather than resolved.
   *
   * @returns {object} The current upscaling setup.
   */
  GetUpscalingSetup()
  {
    return {
      technique: UpscalingTechnique.NONE,
      setting: UpscalingSetting.NATIVE,
      frameGeneration: false,
      temporal: false
    };
  }
}
