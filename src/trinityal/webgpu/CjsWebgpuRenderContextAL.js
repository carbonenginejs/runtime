// Source: trinity/trinityal/metal/Tr2RenderContextMetal.h
// Source: trinity/trinityal/metal/Tr2RenderContextMetal.mm
// Source: trinity/trinityal/stub/Tr2RenderContextStub.h
//
// The WebGPU backend behind Carbon's abstraction layer.
//
// WHAT THIS REPLACED. `Tr2RenderContext` used to RECORD what Trinity asked for
// into an intent list, which `framePlan.js` partitioned and `frameExecutor.js`
// encoded. That mechanism had no Carbon counterpart - Carbon gives the same job
// to the abstraction layer, and a backend is simply called - and it is now
// deleted, along with all three of those files (runtime `1e881dec`).
//
// THE DIVISION OF LABOUR IS CARBON'S. `Tr2RenderContextAL` (metal) holds the
// bound state and validates; `MetalWorkQueue` owns the command buffer and the
// encoder lifetime. `DrawIndexedInstanced` there checks its index buffer,
// converts a primitive count to a vertex count, then calls the work queue,
// whose draw opens a render encoder if none is current
// (`Tr2RenderContextMetal.mm:414-436`, `MetalWorkQueue.mm:2922-2945`). This
// keeps that split, so `CjsWebgpuWorkQueue` is the only thing that knows when a
// pass begins.
//
// DEVICE-FREE, AS CARBON'S STUB IS. Every verb here is argument validation,
// state, and delegation - none of it needs a GPU, and Carbon ships a whole
// backend (`TrinityAL_stub`) on that basis. The device arrives when the work
// queue's recorded transitions are applied to a real command encoder.
//
// SCOPE. The verbs `Tr2RenderContext` forwards to a backend: the geometry and
// draw path Carbon's `SubmitGeometry` touches (`Tr2RenderContext.cpp:83-103`),
// the render-target and depth-stencil families with their per-slot stacks, the
// viewport, clear, compute and present. That is what installing this backend
// requires, because the context prefers the AL per verb and a missing one is a
// crash rather than a fallback.
//
// NOT HERE YET: texture creation, copies and mip generation. Absent rather than
// faked. Buffer creation IS here (`CreateBuffer`), because a Trinity class that
// fills a buffer per frame cannot pick its own backend.
//
// WHAT CARBON'S METAL BACKEND HAS THAT THIS DOES NOT, AND WHY.
//
// The parity check compares this file against the donors it cites, which
// includes all of metal - so Metal-only members are reported against a backend
// that has no reason to carry them. These are decisions, not a queue:
//
// - `BeginParallelEncoding`/`EndParallelEncoding`/`ForkContext` spread batch
//   encoding across threads. There is one thread here, and `Tr2RenderContext`
//   already records the same omission for the same reason.
// - `BufferRewritten` notifies the context that a buffer allocation was RENAMED
//   under it. WebGPU cannot rename: `queue.writeBuffer` is ordered on the queue,
//   which gives the guarantee renaming buys without renaming, and
//   `CjsWebgpuBufferAL`'s head comment argues that at length.
// - `CheckDrawResources` does not validate, which the first version of this
//   note claimed. Carbon BINDS dummy resources into unfilled slots and installs
//   the vertex descriptor, on every draw (`Tr2RenderContextMetal.mm:524-541`).
//   WebGPU has the same requirement and will reject a draw with an unfilled
//   binding, so the browser is not doing this for us - it is the thing that
//   rejects us. WE DO IT, under Metal's other name: `EmitRenderEncoderState`
//   resolves the pipeline, fills unbound slots with dummies and binds the
//   layout, inside every draw verb. A NAME divergence, not an absence. (Until
//   2026-09-10 this note said the divergence held "because the dispatcher fills
//   bindings before the draw reaches here"; there is no dispatcher.)
// - `ReleaseLater` defers destruction until the GPU has finished reading. A
//   `GPUBuffer` stays alive as long as a submitted command references it, so
//   the deferral has nothing to defer.
// - `UseConstantBuffer` is Metal-only and makes a constant buffer resident on
//   the COMPUTE encoder (`:1658-1673`); its only callers build the ray-tracing
//   shader table. No compute dispatches here and there is no ray tracing, so
//   there is nothing to make resident. (This note used to lump it with
//   `UploadConstants` and claim "there is no arena", which stopped being true
//   the day the arena landed. `UploadConstants` IS ported, above.)
// - `GetMetalContext` and `GetMetalWorkQueue` are Metal's native escape
//   hatches. Ours are `GetWebgpu` and `GetWorkQueue` - Carbon names these per
//   backend too, so a WebGPU spelling is the faithful thing, not a divergence.

import { PixelFormat, ShaderType, Topology, Tr2LoadAction, Tr2StoreAction, UpscalingResult, UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import { Tr2ColorAttachment, Tr2ConstantUsageAL, Tr2DepthAttachment, Tr2VertexLayoutALStub, resolveBindingPlan } from "#trinityal";
import { ALResult, Failed, Tr2DrawUPHelper } from "#trinityal";
import { CjsWebgpuWorkQueue, EncoderType } from "./core/workQueue.js";
import { CjsWebgpuBufferAL } from "./CjsWebgpuBufferAL.js";
import { CjsWebgpuConstantBufferAL } from "./CjsWebgpuConstantBufferAL.js";
import { CjsWebgpuSamplerStateAL } from "./CjsWebgpuSamplerStateAL.js";
import { CjsWebgpuResourceSetAL } from "./CjsWebgpuResourceSetAL.js";
import { CjsWebgpuTextureAL } from "./CjsWebgpuTextureAL.js";
import { CjsWebgpuConstantArena } from "./core/constantArena.js";
import { CanonicalKey } from "./core/pipelineCache.js";
import { TOPOLOGIES } from "./core/topology.js";
import { SamplerDescriptionKey } from "../Tr2HalHelperStructures/Tr2SamplerDescription.js";
import { CjsWebgpuCapsAL } from "./CjsWebgpuCapsAL.js";
import { CjsWebgpuPsoDescription } from "./core/psoDescription.js";
import { CjsWebgpuShaderAL, CjsWebgpuShaderProgramAL, WEBGPU_ENTRY_POINT } from "./CjsWebgpuShaderAL.js";
import { WebgpuVertexBufferLayout } from "./core/vertexFormat.js";

/** WebGPU's index format for a Carbon index stride, or null for one it lacks. */
const INDEX_FORMAT = Object.freeze({ 2: "uint16", 4: "uint32" });

/** Bind groups kept before the cache is dropped and rebuilt. */
const MAX_CACHED_BIND_GROUPS = 1024;

/**
 * The `GPUBuffer` behind a bound stream, or null.
 *
 * A stream is whatever Trinity bound: a `Tr2BufferAL` answers; a geometry
 * descriptor - what a mesh batch carries today - does not, and the draw refuses.
 */
function DeviceBufferOf(bound)
{
  return bound && typeof bound.GetDeviceBuffer === "function" ? bound.GetDeviceBuffer() : null;
}


function fail(message)
{
  const error = new Error(`CjsWebgpuRenderContextAL: ${message}`);
  error.code = "CJS_WEBGPU_AL_INVALID";
  throw error;
}


/**
 * How many vertices a primitive count describes, per topology.
 *
 * CARBON'S DRAW VERBS TAKE PRIMITIVES AND ITS BACKENDS DRAW VERTICES, so every
 * one of them converts (`Tr2RenderContextMetal.mm:424`, `ComputeVertexCount`).
 * The conversion depends on the bound topology, which is why the AL holds it.
 */
const VERTICES_PER_PRIMITIVE = Object.freeze({
  [Topology.TOP_TRIANGLES]: count => count * 3,
  [Topology.TOP_TRIANGLE_STRIP]: count => count + 2,
  [Topology.TOP_TRIANGLE_FAN]: count => count + 2,
  [Topology.TOP_LINES]: count => count * 2,
  [Topology.TOP_LINE_STRIP]: count => count + 1,
  [Topology.TOP_POINTS]: count => count
});


/** Carbon's `MAX_RENDER_TARGET`; the bound-target array is fixed width. */
const MAX_RENDER_TARGET = 8;


/**
 * The Carbon pixel format behind each format a canvas can be configured with.
 *
 * SHORT ON PURPOSE. `GPUCanvasContext.configure` accepts only `bgra8unorm`,
 * `rgba8unorm` and their sRGB view formats, so this is the whole domain rather
 * than a partial table someone should extend later.
 */
const CANVAS_PIXEL_FORMAT = Object.freeze({
  "bgra8unorm": PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM,
  "bgra8unorm-srgb": PixelFormat.PIXEL_FORMAT_B8G8R8A8_UNORM_SRGB,
  "rgba8unorm": PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
  "rgba8unorm-srgb": PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM_SRGB
});


/**
 * The primary render context, Carbon's process-wide one.
 *
 * A MODULE-LEVEL BINDING, matching the stub, because Carbon's is a static on
 * the class and a JavaScript static field would be per-subclass. There is one
 * primary context per process in Carbon and there is one here.
 */
let primaryRenderContext = null;


/**
 * How many constant-buffer registers a stage has.
 *
 * Carbon's Metal backend fixes this at 20 (`METAL_CONST_BUFFER_COUNT`,
 * `MetalWorkQueue.h:39`) and rejects anything past it. Kept at Carbon's number
 * rather than a WebGPU limit: this bounds the REGISTER INDEX an effect declares,
 * which the shader compiler already fixed, not the bind-group slot count.
 */
const CONSTANT_BUFFER_REGISTERS = 20;


/** WebGPU behind the abstraction layer, holding a work queue as Metal does. */
export class CjsWebgpuRenderContextAL
{
  /** m_workQueue */
  _workQueue = new CjsWebgpuWorkQueue();

  /** m_isValid */
  _isValid = false;

  /** m_metalPrimitiveInfo - the topology following draws use. */
  _topology = Topology.TOP_TRIANGLES;

  /** m_metalIndexBuffer */
  _indexBuffer = null;

  _indexStride = 0;

  /** Vertex streams by slot, as SetStreamSource fills them. */
  _streams = [];

  /** m_vertexLayout */
  _vertexLayout = null;

  /** m_shaderProgram */
  _shaderProgram = null;

  /** m_resourceSet */
  _resourceSet = null;

  // Carbon's m_psoDescription half that exists so far: the authored setup and
  // the overrides it must be projected through, plus m_dirtyPso. The rest of
  // the description - shader program, vertex layout, topology, target formats -
  // is already held by the fields above and around; assembling and caching it
  // is the next piece of the immediate-draw route.

  _renderStateSetup = null;

  _renderStateOverrides = null;

  /** m_dirtyPso */
  _pipelineDirty = true;

  /**
   * m_drawUPHelper, DX12's name for it; DX11 calls the same thing m_drawUP.
   *
   * Owned rather than shared, as every backend owns its own: the ring's slots
   * are only safe because one context advances one cursor.
   */
  _drawUP = new Tr2DrawUPHelper();

  /**
   * m_psoDescription. Carbon's setters accumulate into one of these and mark it
   * dirty; every draw entry then calls `SetAllState`, which resolves a pipeline
   * from a cache keyed on the description's hash and binds it
   * (`Tr2RenderContextDx12.cpp:763-806`, `:810-880`).
   *
   * The class was written for this and wired to nothing until 2026-09-09. It is
   * filled here so the description is always current; RESOLVING it is the next
   * step, and needs the bound program to carry its effect package.
   */
  _psoDescription = new CjsWebgpuPsoDescription();

  /** m_boundRenderTarget[MAX_RENDER_TARGET] */
  _boundRenderTargets = new Array(MAX_RENDER_TARGET).fill(null);

  /** m_stackRT[MAX_RENDER_TARGET] - one stack per slot, as Carbon has. */
  _renderTargetStacks = Array.from({ length: MAX_RENDER_TARGET }, () => []);

  _depthStencil = null;

  _depthStencilStack = [];

  _viewport = null;

  /** Everything the work queue reported, for a caller that encodes it. */
  _transitions = [];

  // THE DEVICE HALF, AND WHY IT IS OPTIONAL. Composed, this backend draws:
  // `BeginScene` opens a command encoder, the work queue turns it into real
  // render passes, the draw verbs resolve a pipeline and bind groups from the
  // bound state and record into the live pass, and `EndScene` submits.
  // Uncomposed it validates verbs and records transitions - the stub backend
  // Carbon ships, and the thing every headless test relies on.
  //
  // IT IS HANDED VERBS, NEVER A BATCH. Until 2026-09-10 it also declared
  // `RenderBatches`, a Trinity method, and needed a resolver and a dispatcher
  // to turn the batches it was handed into bindings - the inversion this lane
  // was opened to undo. Trinity's own walk (`Tr2RenderContext.RenderBatchesInOrder`)
  // now calls the same verbs Carbon's does.

  _webgpu = null;

  _renderTarget = null;

  /** The frame's command encoder, between BeginScene and EndScene. */
  _commandEncoder = null;

  /** The acquired swap-chain frame, valid only within one scene. */
  _frame = null;

  /**
   * @param {object} [composition] The device half; omit for the stub backend.
   * @param {object} [composition.webgpu] A `CjsWebgpuDevice`.
   * @param {object} [composition.renderTarget] A `CjsWebgpuRenderTarget`.
   */
  constructor({ webgpu = null, renderTarget = null } = {})
  {
    if (webgpu && !renderTarget)
    {
      fail("a composed backend needs a render target as well as a device");
    }

    this._webgpu = webgpu;
    this._renderTarget = renderTarget;

    // The description starts in step with the state it describes. Carbon's
    // struct is constructed with the same defaults its context has, so a
    // description read before any setter runs describes what is actually bound
    // rather than an empty pipeline.
    this._psoDescription.topology = this._topology;
  }

  /** Whether this backend can actually draw. @returns {boolean} */
  IsComposed()
  {
    return this._webgpu !== null;
  }

  /**
   * The device this context draws through.
   *
   * Carbon's buffer and texture AL types take a `Tr2PrimaryRenderContextAL&` in
   * `Create` and reach the device through it (`Tr2BufferAL.h:47`), so the
   * context being the way to the device is Carbon's shape, not a shortcut.
   *
   * @returns {object|null} The `CjsWebgpuDevice`, or null before composition.
   */
  GetWebgpu()
  {
    return this._webgpu;
  }

  /**
   * Creates a device-backed buffer, this backend's kind of `Tr2BufferAL`.
   *
   * The stub context answers the same call with a `Tr2BufferALStub`, which is
   * how a Trinity class gets the right buffer for the running backend without
   * importing either - see the note on the stub's `CreateBuffer`.
   *
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} The created buffer, or null when Create refused.
   */
  CreateBuffer(description, initialData = null)
  {
    const buffer = new CjsWebgpuBufferAL();

    if (Failed(buffer.Create(description, initialData, this))) return null;

    return buffer;
  }

  /**
   * Creates a vertex layout, this backend's kind of `Tr2VertexLayoutAL`.
   *
   * IT HOLDS THE DEFINITION AND NOTHING DEVICE-SIDE, and that is not a stub
   * standing in for real work. WebGPU has no input-layout object: the vertex
   * buffer layouts are part of the render pipeline descriptor and are fixed at
   * pipeline creation, so a layout here can only be the definition a pipeline
   * will later be built from. That is why `Tr2VertexLayoutALStub` is the right
   * shape for this backend too rather than a placeholder for a WebGPU one.
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
   * Creates a constant buffer, this backend's kind of `Tr2ConstantBufferAL`.
   *
   * See the stub's note: with no size this returns an empty buffer for a
   * Trinity caller to `Create` later, as Carbon default-constructs its member.
   *
   * @param {number} [size] Bytes; zero returns an empty, invalid buffer.
   * @param {number} [usage] A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} The buffer, or null when a sized Create refused.
   */
  CreateConstantBuffer(size = 0, usage = Tr2ConstantUsageAL.REUSABLE, initialData = null)
  {
    const buffer = new CjsWebgpuConstantBufferAL();

    if (size > 0 && Failed(buffer.Create(size, usage, initialData, this))) return null;

    return buffer;
  }

  /**
   * Carbon's `Tr2SamplerStateALFactory` (`Tr2SamplerStateAL.h:41-43`), keyed on
   * the description: equal descriptions are one state.
   */
  _samplerStates = new Map();

  /**
   * The sampler state for a description, this backend's kind of
   * `Tr2SamplerStateAL`, created once per distinct description.
   *
   * Carbon's `Tr2SamplerStateAL::Create` IS this lookup
   * (`Tr2SamplerStateAL.cpp:25-28`): the primary context owns the factory and
   * hands back the shared object, which is why a resource set can compare
   * sampler states by identity.
   *
   * @param {object} description A `Tr2SamplerDescription`, either spelling.
   * @returns {object|null} The shared state, or null when Create refused.
   */
  CreateSamplerState(description)
  {
    const key = SamplerDescriptionKey(description);

    if (key === null) return null;

    const existing = this._samplerStates.get(key);

    if (existing) return existing;

    const state = new CjsWebgpuSamplerStateAL();

    if (Failed(state.Create(description, this))) return null;

    this._samplerStates.set(key, state);

    return state;
  }

  /**
   * Compiles one shader stage into a `GPUShaderModule`.
   *
   * THE FIRST CONSTRUCTION OF THESE CLASSES. `CjsWebgpuShaderAL` and
   * `CjsWebgpuShaderProgramAL` were written for the immediate-draw route and
   * nothing built one, because the state manager had no way to ask a backend
   * for a shader. This is that way.
   *
   * @param {number} stageType A Carbon `ShaderType`.
   * @param {ArrayBufferView|string} bytecode WGSL source, as this backend's
   *   bytecode; see the head comment on `CjsWebgpuShaderAL`.
   * @param {object|null} signature The reflected signature.
   * @param {string} [shaderPath] A debug label.
   * @returns {object|null} The created shader, or null when Create refused.
   */
  CreateShader(stageType, bytecode, signature, shaderPath = "")
  {
    const shader = new CjsWebgpuShaderAL();

    if (Failed(shader.Create(stageType, bytecode, signature, shaderPath, this))) return null;

    return shader;
  }

  /**
   * Links compiled stages into a program.
   *
   * @param {object[]} shaders The stages to link.
   * @returns {object|null} The created program, or null when Create refused.
   */
  CreateShaderProgram(shaders)
  {
    const program = new CjsWebgpuShaderProgramAL();

    if (Failed(program.Create(shaders, this))) return null;

    return program;
  }

  /**
   * How many batches this backend has encoded since it was created.
   *
   * A HARNESS NEEDS THIS AND A FRAME DOES NOT, which is why it counts batches
   * rather than reporting them: "did anything draw" is the question a test asks
   * when the alternative is trusting an empty canvas. Carbon answers it with
   * `CCP_STATS_INC( batchCount )` for the same reason.
   *
   * @returns {number} Batches encoded.
   */
  GetDrawnBatchCount()
  {
    return this._drawnBatchCount;
  }

  _drawnBatchCount = 0;

  /**
   * The work queue this backend records through.
   *
   * @returns {CjsWebgpuWorkQueue} The queue.
   */
  GetWorkQueue()
  {
    return this._workQueue;
  }

  /** m_caps, built once against whatever device this backend was composed with. */
  _caps = null;

  /**
   * What this backend can do.
   *
   * Carbon returns a reference to a member (`Tr2RenderContextMetal.mm:855-858`),
   * so the object is stable across calls; built lazily here because the device
   * is a constructor argument and the caps read its limits.
   *
   * @returns {CjsWebgpuCapsAL} The capabilities.
   */
  GetCaps()
  {
    this._caps ??= new CjsWebgpuCapsAL(this._webgpu);

    return this._caps;
  }

  /**
   * m_frameNumber. Carbon's Metal backend keeps this on the context behind it
   * (`Tr2RenderContextMetal.mm:1686-1694`); there is no such object here, so it
   * lives on the backend, exactly as the stub keeps it.
   */
  _frameNumber = 0;

  /**
   * The frame being recorded now.
   *
   * @returns {number} One past the last frame submitted.
   */
  GetRecordingFrameNumber()
  {
    return this._frameNumber + 1;
  }

  /**
   * The last frame handed to the device.
   *
   * SUBMISSION, NOT COMPLETION. `GPUQueue.submit` returns without waiting, and
   * the only handle on actual completion is `onSubmittedWorkDone`, a promise -
   * so a truthful "rendered" count would lag by an unbounded amount and could
   * not be read synchronously. This counts submitted frames, and a ring buffer
   * fencing against it is therefore protected by submission order rather than
   * by GPU completion.
   *
   * @returns {number} Frames submitted.
   */
  GetRenderedFrameNumber()
  {
    return this._frameNumber;
  }

  /**
   * Everything the work queue has reported since the last drain.
   *
   * @returns {object[]} Transitions and draws, in order.
   */
  DrainTransitions()
  {
    const transitions = this._transitions;

    this._transitions = [];

    return transitions;
  }

  /**
   * Creates the device. Carbon gates every resource create on this.
   *
   * @returns {boolean} True.
   */
  CreateDevice()
  {
    this._isValid = true;

    return true;
  }

  /** @returns {boolean} Whether a device exists. */
  IsValid()
  {
    return this._isValid;
  }

  /**
   * Opens the frame's command buffer.
   *
   * @returns {boolean} True.
   */
  BeginScene()
  {
    if (!this._isValid) fail("BeginScene before CreateDevice");

    if (this._webgpu)
    {
      // THE FRAME IS ACQUIRED LAZILY, AT THE FIRST PASS, AND NOT HERE. A canvas
      // texture is valid only within one synchronous turn: awaiting anything -
      // and preparation awaits - lets the browser swap the surface and destroy
      // it underneath. Acquiring in BeginScene therefore encoded into a dead
      // texture, and the only symptom was a submit warning and a blank canvas
      // while the draw itself reported success.
      this._frame = null;
      this._commandEncoder = this._webgpu.GetDevice().createCommandEncoder({ label: "CjsWebgpuRenderContextAL" });
      this._workQueue.SetCommandEncoder(this._commandEncoder, attachments => this._Descriptor(attachments));
    }

    this._Record(this._workQueue.BeginFrame());

    // The constant arena starts the frame empty (`MetalContext.mm:473`); the
    // previous frame's regions were consumed at its submit.
    this._constantArena?.Reset();

    // Carbon's BeginScene is exactly these two calls
    // (`Tr2RenderContextMetal.mm:860-864`). The reset is what stops a frame
    // inheriting the previous frame's bound targets.
    this.ResetRenderTargets();

    return true;
  }

  /**
   * The render-pass descriptor for a set of folded attachments.
   *
   * `attachments` IS NULL FOR AN UNHINTED PASS, which is most of them: Carbon
   * applies load and store actions only when a hint is pending and otherwise
   * leaves the backend's own defaults alone. Ours are the render target's.
   */
  _Descriptor(attachments)
  {
    // First pass of the scene acquires; later passes share the one view.
    this._frame ??= this._renderTarget.AcquireFrame();

    const clear = attachments?.colors?.[0];

    return this._renderTarget.CreateRenderPassDescriptor(this._frame, {
      label: `pass ${this._workQueue.GetPassCount()}`,
      clearColor: clear?.loadOp === "clear" ? clear.clearValue : undefined,
      clearDepth: attachments?.depth?.loadOp === "clear" ? attachments.depth.clearValue : undefined
    });
  }

  /**
   * Closes the frame's last pass and submits the command buffer.
   *
   * SYNCHRONOUS, AS CARBON'S IS. The first version awaited the dispatcher's
   * preparation here, because the backend had been handed batches it still had
   * to turn into pipelines. It is handed verbs now, every draw resolved inside
   * the verb that issued it, and there is nothing left to wait for: `finish()`
   * and `queue.submit()` are synchronous calls. A caller that awaits this
   * still may; awaiting a non-promise costs nothing.
   *
   * @returns {boolean} Whether the scene ended cleanly.
   */
  EndScene()
  {
    this._Record(this._workQueue.EndFrame());

    // UNBINDS WHAT THE FRAME BOUND, AS CARBON DOES
    // (`Tr2RenderContextMetal.mm:869-873`): vertex layout, resource set and
    // shader program go back to empty and the draw check is forced on. Without
    // it the next frame inherits the last frame's program and declaration, and
    // the early-return in `SetShaderProgram` then SKIPS the rebind because the
    // incoming program compares equal to the stale one - so the first draw of a
    // frame runs against state nobody in that frame asked for. Same shape as
    // the render-target inheritance `ResetRenderTargets` fixes at BeginScene.
    //
    // The pipeline description's program reference goes with it, because the
    // description and the field are two halves of one binding: leaving it set
    // while the field is null would resolve a pipeline for a program the
    // context does not consider bound. `_pipelineDirty` is this backend's
    // `m_needsDrawResourceCheck` - nothing is assumed resolved across frames.
    this._vertexLayout = null;
    this._resourceSet = null;
    this._shaderProgram = null;
    this._psoDescription.shaderProgram = null;
    this._pipelineDirty = true;

    this._frameNumber += 1;

    if (this._commandEncoder)
    {
      // EndFrame has already closed the last pass, so finishing here is safe.
      this._webgpu.Submit([ this._commandEncoder.finish() ]);
      this._workQueue.SetCommandEncoder(null);
      this._commandEncoder = null;
      this._frame = null;
    }

    return true;
  }


  /**
   * Declares what the next render pass does with its attachments.
   *
   * Carbon's two overloads differ only in how many colour attachments they
   * carry, so they collapse into one variadic list. The depth attachment is
   * always last.
   *
   * @param {...object} attachments `Tr2ColorAttachment`s then a `Tr2DepthAttachment`.
   */
  RenderPassHint(...attachments)
  {
    const depth = attachments.length ? attachments[attachments.length - 1] : null;
    const colors = attachments.slice(0, -1);

    this._workQueue.RenderPassHint(colors, depth);
  }

  /** Ends the declared pass, so following work opens a new one. */
  EndRenderPassHint()
  {
    this._Record(this._workQueue.EndRenderPassHint());
  }

  /**
   * Binds a colour target at one slot.
   *
   * RESETS THE VIEWPORT TO THE NEW TARGET, which Carbon does here in the
   * backend (`Tr2RenderContextMetal.mm:762-766`) whenever slot zero changes.
   * Leaving it alone is the defect where a 2048 shadow pass leaves the viewport
   * at 2048 for the rest of the frame.
   *
   * @param {number} slot The slot.
   * @param {object|null} renderTarget A `Tr2TextureAL`, or null to detach.
   * @param {number} [slice] The array slice or cube face.
   * @returns {boolean} True.
   */
  SetRenderTarget(slot, renderTarget, slice = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return false;

    this._Record(this._workQueue.SetRenderAttachments(renderTarget ?? null, slot, slice));

    // The attachment formats are part of the pipeline; DX12 dirties its PSO
    // here too (`Tr2RenderContextDx12.cpp:456`).
    if (this._boundRenderTargets[slot] !== (renderTarget ?? null)) this._pipelineDirty = true;

    this._boundRenderTargets[slot] = renderTarget ?? null;

    const primary = this._boundRenderTargets[0];

    if (slot === 0 && primary)
    {
      this.SetViewport({ x: 0, y: 0, width: primary.GetWidth(), height: primary.GetHeight() });
    }

    return true;
  }

  /**
   * The target bound at one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {object|null} The target.
   */
  GetRenderTarget(slot = 0)
  {
    return this._boundRenderTargets[slot] ?? null;
  }

  /**
   * Saves the target bound at one slot.
   *
   * ONE STACK PER SLOT, as Carbon has (`m_stackRT[MAX_RENDER_TARGET]`). A single
   * shared stack pops the most recent push whatever its slot, so pushing slot 0
   * then slot 1 and popping slot 0 restores the wrong surface.
   *
   * @param {number} [slot] The slot.
   * @returns {boolean} True.
   */
  PushRenderTarget(slot = 0)
  {
    if (slot >= MAX_RENDER_TARGET) return false;

    this._renderTargetStacks[slot].push(this._boundRenderTargets[slot] ?? null);

    return true;
  }

  /**
   * Restores the target saved for one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {boolean} Whether anything was saved.
   */
  PopRenderTarget(slot = 0)
  {
    const stack = this._renderTargetStacks[slot];

    if (!stack?.length) return false;

    this.SetRenderTarget(slot, stack.pop());

    return true;
  }

  /**
   * Depth of one slot's stack.
   *
   * @param {number} [slot] The slot.
   * @returns {number} The depth.
   */
  GetStackSizeRT(slot = 0)
  {
    return this._renderTargetStacks[slot]?.length ?? 0;
  }

  /**
   * Binds the depth-stencil target.
   *
   * @param {object|null} depthStencil A `Tr2TextureAL`, or null to detach.
   * @returns {boolean} True.
   */
  SetDepthStencil(depthStencil)
  {
    this._Record(this._workQueue.SetDepthAttachment(depthStencil ?? null));

    if (this._depthStencil !== (depthStencil ?? null)) this._pipelineDirty = true;

    this._depthStencil = depthStencil ?? null;

    return true;
  }

  /** @returns {object|null} The bound depth-stencil target. */
  GetDepthStencil()
  {
    return this._depthStencil;
  }

  /** Saves the bound depth-stencil target. @returns {boolean} True. */
  PushDepthStencil()
  {
    this._depthStencilStack.push(this._depthStencil);

    return true;
  }

  /** Restores the saved depth-stencil target. @returns {boolean} Whether one was saved. */
  PopDepthStencil()
  {
    if (!this._depthStencilStack.length) return false;

    this.SetDepthStencil(this._depthStencilStack.pop());

    return true;
  }

  /** @returns {number} Depth of the depth-stencil stack. */
  GetStackSizeDS()
  {
    return this._depthStencilStack.length;
  }

  /**
   * The size of the target at one slot.
   *
   * @param {number} [slot] The slot.
   * @returns {object} `{ result, width, height }`.
   */
  GetRenderTargetSize(slot = 0)
  {
    const target = this._boundRenderTargets[slot];

    if (!target) return { result: ALResult.E_INVALIDCALL, width: 0, height: 0 };

    return { result: ALResult.S_OK, width: target.GetWidth(), height: target.GetHeight() };
  }

  /**
   * Whether a target can be drawn to.
   *
   * @param {object} renderTarget The target.
   * @returns {boolean} Whether it is usable.
   */
  IsRenderTargetValid(renderTarget)
  {
    return this._isValid && !!renderTarget;
  }

  /**
   * Sets the viewport following draws use.
   *
   * @param {object} viewport `{ x, y, width, height }`.
   * @returns {boolean} True.
   */
  SetViewport(viewport)
  {
    this._viewport = viewport ? { ...viewport } : null;

    return true;
  }

  /** @returns {object|null} The current viewport. */
  GetViewport()
  {
    return this._viewport ? { ...this._viewport } : null;
  }

  /**
   * Clears the bound attachments.
   *
   * A CLEAR IS A LOAD OPERATION, not a command. WebGPU has no mid-pass clear,
   * so this ends the current pass and declares the next one's load actions -
   * which is the same thing `RenderPassHint` does, arrived at from the other
   * direction. Carbon's Metal backend folds a clear the same way.
   *
   * @param {object} [options] `{ color, depth, stencil }` values.
   * @returns {boolean} True.
   */
  Clear(options = {})
  {
    const attachments = this._workQueue.GetAttachments();
    const colors = attachments.colors
      .filter(Boolean)
      .map(() => new Tr2ColorAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, options.color ?? 0));
    const depth = attachments.depth
      ? new Tr2DepthAttachment(Tr2LoadAction.CLEAR, Tr2StoreAction.STORE, options.depth ?? 1)
      : null;

    this._workQueue.RenderPassHint(colors, depth);

    return true;
  }

  /**
   * Runs a compute dispatch, which may not happen inside a render pass.
   *
   * REFUSES, BECAUSE NOTHING DISPATCHES. This reported success and encoded no
   * command: it set the encoder type and returned true, and there is no
   * `dispatchWorkgroups` anywhere in this backend. A caller running a cull or
   * simulate pass was told it had happened, then read a buffer the GPU never
   * touched - with no validation error, because no command existed to be
   * rejected. That is the failure `ClearUav` below refuses to allow, one method
   * over, and it was allowed here for a day.
   *
   * Carbon's stub refuses too (`stub/Tr2RenderContextStub.h:171-174`, `E_FAIL`).
   *
   * @param {number} [_x] Workgroups.
   * @param {number} [_y] Workgroups.
   * @param {number} [_z] Workgroups.
   * @returns {boolean} False; nothing is dispatched.
   */
  RunComputeShader(_x = 1, _y = 1, _z = 1)
  {
    return false;
  }

  /**
   * Runs a compute dispatch whose group counts are read from a buffer.
   *
   * REFUSES; see `RunComputeShader`. This validated the buffer and then set the
   * compute encoder type, which is not a dispatch - the same false success, with
   * an argument check in front of it that made it look like more.
   *
   * Carbon's stub refuses too (`stub/Tr2RenderContextStub.h:175-178`).
   *
   * @param {object} _effect The compute effect to run.
   * @param {object} _indirectionBuffer A buffer holding the group counts.
   * @param {number} [_offsetForArgs] Byte offset to them.
   * @returns {boolean} False; nothing is dispatched.
   */
  RunComputeShaderIndirect(_effect, _indirectionBuffer, _offsetForArgs = 0)
  {
    return false;
  }

  /**
   * Clears an unordered-access resource.
   *
   * REFUSES RATHER THAN PRETENDS. Carbon's Metal backend clears through
   * `MetalWorkQueue::ClearBuffer`/`ClearTexture`
   * (`Tr2RenderContextMetal.mm:237-280`); this work queue has neither, and
   * WebGPU's own equivalents - `clearBuffer` on the command encoder, a
   * clear-load render pass for a texture - are not wired to it. Reporting
   * success would leave a caller reading stale contents it believes are zero,
   * which is exactly the failure a compute pass cannot detect. Carbon's stub
   * refuses the same way (`Tr2RenderContextALStub.ClearUav`).
   *
   * @param {object} _resource The buffer or texture to clear.
   * @param {number[]} _value The clear value, four components.
   * @param {boolean} [_clearWithFloat] Whether the value is float or integer.
   * @returns {boolean} False; the clear is not encoded.
   */
  ClearUav(_resource, _value, _clearWithFloat = false)
  {
    return false;
  }

  /**
   * Presents the frame.
   *
   * The browser presents a configured canvas after the submission that drew
   * into its current texture, so there is nothing to do beyond ending the
   * frame's work.
   *
   * AWAITS, because `EndScene` on this backend does. Returning its promise
   * unawaited would hand a caller expecting a boolean something truthy that is
   * not a result - the frame would still be encoding when presentation was
   * reported complete.
   *
   * @returns {Promise<boolean>} True once the frame is submitted.
   */
  async Present()
  {
    return this.EndScene();
  }

  /**
   * Sets the primitive topology following draws use.
   *
   * @param {number} topology A `Topology` value.
   * @returns {boolean} Whether the AL knows it.
   */
  SetTopology(topology)
  {
    if (topology >= Topology.TOP_MAX_TOPOLOGY || !VERTICES_PER_PRIMITIVE[topology]) return false;

    this._topology = topology;
    this._psoDescription.topology = topology;
    this._pipelineDirty = true;

    return true;
  }

  /**
   * Binds the vertex declaration.
   *
   * @param {object} layout A `Tr2VertexLayoutAL`.
   * @returns {boolean} True.
   */
  SetVertexLayout(layout)
  {
    if (this._vertexLayout === layout) return true;

    // DIRTIES THE PIPELINE, AS DX12'S DOES (`Tr2RenderContextDx12.cpp:321`).
    // The descriptor itself is built at the draw, not here: Metal's
    // SetVertexLayout only stores the layout (`Tr2RenderContextMetal.mm:894`)
    // and CheckDrawResources matches it against the BOUND PROGRAM's inputs at
    // draw time (`:524-541`), because the same declaration yields a different
    // descriptor under a shader that reads a different subset of it.
    this._vertexLayout = layout;
    this._pipelineDirty = true;

    return true;
  }

  /**
   * Binds one vertex stream.
   *
   * @param {number} stream The slot.
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} offset Byte offset.
   * @param {number} stride Bytes per vertex.
   * @returns {boolean} True.
   */
  SetStreamSource(stream, buffer, offset, stride)
  {
    // The stride is part of the pipeline on WebGPU - `arrayStride` lives in the
    // vertex buffer layout - exactly as it is on Metal, where each active
    // stream's stride feeds the vertex-descriptor hash
    // (`MetalWorkQueue.mm:1512-1531`). The buffer itself is not.
    if (this._streams[stream]?.stride !== stride) this._pipelineDirty = true;

    this._streams[stream] = { buffer, offset, stride };

    return true;
  }

  /**
   * Binds the index buffer.
   *
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} [stride] Bytes per index.
   * @returns {boolean} True.
   */
  SetIndices(buffer, stride = 0)
  {
    this._indexBuffer = buffer;
    this._indexStride = stride;

    return true;
  }

  /**
   * Binds the shader program following draws run.
   *
   * @param {object} shaderProgram A `Tr2ShaderProgramAL`.
   * @returns {boolean} True.
   */
  SetShaderProgram(shaderProgram)
  {
    if (this._shaderProgram === shaderProgram) return true;

    this._shaderProgram = shaderProgram;
    this._psoDescription.shaderProgram = shaderProgram;
    this._pipelineDirty = true;

    return true;
  }

  /**
   * Takes the render-state setup a pass authored, with the state manager's
   * overrides applied.
   *
   * Carbon's backends receive a resolved state-PAIR list here and set each pair
   * on the device (`Tr2EffectStateManager.cpp:753`). WebGPU has no per-state
   * setter - state is folded into a pipeline at creation - so the setup is held
   * and projected when a pipeline is resolved, which is also why the projection
   * needs the depth format only this backend knows.
   *
   * THE PROJECTION IS NOT DONE HERE. `Tr2RenderStateSetup.GetWebgpuRecipe`
   * already does it and the batch resolver already uses it; a second translator
   * would be the mistake this whole lane exists to undo. This stores the inputs
   * and marks the pipeline dirty, as Carbon's setters do.
   *
   * @param {object} setup A `Tr2RenderStateSetup`.
   * @param {object} [overrides] The state manager's render-state overrides.
   * @returns {boolean} Whether a setup was supplied.
   */
  SetRenderStates(setup, overrides = null)
  {
    if (!setup) return false;

    // Carbon's setters compare before dirtying, so a redundant apply costs
    // nothing (Tr2RenderContextDx12.cpp:315-338). The overrides are compared BY
    // VALUE: the state manager hands a fresh copy each apply, and comparing
    // references made every apply dirty the pipeline.
    if (this._renderStateSetup === setup && CanonicalKey(this._renderStateOverrides) === CanonicalKey(overrides)) return true;

    this._renderStateSetup = setup;
    this._renderStateOverrides = overrides;
    this._psoDescription.renderStateSetup = setup;
    this._psoDescription.renderStateOverrides = overrides;
    this._pipelineDirty = true;

    return true;
  }

  /**
   * m_renderStates - single states set by name rather than through a setup.
   *
   * A DIFFERENT AXIS FROM `overrides`, which is a flags object the PSO
   * description reads (`core/psoDescription.js:113-114`). These are Carbon's
   * raw `RenderState` values, which `TriStepSetRenderState` sets one at a time.
   */
  _renderStates = new Map();

  /**
   * Sets one render state.
   *
   * Carbon's Metal backend stores the value and applies it when the pipeline is
   * assembled, and says so in a comment above the method: "we'll remove the
   * actual setting here and just store the values in some state and we'll do a
   * wholesale setting of state in some combined function just before we draw"
   * (`Tr2RenderContextMetal.mm:925-928`). This stores.
   *
   * THE PSO RESOLVER DOES NOT READ THESE YET. `GetWebgpuRecipe` projects the
   * setup and the flags, and nothing consumes the single-state map, so a state
   * set this way is recorded and not yet honoured. Recorded rather than dropped,
   * because the resolver is where the projection belongs and adding a second
   * translator here is the mistake this file already carries a warning about.
   *
   * @param {number} state A `RenderState` value.
   * @param {number} value The value to set.
   * @returns {boolean} True.
   */
  SetRenderState(state, value)
  {
    const key = state >>> 0;

    if (this._renderStates.get(key) === (value >>> 0)) return true;

    this._renderStates.set(key, value >>> 0);
    this._pipelineDirty = true;

    return true;
  }

  /** The setup, overrides and single states a pipeline should be resolved from. */
  GetRenderStateInputs()
  {
    return {
      setup: this._renderStateSetup,
      overrides: this._renderStateOverrides,
      states: this._renderStates
    };
  }

  /** Whether the pipeline description changed since it was last resolved. */
  IsPipelineDirty()
  {
    return this._pipelineDirty;
  }

  /**
   * The pipeline description the setters have accumulated.
   *
   * Carbon's `m_psoDescription`, and `GetMissing()` on it answers the question
   * `GetPipelineState` answers by returning null: what this state does not yet
   * name. Reading it does not resolve anything.
   *
   * @returns {CjsWebgpuPsoDescription} The live description.
   */
  GetPsoDescription()
  {
    this._RefreshAttachmentFormats();

    return this._psoDescription;
  }

  /** The pipeline the last resolve produced, or null. */
  _pipeline = null;

  /**
   * Resolved pipelines by description key.
   *
   * Carbon keeps this on the DEVICE (`m_ownerDevice->m_pipelineStates`,
   * `Tr2PrimaryRenderContextDx12.h:319`; Metal's `GetCachedRenderPipelineState`)
   * so every context shares one. It lives here until `CjsWebgpuDevice` offers a
   * synchronous cache - its `CjsWebgpuPipelineCache` resolves asynchronously,
   * and a draw verb cannot await. Cleared with the device resources.
   */
  _pipelines = new Map();

  /**
   * Why the last `EmitRenderEncoderState` refused, or null when it did not.
   *
   * Carbon asserts at these points; a JS frame must not die at a draw, so the
   * reason is kept where a harness can read it instead.
   */
  m_pipelineFailure = null;

  /**
   * Resolves and binds the pipeline the bound state describes.
   *
   * METAL'S `EmitRenderPipelineState` (`MetalWorkQueue.mm:1595-1747`) AND
   * DX12'S `SetAllState` (`Tr2RenderContextDx12.cpp:810-878`): called from
   * inside every draw verb, keyed on the description's hash, creating on a miss
   * and otherwise reusing, and clearing the dirty flag once resolved
   * (`:870`). Pipeline creation is SYNCHRONOUS here as it is there -
   * `createRenderPipeline` returns immediately, and the first-use stall it can
   * carry is the same one `newRenderPipelineStateWithDescriptor` carries.
   *
   * The vertex half of the description is built here rather than by
   * `SetVertexLayout`, because it depends on three bound things at once: the
   * declaration, the program whose inputs select from it, and the stream
   * strides (`Tr2RenderContextMetal.mm:524-541`, `MetalWorkQueue.mm:1842-1863`).
   *
   * Uncomposed, there is no device and nothing to resolve; the verbs record as
   * the stub's do.
   *
   * @returns {boolean} Whether a pipeline is bound for the next draw.
   */
  EmitRenderPipelineState()
  {
    if (!this._webgpu) return true;

    if (!this._pipelineDirty && this._pipeline)
    {
      this._workQueue.SetRenderPipeline(this._pipeline);

      return true;
    }

    const description = this.GetPsoDescription();
    const program = description.shaderProgram;

    if (!program || typeof program.GetPipelineLayout !== "function")
    {
      return this._RefusePipeline("a program this backend linked");
    }

    const vertexBufferLayouts = this.BuildVertexBufferLayouts();

    if (typeof vertexBufferLayouts === "string") return this._RefusePipeline(vertexBufferLayouts);

    description.vertexBufferLayouts = vertexBufferLayouts;

    const missing = description.GetMissing();

    if (missing) return this._RefusePipeline(missing);

    if (!program.GetModuleFor(ShaderType.VERTEX_SHADER)) return this._RefusePipeline("a vertex stage");

    // An indexed strip needs its index format baked into the pipeline
    // (`primitive.stripIndexFormat`), so the bound index stride is part of the
    // identity for strips and nothing else.
    const topology = TOPOLOGIES[this._topology];
    const stripIndexFormat = topology && topology.endsWith("-strip") ? INDEX_FORMAT[this._indexStride] ?? null : null;
    let key;
    let recipe;

    // `GetWebgpuRecipe` refuses a state it cannot project - a non-solid fill,
    // depth state against no depth attachment - by THROWING. A draw verb is not
    // where a frame may die, so the refusal becomes this verb's reason.
    try
    {
      key = `${description.GetKey()}|strip:${stripIndexFormat ?? "-"}`;
      recipe = description.BuildRecipe();
    }
    catch (error)
    {
      return this._RefusePipeline(`a projectable state: ${error.message}`);
    }

    if (stripIndexFormat) recipe.primitive = { ...recipe.primitive, stripIndexFormat };

    let pipeline = this._pipelines.get(key) ?? null;
    const created = pipeline === null;

    if (created)
    {
      pipeline = this._CreateRenderPipeline(program, recipe);
      this._pipelines.set(key, pipeline);
    }

    this._pipeline = pipeline;
    this._pipelineDirty = false;
    this.m_pipelineFailure = null;
    this._Record([ { type: "pipeline", key, created } ]);
    this._workQueue.SetRenderPipeline(pipeline);

    return true;
  }

  /**
   * Binds everything a draw needs on the encoder: pipeline, then buffers.
   *
   * Metal's `EmitRenderEncoderState` (`MetalWorkQueue.mm:1750-1890`), which
   * the draw verbs call first and skip the draw when it fails. Bindings are
   * deferred to here rather than set in `SetStreamSource`, as Metal defers
   * them (`:2570-2598` stores, `:2613-2690` binds).
   *
   * WHAT IT CANNOT YET HONOUR, IT REFUSES. A program whose layout declares
   * bind groups needs a resource set realised into `GPUBindGroup`s, and that
   * half is not ported; drawing without them is a validation error on the GPU,
   * so the draw is refused here and says why. A stream whose buffer is not a
   * device buffer - a mesh batch carries a geometry descriptor today - is
   * refused the same way.
   *
   * @param {boolean} indexed Whether the draw reads the bound index buffer.
   * @returns {boolean} Whether the encoder is ready to draw.
   */
  EmitRenderEncoderState(indexed)
  {
    if (!this._webgpu) return true;

    // A reason describes THIS attempt; one left from an earlier refusal would
    // outlive the draw that succeeded after it.
    this.m_pipelineFailure = null;

    if (!this.EmitRenderPipelineState()) return false;

    if (!this._EmitBindGroups()) return false;

    const layouts = this._psoDescription.vertexBufferLayouts;

    for (let slot = 0; slot < layouts.length; slot += 1)
    {
      if (!layouts[slot]) continue;

      const stream = this._streams[slot];
      const buffer = DeviceBufferOf(stream?.buffer);

      if (!buffer) return this._RefusePipeline(`a device buffer on vertex stream ${slot}`);

      this._workQueue.SetVertexBuffer(slot, buffer, stream.offset ?? 0);
    }

    if (indexed)
    {
      const format = INDEX_FORMAT[this._indexStride] ?? null;
      const buffer = DeviceBufferOf(this._indexBuffer);

      if (!format) return this._RefusePipeline(`an index format for a ${this._indexStride}-byte stride`);
      if (!buffer) return this._RefusePipeline("a device buffer for the indices");

      this._workQueue.SetIndexBuffer(buffer, format, 0);
    }

    return true;
  }

  /**
   * The vertex buffer layouts the bound declaration, program and strides
   * describe, one per stream slot.
   *
   * Metal's `Tr2VertexLayoutAL::SetVertexLayout` (`Tr2VertexLayoutALMetal.mm:205-245`):
   * match the program's pipeline inputs against the declaration's items, and
   * stamp each active stream's stride. An input the declaration lacks gets no
   * attribute - Metal points it at a dummy stream - and a stream no input
   * reads gets no layout.
   *
   * @returns {Array<object|null>|string} The layouts by slot, or what is
   *   missing when they cannot be built.
   */
  BuildVertexBufferLayouts()
  {
    const layout = this._vertexLayout;

    if (!layout) return [];

    const elements = layout.GetDefinition() ?? [];
    const inputs = this._shaderProgram.GetInputs();
    const plan = resolveBindingPlan(elements, inputs);
    const byStream = new Map();

    // AN INPUT THE DECLARATION LACKS IS A REFUSAL, NOT A HOLE. WebGPU requires
    // every vertex-stage `@location` to be fed, and `createRenderPipeline`
    // with a missing one yields an invalid pipeline WITHOUT throwing - which
    // would then be cached. Metal feeds such an input from a constant-step
    // dummy stream (`Tr2VertexLayoutALMetal.mm:155-159`); until that is
    // ported, the draw says which input it cannot feed.
    const missing = plan.entries.filter(entry => !entry.element);

    if (missing.length)
    {
      return `a vertex element for input ${missing.map(entry => `${entry.usage}:${entry.usageIndex}`).join(", ")}`;
    }

    for (const entry of plan.entries)
    {
      if (!entry.element) continue;

      const stream = entry.element.stream ?? 0;

      if (!byStream.has(stream)) byStream.set(stream, []);
      byStream.get(stream).push(entry);
    }

    if (!byStream.size) return [];

    const layouts = new Array(Math.max(...byStream.keys()) + 1).fill(null);

    for (const [ stream, entries ] of byStream)
    {
      const stride = this._streams[stream]?.stride;

      if (!stride) return `a stride for vertex stream ${stream}`;

      try
      {
        layouts[stream] = WebgpuVertexBufferLayout(stride, entries);
      }
      catch (error)
      {
        return `a vertex format for stream ${stream}: ${error.message}`;
      }
    }

    return layouts;
  }

  /**
   * Bind groups by `program | group | resource set | constant buffers`.
   *
   * DX12's descriptor tables live on the CONTEXT, per back buffer
   * (`Tr2RenderContextDx12.h:269`), and are committed at `SetAllState`
   * (`:875`); Metal binds per stage inside `EmitRenderEncoderState`
   * (`MetalWorkQueue.mm:2613-2690`). A WebGPU bind group is an immutable object
   * made of both the set's entries and the bound constant buffers, so it is
   * made here, at the draw, and kept by the identities that produced it.
   */
  _bindGroups = new Map();

  /**
   * Builds or reuses one bind group per program group and names them for the
   * draw.
   *
   * The program's uniform slots read the constant buffers `SetConstants` bound
   * at that stage and register - Carbon's parallel road for CBs - uploading
   * each buffer's shadow if it changed, which is where Carbon's token is
   * consumed. Every other slot reads the resource set; with no set bound, or a
   * set made for another program, the slots take dummies, which is Metal's
   * `SetDummyResources` (`Tr2RenderContextMetal.mm:527-530`).
   *
   * @returns {boolean} Whether every group could be built.
   */
  _EmitBindGroups()
  {
    const program = this._shaderProgram;
    const layouts = program.GetBindGroupLayouts();

    if (!layouts.length) return true;

    const set = this._resourceSet;
    const entries = set && typeof set.GetEntries === "function" && set.GetProgram() === program ? set.GetEntries() : null;
    const setId = entries ? set.m_id : 0;
    const bindings = program.GetBindings();
    const device = this._webgpu.GetDevice();

    for (let group = 0; group < layouts.length; group += 1)
    {
      const keyParts = [ program.GetIdentity(), group, setId ];
      const resolved = [];
      const dynamicOffsets = [];

      for (const binding of bindings)
      {
        if (binding.group !== group) continue;

        let resource;

        if (binding.buffer && binding.buffer.type === "uniform")
        {
          // METAL'S `SetConstants` + `UploadConstants` (`MetalWorkQueue.mm:2396-2439`):
          // the shadow is copied into the frame's arena if its token is stale,
          // and the bind is the PAGE with the region's offset as a dynamic
          // offset - `setVertexBufferOffset:` (`:2656-2659`). The bind group
          // therefore keys on the page and not on the buffer: two objects
          // drawn through one program share one bind group and differ only in
          // their offsets, which is the whole economy of the arena.
          const size = binding.buffer.minBindingSize ?? 16;
          const constantBuffer = this._ConstantBufferFor(binding);

          if (constantBuffer)
          {
            const region = this.UploadConstants(constantBuffer, size);

            resource = { buffer: this._Arena().GetPage(region.page), offset: 0, size };
            dynamicOffsets.push(region.offset);
            keyParts.push(`p${region.page}`);
          }
          else
          {
            // DX12 substitutes a null CB for an unbound root CBV
            // (`DescriptorStateCacheDx12.cpp:234-242`).
            resource = { buffer: this.GetNullBuffer(size, "UNIFORM"), offset: 0, size };
            dynamicOffsets.push(0);
            keyParts.push("null");
          }
        }
        else
        {
          resource = entries ? entries.get(`${group}:${binding.binding}`) ?? null : null;
          resource ??= this._DummyFor(binding);
        }

        resolved.push({ binding: binding.binding, resource });
      }

      const key = keyParts.join("|");
      let bindGroup = this._bindGroups.get(key) ?? null;

      if (!bindGroup)
      {
        // Identities are monotonic, so a key never comes back once its set or
        // buffer is gone; without a bound the map grows with every rebuild.
        // DX12's descriptor cache is per back buffer and rebuilt each frame
        // (`Tr2RenderContextDx12.h:269`); dropping everything and rebuilding
        // what the next draws need is the same cost profile.
        if (this._bindGroups.size >= MAX_CACHED_BIND_GROUPS) this._bindGroups.clear();

        bindGroup = device.createBindGroup({
          label: `Tr2RenderContextAL ${program.GetIdentity()} group${group}`,
          layout: layouts[group],
          entries: resolved
        });
        this._bindGroups.set(key, bindGroup);
      }

      this._workQueue.SetBindGroup(group, bindGroup, dynamicOffsets);
    }

    return true;
  }

  /** Carbon's `ConstantBufferAllocator`, owned by the context (`MetalContext.h:104`). */
  _constantArena = null;

  /** The frame's constant arena, made on first use. */
  _Arena()
  {
    this._constantArena ??= new CjsWebgpuConstantArena(this._webgpu);

    return this._constantArena;
  }

  /**
   * Copies constants into this frame's arena and says where they landed.
   *
   * CARBON'S TWO OVERLOADS, in one method as JavaScript spells them
   * (`Tr2RenderContextMetal.mm:679-697`, `Tr2RenderContextDx12.cpp:538-548`):
   *
   * - given BYTES, a fresh region every call - Carbon constructs a zeroed
   *   token each time, so nothing is reused;
   * - given a `Tr2ConstantBufferAL`, the buffer's OWN token, so a buffer bound
   *   twice in a frame without a Lock between keeps one region. Carbon reaches
   *   straight into the impl for it (`buffer.m_buffer->m_token`), which is why
   *   ours is public.
   *
   * Carbon returns a `uint64_t` packing Metal's page and offset together; the
   * region object is that pair unpacked, which is what a bind group needs.
   *
   * @param {object|ArrayBufferView} source A constant buffer, or the bytes.
   * @param {number} [size] Bytes the binding demands at least.
   * @returns {{page: number, offset: number, size: number}|null} The region,
   *   or null when there is nothing to upload - Carbon's `return 0`.
   */
  UploadConstants(source, size = 0)
  {
    if (!this._webgpu || !source) return null;

    const arena = this._Arena();

    if (ArrayBuffer.isView(source)) return arena.Allocate(source, Math.max(size, source.byteLength));

    if (!(source instanceof CjsWebgpuConstantBufferAL) || !source.IsValid()) return null;

    const token = source.m_token;
    const wanted = Math.max(size, source.m_shadowCopy.length);

    // Metal's `UploadConstants` (`MetalWorkQueue.mm:2426-2439`): a token from
    // this frame is left alone. The size test is ours - a layout may demand
    // more than an earlier binding reserved, and a short region is a
    // validation error rather than a wrong picture.
    if (token.frame !== this.GetRecordingFrameNumber() || token.size < wanted)
    {
      const region = arena.Allocate(source.m_shadowCopy, wanted);

      token.frame = this.GetRecordingFrameNumber();
      token.page = region.page;
      token.offset = region.offset;
      token.size = region.size;
    }

    return token;
  }

  /**
   * NOT PORTED, and Metal-only in Carbon. `UseConstantBuffer` makes a constant
   * buffer resident on the COMPUTE encoder (`useResource:`,
   * `Tr2RenderContextMetal.mm:1658-1673`) and its only callers build the
   * ray-tracing shader table (`Tr2RtShaderTableALMetal.mm:61-68`). DX12 has no
   * such method. This backend dispatches no compute and has no ray tracing, so
   * there is nothing to make resident.
   */

  /** The constant buffer `SetConstants` bound for a uniform binding, by any visible stage. */
  _ConstantBufferFor(binding)
  {
    for (const [ bit, stage ] of [ [ 1, ShaderType.VERTEX_SHADER ], [ 2, ShaderType.PIXEL_SHADER ], [ 4, ShaderType.COMPUTE_SHADER ] ])
    {
      if ((binding.visibility & bit) === 0) continue;

      const buffer = this._constantBuffers.get(stage * CONSTANT_BUFFER_REGISTERS + binding.registerIndex) ?? null;

      // A buffer of another backend's kind - a stub made before this backend
      // was installed - has no shadow this arena can upload; it is skipped and
      // the slot takes the null buffer, which is DX12's answer to an unbound
      // CBV. Asked by TYPE, which is the question: Carbon has one constant
      // buffer class per compiled backend and cannot be handed another's.
      if (buffer instanceof CjsWebgpuConstantBufferAL && buffer.IsValid()) return buffer;
    }

    return null;
  }

  /** Metal's dummy for a slot no set filled. */
  _DummyFor(binding)
  {
    if (binding.sampler) return this.GetDummySampler();
    if (binding.texture) return this.GetDummyTexture(binding.texture.viewDimension ?? "2d");

    return { buffer: this.GetNullBuffer(binding.buffer?.minBindingSize ?? 16, "STORAGE") };
  }

  /** The dummies, created once each: `MetalContext::m_dummyTexture[]`, `m_dummySampler`. */
  _dummies = { textures: new Map(), sampler: null, buffers: new Map() };

  /**
   * A 1x1 texture view of the given dimension, for a slot nothing filled.
   *
   * `MetalContext::GetDummyTexture( MTLTextureType )` (`MetalContext.mm:306-320`):
   * one per texture type, because a sampler of the wrong dimension is a
   * validation error rather than a black texel.
   *
   * @param {string} [viewDimension] A `GPUTextureViewDimension`.
   * @returns {object} A `GPUTextureView`.
   */
  GetDummyTexture(viewDimension = "2d")
  {
    const existing = this._dummies.textures.get(viewDimension);

    if (existing) return existing;

    const usage = this._webgpu.GetTextureUsage();
    const layers = viewDimension === "cube" ? 6 : 1;
    const texture = this._webgpu.GetDevice().createTexture({
      label: `Tr2RenderContextAL dummy ${viewDimension}`,
      size: { width: 1, height: 1, depthOrArrayLayers: layers },
      dimension: viewDimension === "3d" ? "3d" : "2d",
      format: "rgba8unorm",
      usage: usage.TEXTURE_BINDING | usage.COPY_DST
    });
    const view = texture.createView({ dimension: viewDimension });

    this._dummies.textures.set(viewDimension, view);

    return view;
  }

  /** `MetalContext::GetDummySampler()`: a default sampler for a slot nothing filled. */
  GetDummySampler()
  {
    this._dummies.sampler ??= this._webgpu.GetDevice().createSampler({ label: "Tr2RenderContextAL dummy sampler" });

    return this._dummies.sampler;
  }

  /**
   * A zeroed buffer of at least `size` bytes for a slot nothing filled.
   *
   * DX12's null CB / null SRV substitution, one per size and usage.
   *
   * @param {number} size Bytes the layout demands.
   * @param {"UNIFORM"|"STORAGE"} usageName The usage flag's name.
   * @returns {object} A `GPUBuffer`.
   */
  GetNullBuffer(size, usageName)
  {
    const aligned = Math.max(16, Math.ceil(size / 16) * 16);
    const key = `${usageName}:${aligned}`;
    const existing = this._dummies.buffers.get(key);

    if (existing) return existing;

    const usage = this._webgpu.GetBufferUsage();
    const buffer = this._webgpu.GetDevice().createBuffer({
      label: `Tr2RenderContextAL null ${usageName.toLowerCase()} ${aligned}`,
      size: aligned,
      usage: usage[usageName] | usage.COPY_DST
    });

    this._dummies.buffers.set(key, buffer);

    return buffer;
  }

  /**
   * Creates a texture, this backend's kind of `Tr2TextureAL`.
   *
   * @param {object} desc A `Tr2BitmapDimensions`.
   * @param {object} options `{ gpuUsage, cpuUsage, msaa, initialData }`.
   * @returns {object|null} The texture, or null when Create refused.
   */
  CreateTexture(desc, options)
  {
    const texture = new CjsWebgpuTextureAL();

    if (Failed(texture.Create(desc, options ?? {}, this))) return null;

    return texture;
  }

  /**
   * Creates a resource set, this backend's kind of `Tr2ResourceSetAL`.
   *
   * @param {object} description A `Tr2ResourceSetDescriptionAL`.
   * @param {object} program The `CjsWebgpuShaderProgramAL` it binds against.
   * @returns {object|null} The set, or null when Create refused.
   */
  CreateResourceSet(description, program)
  {
    const resourceSet = new CjsWebgpuResourceSetAL();

    if (Failed(resourceSet.Create(description, program, this))) return null;

    return resourceSet;
  }

  /** Records why a draw cannot proceed and says no. */
  _RefusePipeline(reason)
  {
    this.m_pipelineFailure = reason;

    return false;
  }

  /**
   * Creates the `GPURenderPipeline` a program and recipe describe.
   *
   * A program without a pixel stage is a depth-only pipeline, which WebGPU
   * spells by omitting `fragment` - Carbon's shadow passes are exactly this.
   */
  _CreateRenderPipeline(program, recipe)
  {
    const fragmentModule = program.GetModuleFor(ShaderType.PIXEL_SHADER);
    const descriptor = {
      label: `Tr2RenderContextAL ${program.GetIdentity()}`,
      layout: program.GetPipelineLayout(),
      vertex: {
        module: program.GetModuleFor(ShaderType.VERTEX_SHADER),
        entryPoint: WEBGPU_ENTRY_POINT,
        buffers: recipe.vertex.buffers
      },
      primitive: recipe.primitive,
      ...(recipe.depthStencil ? { depthStencil: recipe.depthStencil } : {}),
      ...(recipe.multisample ? { multisample: recipe.multisample } : {}),
      ...(fragmentModule
        ? { fragment: { module: fragmentModule, entryPoint: WEBGPU_ENTRY_POINT, targets: recipe.fragment.targets } }
        : {})
    };

    return this._webgpu.GetDevice().createRenderPipeline(descriptor);
  }

  /**
   * Copies the bound attachments' formats onto the description.
   *
   * Deferred to the read rather than done in `SetRenderTarget`, because the
   * canvas format is only known once the target is configured and a target can
   * be bound before that. Carbon has no equivalent hop: a DX12 render-target
   * format is written straight into the description by `SetRenderState`
   * (`Tr2RenderContextDx12.cpp:453`), because a D3D texture knows its format
   * from creation.
   */
  _RefreshAttachmentFormats()
  {
    const primary = this._boundRenderTargets[0];

    // Only the render target answers GetFormat today. A bound colour target in
    // any other slot is a Tr2TextureAL this backend does not have yet, so its
    // format is unknown rather than assumed - and GetMissing reports an
    // incomplete description instead of a pipeline built on a guess.
    this._psoDescription.colorFormats = primary && typeof primary.GetFormat === "function"
      ? [ primary.GetFormat() ]
      : [];

    // DEPTH FOLLOWS THE PASS DESCRIPTOR, NOT THE BOUND DEPTH STENCIL. The work
    // queue's pass is built by the render target, which attaches its own depth
    // whenever it has one (`core/renderTarget.js:311-320`) and never consults
    // `SetDepthStencil`. A description that read the bound depth stencil said
    // "no depth" for every pass after BeginScene's reset, the recipe refused,
    // and nothing drew. The description must describe the pass the queue will
    // actually open; the bound depth stencil not reaching that pass is the
    // open defect, recorded in the handover, and it is fixed THERE, not by
    // letting the two halves disagree here.
    const renderTargetBound = this._renderTarget !== null && primary === this._renderTarget;

    this._psoDescription.depthFormat = renderTargetBound ? this._renderTarget.GetDepthFormat() : null;
    this._psoDescription.sampleCount = renderTargetBound ? this._renderTarget.GetSampleCount() : 1;
  }

  /**
   * Binds a prepared set of textures, samplers and buffers.
   *
   * @param {object} resourceSet A `Tr2ResourceSetAL`.
   * @returns {boolean} True.
   */
  SetResourceSet(resourceSet)
  {
    this._resourceSet = resourceSet;

    return true;
  }

  /**
   * m_constantBuffers[stage][register], as Metal keeps them.
   *
   * A Map keyed by `stage * CONSTANT_BUFFER_REGISTERS + register` rather than a
   * fixed two-dimensional array, because the register count is a device limit
   * here and not a compile-time constant.
   */
  _constantBuffers = new Map();

  /**
   * Binds a constant buffer to one shader stage at one register.
   *
   * Carbon rejects a register past the backend's constant-buffer count and
   * otherwise hands the buffer to itself to bind
   * (`Tr2RenderContextMetal.mm:664-677`). The bound state is what the resolver
   * reads when it assembles a draw.
   *
   * @param {object} buffer A `Tr2ConstantBufferAL`.
   * @param {number} constantType A `ShaderType`.
   * @param {number} registerIndex The constant-buffer register.
   * @param {number} [_maxRegisterCount] Carbon's optional bound.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetConstants(buffer, constantType, registerIndex, _maxRegisterCount = 0)
  {
    if (registerIndex < 0 || registerIndex >= CONSTANT_BUFFER_REGISTERS) return false;
    if (constantType < 0 || constantType >= ShaderType.SHADER_TYPE_COUNT) return false;

    this._constantBuffers.set(constantType * CONSTANT_BUFFER_REGISTERS + registerIndex, buffer ?? null);

    return true;
  }

  /**
   * The constant buffer bound to one stage and register.
   *
   * @param {number} constantType A `ShaderType`.
   * @param {number} registerIndex The constant-buffer register.
   * @returns {object|null} The buffer, or null when nothing is bound.
   */
  GetConstants(constantType, registerIndex)
  {
    return this._constantBuffers.get(constantType * CONSTANT_BUFFER_REGISTERS + registerIndex) ?? null;
  }

  // ---------------------------------------------------------------------------
  // THE REST OF CARBON'S RENDER-CONTEXT SURFACE.
  //
  // Nothing in Trinity calls these yet - the nine it does call are above - but a
  // backend is only interchangeable if the whole surface answers, and the
  // governing test for this layer is "swap the backend; nothing in Trinity
  // changes". Each one either does what WebGPU can do or reports what the stub
  // reports, and says which.

  /**
   * Where a debug group was pushed, so its pop reaches the same encoder.
   *
   * WEBGPU REQUIRES THE PAIR TO BALANCE WITHIN ONE ENCODER. A group pushed on
   * the command encoder and popped after a render pass opened would be a
   * validation error, not a mislabelled capture - so the push records its
   * target and the pop uses it rather than asking again.
   */
  _markerStack = [];

  /** The encoder debug markers should go to: the open pass, else the frame. */
  _MarkerTarget()
  {
    return this._workQueue.GetRenderPass() ?? this._commandEncoder;
  }

  /**
   * Inserts a one-off marker into the capture.
   *
   * Real, unlike the stub's empty body: `insertDebugMarker` is what a WebGPU
   * capture tool shows, and this is the only reason Carbon's markers exist.
   *
   * @param {string} marker The label.
   */
  AddGpuMarker(marker)
  {
    const target = this._MarkerTarget();

    if (target) target.insertDebugMarker(String(marker));
  }

  /**
   * Opens a named debug group.
   *
   * @param {string} marker The label.
   */
  PushGpuMarker(marker)
  {
    const target = this._MarkerTarget();

    this._markerStack.push(target);

    if (target) target.pushDebugGroup(String(marker));
  }

  /** Closes the innermost debug group, on the encoder that opened it. */
  PopGpuMarker()
  {
    const target = this._markerStack.pop();

    if (target) target.popDebugGroup();
  }

  /**
   * Marks a point in the frame for a profiler.
   *
   * @param {string} frameEvent The event name.
   */
  MarkFrameEvent(frameEvent)
  {
    this.AddGpuMarker(frameEvent);
  }

  /**
   * Tears the device down, dropping every piece of bound state.
   *
   * @returns {boolean} True.
   */
  Destroy()
  {
    this._boundRenderTargets.fill(null);
    this._depthStencil = null;
    for (const stack of this._renderTargetStacks) stack.length = 0;
    this._depthStencilStack.length = 0;
    this._constantBuffers.clear();
    this._renderStates.clear();
    this._markerStack.length = 0;
    this._commandEncoder = null;
    this._frame = null;
    this._ReleasePipelines();
    this._samplerStates.clear();
    this._constantArena?.Destroy();
    this._constantArena = null;
    // Carbon's backends destroy the helper with the context too (DX12's
    // destructor runs `Tr2DrawUPHelper::Destroy`), and its scratch buffers are
    // real device buffers that must not outlive the device they came from.
    this._drawUP.Destroy();
    // Bound state goes too; the description describes nothing bound.
    this._streams = [];
    this._vertexLayout = null;
    this._shaderProgram = null;
    this._psoDescription.shaderProgram = null;
    this._resourceSet = null;
    this._indexBuffer = null;
    this._indexStride = 0;
    this._isValid = false;

    return true;
  }

  /**
   * Binds the default back buffer at slot zero and clears every other slot.
   *
   * Carbon calls this from `BeginScene` (`Tr2RenderContextMetal.mm:860-864`),
   * which is why a frame there never inherits the previous frame's targets.
   * This backend did not, so bound targets survived across frames and the first
   * pass of a frame drew into whatever the last pass of the previous one had
   * left bound - the same shape as the 2048 shadow-map defect one layer up.
   *
   * @returns {boolean} True.
   */
  ResetRenderTargets()
  {
    this.SetDepthStencil(null);
    this.SetRenderTarget(0, this._renderTarget);

    for (let slot = 1; slot < MAX_RENDER_TARGET; slot++) this.SetRenderTarget(slot, null);

    return true;
  }

  /**
   * Marks this context as the process-wide primary one.
   *
   * Carbon's Metal version also constructs the device-side context and the
   * default back buffer (`Tr2RenderContextMetal.mm:114-124`); ours receive both
   * through the constructor, so what remains is the registration.
   *
   * @returns {boolean} True.
   */
  SetAsPrimary()
  {
    CjsWebgpuRenderContextAL.SetPrimaryRenderContext(this);

    return true;
  }

  /**
   * The present parameters last applied.
   *
   * CARBON'S MISSPELLING IS KEPT (`Tr2RenderContextMetal.h:230`). It is the
   * name on the abstraction-layer contract, and a backend that spells it
   * correctly is a backend the contract cannot reach.
   *
   * @returns {object|null} The parameters, or null before any were set.
   */
  GetPresentParamaters()
  {
    return this._presentParameters;
  }

  /** m_presentParameters */
  _presentParameters = null;

  /**
   * Releases what a device reset would invalidate, keeping the context alive.
   *
   * @returns {boolean} True.
   */
  ReleaseDeviceResources()
  {
    this._boundRenderTargets.fill(null);
    this._frame = null;
    this._ReleasePipelines();

    return true;
  }

  /** Drops every resolved pipeline; the next draw resolves afresh. */
  _ReleasePipelines()
  {
    this._pipelines.clear();
    this._pipeline = null;
    this._pipelineDirty = true;
    this._bindGroups.clear();
    this._dummies = { textures: new Map(), sampler: null, buffers: new Map() };
    // The sampler factory is NOT cleared here: Carbon's lives for the primary
    // context's lifetime, and every seeded pass description still holds the
    // states it handed out - clearing it made an equal description create a
    // second state and report a change it had not made.
  }

  /**
   * The back buffer this context presents into.
   *
   * The render target IS this backend's back buffer: it answers `GetWidth` and
   * `GetHeight` exactly as a `Tr2TextureAL` does, which is why it can be bound
   * at slot zero without an adapter.
   *
   * @returns {object|null} The render target, or null before composition.
   */
  GetDefaultBackBuffer()
  {
    return this._renderTarget;
  }

  /**
   * The back buffer's pixel format, as a Carbon `PixelFormat`.
   *
   * @returns {number} The format, or `PIXEL_FORMAT_UNKNOWN` before composition
   *   or for a canvas format outside the four the spec allows.
   */
  GetBackBufferFormat()
  {
    if (!this._renderTarget) return PixelFormat.PIXEL_FORMAT_UNKNOWN;

    return CANVAS_PIXEL_FORMAT[this._renderTarget.GetFormat()] ?? PixelFormat.PIXEL_FORMAT_UNKNOWN;
  }

  /**
   * Applies present parameters by resizing the presentation surface.
   *
   * The stub CREATES a back buffer at the requested size; here the canvas
   * already exists and is reconfigured instead, which is the same act against a
   * surface the page owns rather than one the backend allocates.
   *
   * @param {object} presentParameters Carbon's `Tr2PresentParametersAL`.
   * @returns {number} An `ALResult` value.
   */
  SetPresentParameters(presentParameters)
  {
    if (!presentParameters || !presentParameters.mode) return ALResult.E_INVALIDARG;
    if (!this._renderTarget) return ALResult.E_INVALIDCALL;

    const { width, height } = presentParameters.mode;

    this._renderTarget.Configure({ width, height });
    this._presentParameters = presentParameters;

    return ALResult.S_OK;
  }

  /**
   * Whether textures can be reached without a binding.
   *
   * @returns {boolean} False. WebGPU has no bindless path at all: every
   *   resource is reached through a bind group.
   */
  SupportsBindlessTextures()
  {
    return false;
  }

  /**
   * How much video memory the adapter has.
   *
   * @returns {number} Zero, as the stub reports. WebGPU deliberately exposes no
   *   memory size - it is a fingerprinting surface - so this is not a gap that
   *   a later browser fills in.
   */
  GetTotalVideoMemory()
  {
    return 0;
  }

  /** m_readOnlyDepth - Metal keeps this and folds it into ZWRITEENABLE. */
  _readOnlyDepth = false;

  /**
   * Whether depth is bound read-only.
   *
   * @returns {boolean} The flag.
   */
  GetReadOnlyDepth()
  {
    return this._readOnlyDepth;
  }

  /**
   * Binds depth read-only, so it can be sampled while still testing.
   *
   * STORED, NOT YET APPLIED. WebGPU expresses this as `depthReadOnly` on the
   * render-pass descriptor, which `_Descriptor` builds; wiring it there is a
   * pass-descriptor change rather than a state one, and the flag has to exist
   * before it can be read.
   *
   * @param {boolean} enable Whether depth is read-only.
   */
  SetReadOnlyDepth(enable)
  {
    this._readOnlyDepth = !!enable;
  }

  /**
   * Copies a byte range between two buffers.
   *
   * Real when a frame is open: `copyBufferToBuffer` is a command-encoder verb,
   * so it needs the encoder `BeginScene` created and nothing else.
   *
   * @param {object} destination The destination `Tr2BufferAL`.
   * @param {number} destinationOffset Byte offset into it.
   * @param {object} source The source `Tr2BufferAL`.
   * @param {number} sourceOffset Byte offset into it.
   * @param {number} size Bytes to copy.
   * @returns {boolean} Whether the copy was encoded.
   */
  CopySubBuffer(destination, destinationOffset, source, sourceOffset, size)
  {
    if (!this._commandEncoder) return false;
    if (!destination || !source || !destination.IsValid() || !source.IsValid()) return false;
    if (size <= 0) return false;

    this._commandEncoder.copyBufferToBuffer(
      source.GetDeviceBuffer(),
      sourceOffset,
      destination.GetDeviceBuffer(),
      destinationOffset,
      size
    );

    return true;
  }

  /**
   * Draws indirectly, reading the draw arguments from a buffer.
   *
   * REFUSES, as the stub does. WebGPU has `drawIndirect`, but the work queue
   * owns every draw and has no indirect verb; adding one here would put a
   * second draw path beside the queue's, which is the split this backend is
   * built around.
   *
   * @returns {boolean} False.
   */
  DrawInstancedIndirect()
  {
    return false;
  }

  /**
   * Draws indexed indirectly.
   *
   * @returns {boolean} False; see `DrawInstancedIndirect`.
   */
  DrawIndexedInstancedIndirect()
  {
    return false;
  }

  /**
   * Declares that a batch of resources is about to be used.
   *
   * @param {object} _destination Where they are used.
   * @param {number} _usage How they are used.
   * @param {object[]} _resources The resources.
   * @returns {boolean} True. This is a residency and barrier hint for backends
   *   that place their own memory; WebGPU tracks both itself, so honouring it
   *   is nothing rather than unimplemented.
   */
  UseResources(_destination, _usage, _resources)
  {
    return true;
  }

  /**
   * Declares a ray-tracing acceleration structure in use.
   *
   * @param {object} _tlas The top-level structure.
   * @returns {boolean} True, as the stub reports.
   */
  UseAccelerationStructure(_tlas)
  {
    return true;
  }

  /**
   * Dispatches rays.
   *
   * @returns {boolean} False; WebGPU has no ray-tracing pipeline.
   */
  DispatchRays()
  {
    return false;
  }

  /**
   * Whether the device recorded a GPU state marker after a fault.
   *
   * @returns {boolean} False; WebGPU surfaces device loss as a promise and a
   *   reason string, with no marker or breadcrumb to read.
   */
  GetGpuStateMarker()
  {
    return false;
  }

  /**
   * The resource a GPU page fault named.
   *
   * @returns {boolean} False; see `GetGpuStateMarker`.
   */
  GetGpuPageFaultResource()
  {
    return false;
  }

  // THE UPSCALING FAMILY. Every answer is the stub's, and the stub's are
  // Carbon's: the family is live only in the DX backends. WebGPU has no
  // upscaler to reach, so these are complete rather than pending.

  /**
   * Enables upscaling.
   *
   * @returns {number} `UpscalingResult.OK` - Carbon's stub succeeds WITHOUT
   *   creating anything, so a caller that then asks for a context gets null.
   *   That pairing is Carbon's and both halves are kept.
   */
  EnableUpscaling()
  {
    return UpscalingResult.OK;
  }

  /**
   * An existing upscaling context.
   *
   * @returns {null} Null; none is kept.
   */
  GetUpscalingContext()
  {
    return null;
  }

  /**
   * Creates an upscaling context.
   *
   * @returns {null} Null; none is created.
   */
  CreateUpscalingContext()
  {
    return null;
  }

  /** Destroys an upscaling context; there are none. */
  DeleteUpscalingContext()
  {
  }

  /**
   * What an upscaling context is doing.
   *
   * @returns {object} A default `UpscalingInfo`; two of its values are not zero.
   */
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

  /**
   * The techniques an adapter supports.
   *
   * @returns {Array} Empty.
   */
  GetSupportedUpscalingTechniques()
  {
    return [];
  }

  /**
   * The upscaling currently set up.
   *
   * @returns {object} "No upscaling", in the four fields Carbon fills.
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

  // THE PRIMARY RENDER CONTEXT. Carbon keeps one per process as a static and
  // reaches it from resource creation; these are the same three accessors the
  // stub carries, over the same module-level binding.

  /**
   * Records the primary render context.
   *
   * @param {object} renderContext The context to make primary.
   */
  static SetPrimaryRenderContext(renderContext)
  {
    primaryRenderContext = renderContext;
  }

  /**
   * The primary render context, which must exist.
   *
   * @returns {object} The primary context.
   */
  static GetPrimaryRenderContext()
  {
    if (primaryRenderContext === null) fail("there is no primary render context");

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
   * Draws the bound geometry, indexed.
   *
   * REFUSES WITHOUT AN INDEX BUFFER, as Metal does - `E_INVALIDARG` at
   * `Tr2RenderContextMetal.mm:419-422`. An indexed draw with nothing to index
   * is a caller error a backend can catch without a device.
   *
   * @param {number} indexCountPerInstance Indices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startIndexLocation First index.
   * @param {number} baseVertexLocation Value added to every index.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawIndexedInstanced(
    indexCountPerInstance,
    instanceCount,
    startIndexLocation = 0,
    baseVertexLocation = 0,
    startInstanceLocation = 0
  )
  {
    if (!this._indexBuffer) return false;
    if (!this._shaderProgram) return false;

    // Metal (`MetalWorkQueue.mm:2922-2944`): `GetRenderEncoder()` FIRST, then
    // `if( EmitRenderEncoderState() ) { [renderEncoder drawIndexed...] }`. The
    // pass opens whether or not the draw can proceed. DX12 is
    // `CR_RETURN_HR( SetAllState() )` at the top of the verb.
    this._Record(this._workQueue.GetRenderEncoder());

    if (!this.EmitRenderEncoderState(true)) return false;

    this._Record(this._workQueue.DrawIndexedPrimitives(
      indexCountPerInstance,
      instanceCount,
      startIndexLocation,
      baseVertexLocation,
      startInstanceLocation
    ));
    this._drawnBatchCount += 1;

    return true;
  }

  /**
   * Draws the bound geometry, non-indexed.
   *
   * @param {number} vertexCountPerInstance Vertices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startVertexLocation First vertex.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawInstanced(vertexCountPerInstance, instanceCount, startVertexLocation = 0, startInstanceLocation = 0)
  {
    if (!this._shaderProgram) return false;

    this._Record(this._workQueue.GetRenderEncoder());

    if (!this.EmitRenderEncoderState(false)) return false;

    this._Record(this._workQueue.DrawPrimitives(
      vertexCountPerInstance,
      instanceCount,
      startVertexLocation,
      startInstanceLocation
    ));
    this._drawnBatchCount += 1;

    return true;
  }

  /**
   * Draws a primitive COUNT, converting it to vertices first.
   *
   * @param {number} numVertices Vertices the index range spans.
   * @param {number} startIndex First index.
   * @param {number} primitiveCount Primitives to draw.
   * @param {number} [minimumIndex] Lowest index present.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawIndexedPrimitive(numVertices, startIndex, primitiveCount, minimumIndex = 0)
  {
    return this.DrawIndexedInstanced(this.ComputeVertexCount(primitiveCount), 1, startIndex, minimumIndex, 0);
  }

  /**
   * Draws a primitive count, non-indexed.
   *
   * @param {number} startVertex First vertex.
   * @param {number} primitiveCount Primitives to draw.
   * @returns {boolean} Whether the draw was recorded.
   */
  DrawPrimitive(startVertex, primitiveCount)
  {
    return this.DrawInstanced(this.ComputeVertexCount(primitiveCount), 1, startVertex, 0);
  }

  /**
   * Draws non-indexed straight from caller memory, with no buffer bound.
   *
   * Carbon does not draw this itself either: every backend hands it to
   * `Tr2DrawUPHelper` (Metal at `Tr2RenderContextMetal.mm:558-571`, DX12 at
   * `Tr2RenderContextDx12.cpp:1219-1224`), which stages the caller's vertices
   * into a ring of scratch buffers and issues an ordinary draw. WebGPU cannot
   * read caller memory either - every vertex must reach a `GPUBuffer` first -
   * so the helper IS the implementation rather than a detail of it, and the
   * port is shared rather than written again here.
   *
   * @param {number} primitiveCount Primitives to draw.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether the draw was encoded.
   */
  DrawPrimitiveUP(primitiveCount, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return !Failed(this._drawUP.DrawPrimitiveUP(
      this._topology,
      primitiveCount,
      vertexStreamZeroData,
      vertexStreamZeroStride,
      this
    ));
  }

  /**
   * Draws indexed straight from caller memory.
   *
   * The same helper, staging indices as well as vertices. Carbon has an
   * overload per index width; the width is read off the array here instead.
   *
   * @param {number} numVertices Vertices the index data spans.
   * @param {number} primitiveCount Primitives to draw.
   * @param {Uint16Array|Uint32Array} indexData The indices.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether the draw was encoded.
   */
  DrawIndexedPrimitiveUP(numVertices, primitiveCount, indexData, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return !Failed(this._drawUP.DrawIndexedPrimitiveUP(
      this._topology,
      numVertices,
      primitiveCount,
      indexData,
      vertexStreamZeroData,
      vertexStreamZeroStride,
      this
    ));
  }

  /**
   * How many vertices a primitive count describes at the bound topology.
   *
   * @param {number} primitiveCount Primitives.
   * @returns {number} Vertices.
   */
  ComputeVertexCount(primitiveCount)
  {
    return VERTICES_PER_PRIMITIVE[this._topology](primitiveCount);
  }

  /**
   * What a following draw would bind, for a caller that must encode it.
   *
   * @returns {object} A copy of the bound state.
   */
  GetBoundState()
  {
    return {
      topology: this._topology,
      indexBuffer: this._indexBuffer,
      indexStride: this._indexStride,
      streams: this._streams.map(stream => (stream ? { ...stream } : stream)),
      vertexLayout: this._vertexLayout,
      shaderProgram: this._shaderProgram,
      resourceSet: this._resourceSet
    };
  }

  /**
   * Keeps the work queue's reported encoder transitions for the tests to read.
   *
   * @param {object[]} [events] The events, if any were reported.
   */
  _Record(events)
  {
    if (events?.length) this._transitions.push(...events);
  }
}
