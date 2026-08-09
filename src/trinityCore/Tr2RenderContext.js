// Ported from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Tr2RenderContext.h (name/role)
//   trinity/trinityal/*/Tr2RenderContext*.h (command surface, recorded as intents)
//   trinity/trinity/Tr2Renderer.cpp (view-state statics, relocated here)
// Hand-maintained amalgam of three Carbon surfaces (audited 2026-07-18):
// 1. The command surface (PushRenderTarget/Clear/SetViewport/PresentSwapChain/
//    SetRenderState/...) mirrors the backend AL context classes and RECORDS
//    INTENTS instead of executing - a deliberate stand-in until the
//    WebGL/WebGPU engine exists.
// 2. The cached view state (SetViewTransform -> GetViewTransform/
//    GetInverseViewTransform/GetViewPosition) relocates Carbon's Tr2Renderer
//    STATICS onto this context so frame consumers read it via the threaded
//    updateContext.renderContext instead of a global.
// 3. Carbon's actual Tr2RenderContext.h surface - RenderBatches family,
//    GetConstantBuffer/GetBackBuffer, and Fork/Join parallel encoding - is NOT
//    ported: batch rendering awaits the material/batch runtime; parallel
//    encoding is intentionally omitted in single-threaded JS.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { Tr2VariableStore } from "./Tr2VariableStore.js";
import { TriPoolAllocator } from "./rawData/TriPoolAllocator.js";

/** Tr2RenderContext (trinityCore) - generated from schema shapeHash 73e2a4e7.... */
@type.define({ className: "Tr2RenderContext", family: "trinityCore" })
export class Tr2RenderContext extends CjsModel
{
  #renderTargetStacks = new Map();

  #depthStencilStack = [];

  #diagnostics = [];

  #stepExecutor = null;

  #intents = [];

  #renderTargets = new Map();

  #depthStencil = null;

  #viewport = null;

  #view = null;

  #projection = null;

  // Carbon-faithful cached view state (Tr2Renderer::SetViewTransform): the raw
  // column-major view matrix, its inverse (computed once per view change, read
  // many times per frame by camera-dependent modifiers), and the view/eye
  // position taken from the inverse-view translation row. Allocated once and
  // copied into - never reallocated per read (allocation rules E/F).
  #viewTransform = mat4.create();

  #inverseViewTransform = mat4.create();

  #viewPosition = vec3.create();

  #hasViewMatrix = false;

  #viewportStack = [];

  #projectionStack = [];

  #viewTransformStack = [];

  #intentCursor = 0;

  // Carbon keeps ONE pool allocator as a Tr2Renderer static, created in
  // Initialize (Tr2Renderer.cpp:345), read through GetPoolAllocator
  // (cpp:1083) and Clear()ed in EndRenderContext (cpp:1072-1081). Those
  // renderer statics relocate onto this context (see the file header), so the
  // pool lives here too, per context rather than per process. Created on first
  // request: constructing a context is not a frame, and the arena retains its
  // chunks once it exists.
  #poolAllocator = null;

  // The frame clock, relocated here with the other Tr2Renderer statics. Carbon
  // keeps the counter as a file-scope global in TriDevice.cpp:143 and the
  // animation time as a TriDevice member; both are ADVANCED by the tick
  // (TriDevice::Update, cpp:805/:823) and only READ by the render path
  // (Tr2Renderer::GetCurrentFrameCounter, cpp:1090). Holding them here is what
  // lets BeginFrame stay zero-argument as Carbon declares it, and matches the
  // frameIndex an EveSpaceScene driver already documents as coming from
  // GetCurrentFrameCounter. Trinity does not advance them: a driver does.
  #frameCounter = 0;

  #animationTime = 0;

  #previousAnimationTime = 0;

  #debugRenderer = null;

  static TextureFilter = Object.freeze({
    TF_NONE: 0,
    TF_POINT: 1,
    TF_LINEAR: 2,
    TF_ANISOTROPIC: 3,
    TF_COMPARISON: 0x80
  });

  static TextureAddressMode = Object.freeze({
    TA_WRAP: 1,
    TA_MIRROR: 2,
    TA_CLAMP: 3,
    TA_BORDER: 4,
    TA_MIRROR_ONCE: 5
  });

  /**
   * Installs the optional executor that Begin/Execute/EndStep delegate to;
   * passing null restores direct dispatch to the step itself.
   */
  SetStepExecutor(executor)
  {
    this.#stepExecutor = executor ?? null;
    return this;
  }

  /**
   * Delegates to the installed step executor when it implements BeginStep,
   * otherwise calls the step's own BeginExecute.
   */
  BeginStep(step, realTime, simTime, job)
  {
    if (this.#stepExecutor?.BeginStep)
    {
      return this.#stepExecutor.BeginStep(step, realTime, simTime, job, this);
    }
    return step?.BeginExecute?.(this);
  }

  /**
   * Delegates to the installed step executor when it implements ExecuteStep,
   * otherwise calls the step's own Execute with the frame times.
   */
  ExecuteStep(step, realTime, simTime, job)
  {
    if (this.#stepExecutor?.ExecuteStep)
    {
      return this.#stepExecutor.ExecuteStep(step, realTime, simTime, job, this);
    }
    return step?.Execute?.(realTime, simTime, this);
  }

  /**
   * Delegates to the installed step executor when it implements EndStep,
   * otherwise calls the step's own EndExecute.
   */
  EndStep(step, realTime, simTime, job)
  {
    if (this.#stepExecutor?.EndStep)
    {
      return this.#stepExecutor.EndStep(step, realTime, simTime, job, this);
    }
    return step?.EndExecute?.(this);
  }

  // Carbon Tr2Renderer::GetCurrentFrameCounter (Tr2Renderer.cpp:1088-1091).

  /** The frame the render path is currently working on. */
  GetCurrentFrameCounter()
  {
    return this.#frameCounter;
  }

  /** The animation clock the render path publishes, in seconds. */
  GetAnimationTime()
  {
    return this.#animationTime;
  }

  // Carbon advances both in TriDevice::Update (cpp:805/:823), which is the
  // tick, and the tick is engine-owned (see the frame-driver contract in
  // docs/architecture.md). A driver calls this once per frame BEFORE Render.
  // Trinity never advances the clock itself: it cannot prove a frame boundary.

  /**
   * Advances the frame clock: increments the frame counter and records the new
   * animation time, keeping the previous one for the render-time vector.
   * Returns this for chaining.
   */
  AdvanceFrame(animationTime = this.#animationTime)
  {
    this.#frameCounter++;
    this.#previousAnimationTime = this.#animationTime;
    this.#animationTime = Number(animationTime) || 0;
    return this;
  }

  // Carbon Tr2Renderer::BeginFrame (Tr2Renderer.cpp:1040-1051): publishes the
  // "Time" vector every consumer reads - x is the animation time, y its
  // fractional part (a free 0..1 sawtooth for shaders), z the frame counter,
  // and w the PREVIOUS frame's animation time, which is what makes a shader
  // able to compute its own delta. Carbon registers this on the global store
  // (cpp:329), and Tr2VariableStore.GlobalStore() is the same root here.

  /**
   * Publishes the per-frame "Time" vector into the global variable store, as
   * Carbon does at the start of every frame; returns the published vector.
   */
  BeginFrame()
  {
    const animationTime = this.#animationTime;
    const time = [
      animationTime,
      animationTime - Math.floor(animationTime),
      this.#frameCounter,
      this.#previousAnimationTime
    ];

    Tr2VariableStore.GlobalStore().RegisterVariable("Time", time);
    return time;
  }

  // Carbon Tr2Renderer::EndFrame (Tr2Renderer.cpp:1053-1064) clears the debug
  // text renderer and the debug line set, both Tr2Renderer statics. Only the
  // debug renderer has a counterpart here (SetDebugRenderer); Carbon's global
  // debug line set has no Trinity surface, so nothing stands in for it.

  /**
   * Ends the frame, clearing the installed debug renderer; returns this for
   * chaining.
   */
  EndFrame()
  {
    this.#debugRenderer?.Clear?.();
    return this;
  }

  // Carbon Tr2Renderer::BeginRenderContext (Tr2Renderer.cpp:1066-1070) forwards
  // to the backend context's BeginScene. The GPU-free context records the
  // intent; an installed executor performs it.

  /**
   * Opens the scene for this frame, recording the intent and delegating to an
   * installed executor's BeginScene; returns this for chaining.
   */
  BeginRenderContext()
  {
    this.#stepExecutor?.BeginScene?.(this);
    return this;
  }

  // Carbon: Tr2Renderer::GetPoolAllocator (Tr2Renderer.cpp:1083). The store
  // this returns is the one CjsBatchManager binds onto the batch map, so every
  // GetPerObjectData Alloc leases from it. Every catalogued Carbon struct is
  // registered on it already - Trinity owns the offsets, so an engine supplies
  // nothing to make per-object data work.

  /**
   * The per-object constant-data pool for this context, created on first use;
   * an engine or host may replace it with SetTriPoolAllocator.
   */
  GetTriPoolAllocator()
  {
    if (!this.#poolAllocator)
    {
      this.#poolAllocator = new TriPoolAllocator().RegisterCatalog();
    }
    return this.#poolAllocator;
  }

  /**
   * Replaces the per-object constant-data pool, for a host that shares one
   * arena across contexts or registers extra structs; passing null restores
   * lazy creation. Returns this for chaining.
   */
  SetTriPoolAllocator(allocator)
  {
    this.#poolAllocator = allocator ?? null;
    return this;
  }

  // Carbon clears the pool in Tr2Renderer::EndRenderContext (cpp:1072-1081),
  // BEFORE EndScene, so every transient payload leased during the frame dies at
  // one point. The frame driver calls this; nothing else may.

  /**
   * Rewinds the per-object pool arena at the end of a frame, freeing every
   * transient payload leased during it; a context that never leased one does
   * nothing.
   */
  EndRenderContext()
  {
    this.#poolAllocator?.Reset();
    return this;
  }

  /**
   * Pushes a render target onto the balance-guard stack for one slot, creating
   * that slot's stack on first use; it records no intent, only SetRenderTarget
   * does.
   */
  PushRenderTarget(renderTarget = null, slot = 0)
  {
    const index = Number(slot) >>> 0;
    let stack = this.#renderTargetStacks.get(index);
    if (!stack)
    {
      stack = [];
      this.#renderTargetStacks.set(index, stack);
    }
    stack.push(renderTarget);
    return true;
  }

  /**
   * Pops the top render target off one slot's stack, or null when that stack is
   * empty.
   */
  PopRenderTarget(slot = 0)
  {
    const stack = this.#renderTargetStacks.get(Number(slot) >>> 0);
    return stack?.length ? stack.pop() : null;
  }

  /** Depth of one slot's render-target stack; zero for a slot never pushed to. */
  GetStackSizeRT(slot = 0)
  {
    return this.#renderTargetStacks.get(Number(slot) >>> 0)?.length ?? 0;
  }

  /**
   * Pushes a depth-stencil onto the balance-guard stack; it records no intent,
   * only SetDepthStencil does.
   */
  PushDepthStencil(depthStencil = null)
  {
    this.#depthStencilStack.push(depthStencil);
    return true;
  }

  /** Pops the top depth-stencil, or null when the stack is empty. */
  PopDepthStencil()
  {
    return this.#depthStencilStack.length ? this.#depthStencilStack.pop() : null;
  }

  /** Depth of the depth-stencil stack. */
  GetStackSizeDS()
  {
    return this.#depthStencilStack.length;
  }

  /**
   * Binds a render target to a slot and records a set-render-target intent for
   * the engine to realize.
   */
  SetRenderTarget(slot, renderTarget)
  {
    const index = Number(slot) >>> 0;
    this.#renderTargets.set(index, renderTarget ?? null);
    this.#intents.push({ type: "set-render-target", slot: index, renderTarget: renderTarget ?? null });
    return true;
  }

  /**
   * The render target currently bound to a slot, or null when that slot was
   * never set.
   */
  GetRenderTarget(slot = 0)
  {
    return this.#renderTargets.get(Number(slot) >>> 0) ?? null;
  }

  /** Binds the depth-stencil surface and records a set-depth-stencil intent. */
  SetDepthStencil(depthStencil)
  {
    this.#depthStencil = depthStencil ?? null;
    this.#intents.push({ type: "set-depth-stencil", depthStencil: this.#depthStencil });
    return true;
  }

  /** The currently bound depth-stencil surface, or null. */
  GetDepthStencil()
  {
    return this.#depthStencil;
  }

  /**
   * Records a clear intent with separate colour, depth and stencil enables; the
   * colour is snapshotted by value so a caller's reusable buffer cannot mutate
   * the queued intent.
   */
  Clear(options)
  {
    const intent = {
      type: "clear",
      color: options?.color ? Array.from(options.color) : null,
      depth: options?.depth ?? null,
      stencil: options?.stencil ?? null,
      clearColor: !!options?.clearColor,
      clearDepth: !!options?.clearDepth,
      clearStencil: !!options?.clearStencil
    };
    this.#intents.push(intent);
    return true;
  }

  /** GPU-free validity check: any non-null render target counts as valid. */
  IsRenderTargetValid(renderTarget)
  {
    return renderTarget != null;
  }

  /**
   * Records a resolve intent moving a multisampled source into a resolved
   * destination.
   */
  ResolveRenderTarget(source, destination)
  {
    this.#intents.push({ type: "resolve-render-target", source, destination });
    return true;
  }

  /**
   * Records a copy-render-target intent, spreading the caller's descriptor
   * fields into it.
   */
  CopyRenderTarget(intent)
  {
    this.#intents.push({ type: "copy-render-target", ...intent });
    return true;
  }

  /** Records a generate-mipmaps intent for a render target. */
  GenerateMipMaps(renderTarget)
  {
    this.#intents.push({ type: "generate-mipmaps", renderTarget });
    return true;
  }

  /**
   * Records a render-object intent naming a renderable, with any extra options
   * merged into the intent.
   */
  RenderObject(renderable, options = {})
  {
    this.#intents.push({ type: "render-object", renderable, ...options });
    return true;
  }

  /**
   * Records a full-screen draw-effect intent; the two texture-coordinate corners
   * are copied by value so caller buffers can be reused.
   */
  DrawEffect(effect, shaderBuffer = null, tlTexCoord = null, brTexCoord = null)
  {
    this.#intents.push({
      type: "draw-effect",
      effect,
      shaderBuffer,
      tlTexCoord: tlTexCoord ? Array.from(tlTexCoord) : null,
      brTexCoord: brTexCoord ? Array.from(brTexCoord) : null
    });
    return true;
  }

  /** Records a draw-line-set intent referencing the line set. */
  DrawLineSet(lineSet)
  {
    this.#intents.push({ type: "draw-line-set", lineSet });
    return true;
  }

  /**
   * Records a clear-unordered-access-view intent; the clear value is copied by
   * value and clearWithFloat selects float rather than integer clearing.
   */
  ClearUav(buffer, value, clearWithFloat = false)
  {
    this.#intents.push({ type: "clear-uav", buffer, value: Array.from(value), clearWithFloat: !!clearWithFloat });
    return true;
  }

  /** Records a render-atlas intent for an atlas step. */
  RenderAtlas(step)
  {
    this.#intents.push({ type: "render-atlas", step });
    return true;
  }

  /** Records a render-line-graphs intent for a line-graph step. */
  RenderLineGraphs(step)
  {
    this.#intents.push({ type: "render-line-graphs", step });
    return true;
  }

  /**
   * Records a render-texture intent for a source texture, with any extra options
   * merged into the intent.
   */
  RenderTexture(source, options = {})
  {
    this.#intents.push({ type: "render-texture", source, ...options });
    return true;
  }

  /**
   * Records a render-debug intent, deep-copying the step's line vertices and its
   * 2D and 3D text entries so the debug step can be refilled immediately.
   */
  RenderDebug(debugStep)
  {
    this.#intents.push({
      type: "render-debug",
      vertices: debugStep.lineSet.vertices.map(vertex => ({ position: Array.from(vertex.position), color: vertex.color })),
      text2d: debugStep.text2d.map(entry => ({ ...entry })),
      text3d: debugStep.text3d.map(entry => ({ ...entry, position: Array.from(entry.position) }))
    });
    return true;
  }

  /**
   * Records a compute-dispatch intent with an explicit thread-group count per
   * axis.
   */
  RunComputeShader(effect, groupDimX = 1, groupDimY = 1, groupDimZ = 1)
  {
    this.#intents.push({ type: "run-compute-shader", effect, groupDimX, groupDimY, groupDimZ });
    return true;
  }

  /**
   * Records an indirect compute-dispatch intent reading its group counts from a
   * buffer at the given byte offset.
   */
  RunComputeShaderIndirect(effect, indirectionBuffer, offsetForArgs = 0)
  {
    this.#intents.push({ type: "run-compute-shader-indirect", effect, indirectionBuffer, offsetForArgs });
    return true;
  }

  /** Records the upscaler context the following work belongs to. */
  SetUpscalingContextID(upscalingContextID)
  {
    this.#intents.push({ type: "set-upscaling-context-id", upscalingContextID: Number(upscalingContextID) >>> 0 });
    return true;
  }

  /**
   * Records the debug renderer to route subsequent debug drawing through; null
   * detaches it. The renderer is retained because EndFrame clears it, as
   * Carbon clears its s_debugTextRenderer static.
   */
  SetDebugRenderer(renderer)
  {
    this.#debugRenderer = renderer ?? null;
    this.#intents.push({ type: "set-debug-renderer", renderer: renderer ?? null });
    return true;
  }

  /** Records the end-of-frame present intent for a swap chain. */
  PresentSwapChain(swapChain)
  {
    this.#intents.push({ type: "present-swap-chain", swapChain });
    return true;
  }

  /**
   * Caches the viewport and records a set-viewport intent; the viewport object
   * is held by reference, not copied.
   */
  SetViewport(viewport)
  {
    this.#viewport = viewport ?? null;
    this.#intents.push({ type: "set-viewport", viewport: this.#viewport });
    return true;
  }

  /**
   * Clears the cached viewport and records a fullscreen-viewport intent, leaving
   * the engine to resolve the actual target extent.
   */
  SetFullScreenViewport()
  {
    this.#viewport = null;
    this.#intents.push({ type: "set-fullscreen-viewport" });
    return true;
  }

  /**
   * The viewport last set, or null while the context is in fullscreen-viewport
   * mode.
   */
  GetViewport()
  {
    return this.#viewport;
  }

  // Save/restore stack for the current viewport (Carbon Push/PopViewport). The
  // step calls these with no argument: push saves the current viewport, pop
  // restores it and re-records the set-viewport intent so realization sees the
  // restored value. Independent of the RT/DS balance-guard stacks.

  /**
   * Saves the current viewport on its own save/restore stack, independent of the
   * render-target and depth-stencil balance guards.
   */
  PushViewport()
  {
    this.#viewportStack.push(this.#viewport);
    return true;
  }

  /**
   * Restores the last pushed viewport and re-records a set-viewport intent so
   * realization sees the restored value; returns false when the stack is empty.
   */
  PopViewport()
  {
    if (!this.#viewportStack.length) return false;
    this.#viewport = this.#viewportStack.pop();
    this.#intents.push({ type: "set-viewport", viewport: this.#viewport });
    return true;
  }

  /** Depth of the viewport save/restore stack. */
  GetStackSizeViewport()
  {
    return this.#viewportStack.length;
  }

  /**
   * Caches the view/camera/simTime record, refreshes the cached view matrix and
   * its inverse from the view matrix, and records a set-view intent.
   */
  SetView(view, camera = null, simTime = 0)
  {
    this.#view = { view: view ?? null, camera: camera ?? null, simTime };
    this.#ApplyViewMatrix(view);
    this.#intents.push({ type: "set-view", ...this.#view });
    return true;
  }

  /**
   * Caches a raw view matrix (Tr2Renderer::SetViewTransform), refreshes the
   * inverse and eye position, and records a set-view-transform intent.
   */
  SetViewTransform(transform, source = null)
  {
    this.#view = { transform: transform ?? null, source: source ?? null };
    this.#ApplyViewMatrix(transform);
    this.#intents.push({ type: "set-view-transform", ...this.#view });
    return true;
  }

  // Mirrors Tr2Renderer::SetViewTransform: cache the view matrix, compute its
  // inverse once, and derive the view position from the inverse-view
  // translation row (Carbon reads _41.._43 -> column-major indices [12,13,14]).

  /**
   * Mirrors Tr2Renderer::SetViewTransform - copies the view matrix into the
   * cached buffer, inverts it once (falling back to identity when singular) and
   * derives the eye position from the inverse-view translation; anything that is
   * not a 16-element matrix is ignored and leaves the cache untouched.
   */
  #ApplyViewMatrix(matrix)
  {
    if (!matrix || matrix.length !== 16)
    {
      return;
    }

    mat4.copy(this.#viewTransform, matrix);

    if (!mat4.invert(this.#inverseViewTransform, this.#viewTransform))
    {
      mat4.identity(this.#inverseViewTransform);
    }

    vec3.set(
      this.#viewPosition,
      this.#inverseViewTransform[12],
      this.#inverseViewTransform[13],
      this.#inverseViewTransform[14]
    );
    this.#hasViewMatrix = true;
  }

  /**
   * A shallow copy of the last view or view-transform record, or null when none
   * has been set.
   */
  GetView()
  {
    return this.#view ? { ...this.#view } : null;
  }

  // Raw column-major view matrix (Tr2Renderer::GetViewTransform). Live buffer -
  // callers read, never mutate.

  /**
   * The raw column-major view matrix (Tr2Renderer::GetViewTransform); a live
   * buffer owned by the context that callers read and never mutate.
   */
  GetViewTransform()
  {
    return this.#viewTransform;
  }

  // Inverse of the view matrix (Tr2Renderer::GetInverseViewTransform), cached on
  // the last view change. Live buffer - callers read, never mutate.

  /**
   * The inverse view matrix (Tr2Renderer::GetInverseViewTransform), recomputed
   * on each view change; a live buffer callers read and never mutate.
   */
  GetInverseViewTransform()
  {
    return this.#inverseViewTransform;
  }

  // World-space view/eye position (Tr2Renderer::GetViewPosition): the
  // inverse-view translation. Live buffer - callers read, never mutate.

  /**
   * The world-space eye position taken from the inverse-view translation; a live
   * buffer callers read and never mutate.
   */
  GetViewPosition()
  {
    return this.#viewPosition;
  }

  // Whether a view matrix has been set (camera-dependent modifiers fall back to
  // an unchanged transform when it has not).

  /**
   * Whether a view matrix has been set; camera-dependent modifiers fall back to
   * an unchanged transform when it has not.
   */
  HasViewMatrix()
  {
    return this.#hasViewMatrix;
  }

  // Save/restore stack for the cached view transform (Carbon Push/PopViewTransform).
  // Push snapshots the current view object, its matrix, and the has-matrix flag;
  // pop restores them and re-derives the inverse/eye-position via ApplyViewMatrix.

  /**
   * Snapshots the current view record, its matrix and the has-matrix flag onto
   * the view-transform stack, copying the matrix rather than aliasing the live
   * buffer.
   */
  PushViewTransform()
  {
    this.#viewTransformStack.push({
      view: this.#view,
      hasViewMatrix: this.#hasViewMatrix,
      transform: this.#hasViewMatrix ? mat4.copy(mat4.create(), this.#viewTransform) : null
    });
    return true;
  }

  /**
   * Restores the last pushed view transform, re-deriving the inverse and eye
   * position (or resetting them to identity when nothing was cached), and
   * re-records a set-view-transform intent; returns false when the stack is
   * empty.
   */
  PopViewTransform()
  {
    if (!this.#viewTransformStack.length) return false;

    const saved = this.#viewTransformStack.pop();
    this.#view = saved.view;
    if (saved.transform)
    {
      this.#ApplyViewMatrix(saved.transform);
    }
    else
    {
      mat4.identity(this.#viewTransform);
      mat4.identity(this.#inverseViewTransform);
      vec3.set(this.#viewPosition, 0, 0, 0);
      this.#hasViewMatrix = false;
    }
    this.#intents.push({ type: "set-view-transform", ...(this.#view ?? {}) });
    return true;
  }

  /** Depth of the view-transform save/restore stack. */
  GetStackSizeViewTransform()
  {
    return this.#viewTransformStack.length;
  }

  /**
   * Caches the projection and records a set-projection intent; the projection
   * object is held by reference.
   */
  SetProjection(projection)
  {
    this.#projection = projection ?? null;
    this.#intents.push({ type: "set-projection", projection: this.#projection });
    return true;
  }

  /**
   * Records a single render-state assignment; both state and value are coerced
   * to unsigned integers.
   */
  SetRenderState(state, value)
  {
    this.#intents.push({ type: "set-render-state", state: Number(state) >>> 0, value: Number(value) >>> 0 });
    return true;
  }

  /** Records the intent to apply the standard state block for a rendering mode. */
  ApplyStandardStates(renderingMode)
  {
    this.#intents.push({ type: "apply-standard-states", renderingMode: Number(renderingMode) >>> 0 });
    return true;
  }

  /**
   * Records the wireframe toggle for the engine to read at realization; the
   * context itself draws nothing.
   */
  SetWireframeRendering(enabled)
  {
    this.#intents.push({ type: "set-wireframe-rendering", enabled: !!enabled });
    return true;
  }

  /**
   * The projection matrix last recorded on the context, or null before a pass
   * sets one.
   */
  GetProjection()
  {
    return this.#projection;
  }

  // Save/restore stack for the current projection (Carbon Push/PopProjection).

  /** Saves the current projection on its own save/restore stack. */
  PushProjection()
  {
    this.#projectionStack.push(this.#projection);
    return true;
  }

  /**
   * Restores the last pushed projection and re-records a set-projection intent;
   * returns false when the stack is empty.
   */
  PopProjection()
  {
    if (!this.#projectionStack.length) return false;
    this.#projection = this.#projectionStack.pop();
    this.#intents.push({ type: "set-projection", projection: this.#projection });
    return true;
  }

  /** Depth of the projection save/restore stack. */
  GetStackSizeProjection()
  {
    return this.#projectionStack.length;
  }

  /**
   * A full copy of every intent recorded since the last ClearIntents; it does
   * not move the take-cursor, so intents can be returned again.
   */
  GetIntents()
  {
    return this.#intents.slice();
  }

  // Incremental exactly-once consumption for a per-step/per-batch executor:
  // returns the intents recorded since the previous TakeIntents/ClearIntents and
  // advances the cursor. Unlike GetIntents (a full copy), the same intent is
  // never returned twice, so nested jobs cannot realize an intent more than once.

  /**
   * Exactly-once consumption for a per-step executor: returns the intents
   * recorded since the previous take and advances the cursor, so no intent can
   * be realized twice.
   */
  TakeIntents()
  {
    const taken = this.#intents.slice(this.#intentCursor);
    this.#intentCursor = this.#intents.length;
    return taken;
  }

  // Peek at the intents since the cursor without advancing it.

  /** The intents recorded since the cursor, without advancing it. */
  PeekIntents()
  {
    return this.#intents.slice(this.#intentCursor);
  }

  /** Index of the first intent not yet consumed by TakeIntents. */
  GetIntentCursor()
  {
    return this.#intentCursor;
  }

  /** Drops all recorded intents and rewinds the take-cursor to zero. */
  ClearIntents()
  {
    this.#intents.length = 0;
    this.#intentCursor = 0;
  }

  /**
   * Appends a diagnostic record for the frame; diagnostics are independent of
   * the intent stream and cleared separately.
   */
  AddDiagnostic(diagnostic)
  {
    this.#diagnostics.push(diagnostic);
  }

  /** A copy of the diagnostics recorded since the last ClearDiagnostics. */
  GetDiagnostics()
  {
    return this.#diagnostics.slice();
  }

  /** Drops all recorded diagnostics. */
  ClearDiagnostics()
  {
    this.#diagnostics.length = 0;
  }

  /**
   * The process-wide fallback context, constructed once when the class is
   * defined, for callers with no context of their own.
   */
  static GetDefault()
  {
    return Tr2RenderContext.#defaultContext;
  }

  /**
   * The global "objectId" TriVariable Carbon registers at context
   * construction and stamps per batch during picking. Registered lazily
   * here so contexts that never pick pay nothing.
   */
  GetObjectIdVariable()
  {
    if (!this.#objectIdVariable)
    {
      this.#objectIdVariable = Tr2VariableStore.GlobalStore().RegisterVariable("objectId", 0.0);
    }
    return this.#objectIdVariable;
  }

  #objectIdVariable = null;

  /**
   * True when any batch's shader implements the technique with at least one
   * pass - Carbon's cheap "can this pass be skipped entirely" pre-check.
   * Consecutive batches sharing a shader are tested once.
   */
  static TechniqueInBatch(batches, techniqueName)
  {
    let prevShader = null;
    for (const batch of batches)
    {
      const shader = batch?.shader;
      if (!shader || shader === prevShader)
      {
        continue;
      }
      prevShader = shader;
      const technique = shader.GetTechniqueIndex?.(techniqueName);
      if (technique === undefined || technique === null || technique < 0)
      {
        continue;
      }
      if ((shader.GetPassCount?.(technique) ?? 0) > 0)
      {
        return true;
      }
    }
    return false;
  }

  static #defaultContext = new Tr2RenderContext();
}
