// Source: trinity/trinity/Tr2RenderContext.h (name/role)
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
// 3. Carbon's actual Tr2RenderContext.h surface. GetConstantBuffer is ported
//    (2026-09-06) and the RenderBatches family is next; GetBackBuffer is not.
//    Fork/Join parallel encoding is deliberately omitted - it exists to spread
//    batch encoding across threads, and there is one.
import { type } from "#schema";
import { CjsModel } from "#model";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { ALResult, Failed } from "../al/ALResult.js";
import { ConstantBufferSlot } from "#consts/render-context";
import { Tr2ConstantBufferALStub } from "../al/Tr2ConstantBufferALStub.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { TriPoolAllocator } from "../rawData/TriPoolAllocator.js";
import { CjsDirectTrinityStepExecutor } from "./CjsDirectTrinityStepExecutor.js";
import { CjsShadowMapExecutor } from "./CjsShadowMapExecutor.js";
import { CjsTrinityStepExecutor } from "./CjsTrinityStepExecutor.js";
import { CjsVolumetricsExecutor } from "./CjsVolumetricsExecutor.js";
import { Tr2RenderBatch } from "../batch/Tr2RenderBatch.js";
import { Tr2Shader } from "#resource/shader";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";

const DIRECT_STEP_EXECUTOR = Object.freeze(new CjsDirectTrinityStepExecutor());

/** Carbon DEFAULT_TECHNIQUE (Tr2RenderContext.h:37). */
const DEFAULT_TECHNIQUE = "Main";

/** Tr2RenderContext (trinityCore) - generated from schema shapeHash 73e2a4e7.... */
@type.define({ className: "Tr2RenderContext", family: "trinityCore" })
export class Tr2RenderContext extends CjsModel
{
  #renderTargetStacks = new Map();

  #depthStencilStack = [];

  #diagnostics = [];

  #stepExecutor = DIRECT_STEP_EXECUTOR;

  #shadowMapExecutor = null;

  #volumetricsExecutor = null;

  /**
   * The abstraction-layer backend, when one is installed.
   *
   * Carbon's Tr2RenderContext IS Tr2RenderContextBase + Tr2RenderContextAL: the
   * base adds the RenderBatches family and the AL supplies every other verb.
   * This field is that AL half. With a backend installed the verbs CALL it, as
   * Carbon does; with none they fall back to recording, which is what this
   * class did for every caller before the AL existed.
   *
   * The recording is on its way out - see
   * /docs/research/carbon-fidelity-audit-2026-09-04.md section 1b, which found
   * that all 28 intent types are AL verbs, RenderBatches, or TriStep/
   * Tr2EffectStateManager methods, and none is a feature worth keeping.
   */
  #al = null;

  // Carbon's context OWNS its state manager as a public member
  // (`Tr2RenderContext.h:35`), and its render steps reach the Trinity-level
  // verbs through it - `renderContext.m_esm.SetViewport(...)`
  // (`TriStepSetViewport.cpp:25`). Ours composes rather than inherits, so the
  // manager is bound to this context once and never rebound.

  /** m_esm */
  #esm = new Tr2EffectStateManager().SetRenderContext(this);

  #intents = [];

  #renderTargets = new Map();

  #depthStencil = null;

  #viewport = null;

  #view = null;

  #projection = null;

  // Tr2Renderer::GetFieldOfView relocated beside the projection matrix. It is
  // accepted from a typed TriProjection step or derived once when raw matrix
  // state changes, not recomputed by every camera-dependent transform.
  #fieldOfView = 0;

  // Carbon-faithful cached view state (Tr2Renderer::SetViewTransform): the raw
  // column-major view matrix, its inverse (computed once per view change, read
  // many times per frame by camera-dependent modifiers), and the view/eye
  // position taken from the inverse-view translation row. Allocated once and
  // copied into - never reallocated per read (allocation rules E/F).
  #viewTransform = mat4.create();

  #inverseViewTransform = mat4.create();

  #viewPosition = vec3.create();

  #hasViewMatrix = false;


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

  /** Installs a nominal step executor; null restores direct step execution. */
  SetStepExecutor(executor)
  {
    if (executor !== null && !(executor instanceof CjsTrinityStepExecutor))
    {
      throw new TypeError("Tr2RenderContext.SetStepExecutor expects a CjsTrinityStepExecutor or null.");
    }
    this.#stepExecutor = executor ?? DIRECT_STEP_EXECUTOR;
    return this;
  }

  /**
   * Installs the nominal engine implementation for cascaded-shadow realization.
   * Passing null removes it; all shadow operations then fail loudly on use.
   */
  SetShadowMapExecutor(executor)
  {
    if (executor !== null && !(executor instanceof CjsShadowMapExecutor))
    {
      throw new TypeError("Tr2RenderContext.SetShadowMapExecutor expects a CjsShadowMapExecutor or null.");
    }
    this.#shadowMapExecutor = executor;
    return this;
  }

  /** Returns the installed shadow executor, rejecting incomplete composition. */
  GetShadowMapExecutor()
  {
    if (!this.#shadowMapExecutor)
    {
      throw new Error("Tr2RenderContext has no CjsShadowMapExecutor installed.");
    }
    return this.#shadowMapExecutor;
  }

  /**
   * Installs the nominal engine implementation for volumetric realization.
   * Passing null removes it; all physical volumetric operations then fail on
   * use instead of being skipped.
   */
  SetVolumetricsExecutor(executor)
  {
    if (executor !== null && !(executor instanceof CjsVolumetricsExecutor))
    {
      throw new TypeError("Tr2RenderContext.SetVolumetricsExecutor expects a CjsVolumetricsExecutor or null.");
    }
    this.#volumetricsExecutor = executor;
    return this;
  }

  /** Returns the installed volumetrics executor, rejecting incomplete composition. */
  GetVolumetricsExecutor()
  {
    if (!this.#volumetricsExecutor)
    {
      throw new Error("Tr2RenderContext has no CjsVolumetricsExecutor installed.");
    }
    return this.#volumetricsExecutor;
  }

  /**
   * Delegates step setup to the installed nominal executor.
   */
  BeginStep(step, realTime, simTime, job)
  {
    return this.#stepExecutor.BeginStep(step, realTime, simTime, job, this);
  }

  /**
   * Delegates step execution to the installed nominal executor.
   */
  /**
   * Installs the abstraction-layer backend this context drives.
   *
   * `Tr2RenderContextALStub` gives a headless context that still carries
   * correct data; an engine installs its own. Passing null restores the
   * recording fallback.
   *
   * @param {object|null} al The backend.
   * @returns {object|null} The backend now installed.
   */
  SetRenderContextAL(al = null)
  {
    this.#al = al ?? null;

    return this.#al;
  }

  /** The installed backend, or null while recording. */
  GetRenderContextAL()
  {
    return this.#al;
  }

  ExecuteStep(step, realTime, simTime, job)
  {
    return this.#stepExecutor.ExecuteStep(step, realTime, simTime, job, this);
  }

  /**
   * Delegates step teardown to the installed nominal executor.
   */
  EndStep(step, realTime, simTime, job)
  {
    return this.#stepExecutor.EndStep(step, realTime, simTime, job, this);
  }

  /** Opens the render-job batch scope through the installed executor. */
  BeginBatch(owner)
  {
    return this.#stepExecutor.BeginBatch(owner, this);
  }

  /** Closes the render-job batch scope through the installed executor. */
  EndBatch(owner)
  {
    return this.#stepExecutor.EndBatch(owner, this);
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
    // `SetDebugRenderer` takes whatever a render job hands it, and Carbon's
    // own type (`Tr2DebugTextRenderer`) is not ported, so this is a foreign
    // object. Asked explicitly rather than hedged, because the question really
    // is "does this thing clear" and not "is one of our classes incomplete".
    if (typeof this.#debugRenderer?.Clear === "function") this.#debugRenderer.Clear();

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
    this.#stepExecutor.BeginScene(this);
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
  // one point. The frame driver calls this; nothing else may. EndScene is the
  // required final operation even when resetting the transient pool throws.

  /**
   * Rewinds the per-object pool arena at the end of a frame, freeing every
   * transient payload leased during it; a context that never leased one does
   * nothing.
   */
  EndRenderContext()
  {
    try
    {
      this.#poolAllocator?.Reset();
    }
    finally
    {
      this.#stepExecutor.EndScene(this);
    }
    return this;
  }

  /**
   * Saves the target currently bound to a slot, and binds a new one if given.
   *
   * TWO CARBON CALLS IN ONE, AND THAT SPLIT MATTERS. Carbon's abstraction layer
   * takes only a SLOT and saves whatever is bound there
   * (`Tr2RenderContextDx11.cpp:2178-2188`). The two-argument form is the effect
   * state manager's convenience, and it is push THEN set
   * (`Tr2EffectStateManager.cpp:1048-1052`). This context carries the state
   * manager's verbs, so it does both here and asks the backend only to push.
   *
   * This previously pushed the SUPPLIED target and bound nothing, which meant a
   * render job that pushed a target went on drawing into the previous one -
   * silently, and exactly where an offscreen pass would notice least.
   */
  PushRenderTarget(slot = 0)
  {
    const index = Number(slot) >>> 0;

    if (this.#al) return this.#al.PushRenderTarget(index);

    let stack = this.#renderTargetStacks.get(index);

    if (!stack)
    {
      stack = [];
      this.#renderTargetStacks.set(index, stack);
    }

    stack.push(this.#renderTargets.get(index) ?? null);

    return true;
  }

  /**
   * Restores the target saved for a slot, binding it again.
   *
   * Carbon's pop rebinds (`Tr2RenderContextDx11.cpp:2190-2206` ends in
   * `SetRtDsToDevice`), so restoring without binding would leave the pushed
   * target live for the rest of the frame.
   *
   * @returns {boolean} False when nothing was pushed for that slot.
   */
  PopRenderTarget(slot = 0)
  {
    if (this.#al) return this.#al.PopRenderTarget(slot);

    const stack = this.#renderTargetStacks.get(Number(slot) >>> 0);

    if (!stack?.length) return false;

    this.SetRenderTarget(slot, stack.pop());

    return true;
  }

  /** Depth of one slot's render-target stack; zero for a slot never pushed to. */
  GetStackSizeRT(slot = 0)
  {
    if (this.#al) return this.#al.GetStackSizeRT(slot);

    return this.#renderTargetStacks.get(Number(slot) >>> 0)?.length ?? 0;
  }

  /**
   * Saves the bound depth-stencil, and binds a new one if given.
   *
   * The same split as `PushRenderTarget`: Carbon's AL push takes no argument
   * and saves what is bound, while the state manager's one-argument form is
   * push then set (`Tr2EffectStateManager.cpp:1031-1036`).
   */
  PushDepthStencil()
  {
    if (this.#al) return this.#al.PushDepthStencil();

    this.#depthStencilStack.push(this.#depthStencil);

    return true;
  }

  /**
   * Restores the saved depth-stencil, binding it again.
   *
   * @returns {boolean} False when nothing was pushed.
   */
  PopDepthStencil()
  {
    if (this.#al) return this.#al.PopDepthStencil();

    if (!this.#depthStencilStack.length) return false;

    this.SetDepthStencil(this.#depthStencilStack.pop());

    return true;
  }

  /** Depth of the depth-stencil stack. */
  GetStackSizeDS()
  {
    if (this.#al) return this.#al.GetStackSizeDS();

    return this.#depthStencilStack.length;
  }

  /**
   * Binds a render target to a slot and records a set-render-target intent for
   * the engine to realize.
   */
  SetRenderTarget(slot, renderTarget)
  {
    const index = Number(slot) >>> 0;

    if (this.#al) return this.#al.SetRenderTarget(index, renderTarget);

    this.#renderTargets.set(index, renderTarget ?? null);
    this.#intents.push({ type: "set-render-target", slot: index, renderTarget: renderTarget ?? null });
    return true;
  }

  // THE BACKEND'S FRAME CLOCK, WHICH IS NOT THE ONE ABOVE. `AdvanceFrame` and
  // `GetCurrentFrameCounter` are Trinity's - frames the render path has begun,
  // driven by the frame driver. These two are the DEVICE's, and the gap between
  // them is what a ring buffer fences against: rows recorded for a frame cannot
  // be reused until the device reports that frame finished. Carbon keeps them
  // per backend (`Tr2PrimaryRenderContextDx11.h:46-47`), so they are the
  // abstraction layer's to answer and this only forwards.

  /**
   * The frame the device is recording now.
   *
   * @returns {number} The frame number, or zero with no backend installed.
   */
  GetRecordingFrameNumber()
  {
    return this.#al ? this.#al.GetRecordingFrameNumber() : 0;
  }

  /**
   * The last frame the device has finished.
   *
   * @returns {number} The frame number, or zero with no backend installed.
   */
  GetRenderedFrameNumber()
  {
    return this.#al ? this.#al.GetRenderedFrameNumber() : 0;
  }

  /**
   * Whether a device exists behind this context.
   *
   * Carbon's context answers this because it INHERITS the abstraction layer,
   * so every AL call that takes a context - a buffer create, a texture map -
   * can be handed the Trinity one. Ours composes instead, so the question is
   * forwarded rather than inherited, and the callers read the same.
   *
   * @returns {boolean} True once a backend is installed and has a device.
   */
  IsValid()
  {
    return this.#al ? this.#al.IsValid() : false;
  }

  /**
   * The extent of a bound render target.
   *
   * Carbon's context answers this because it IS the abstraction layer
   * (`Tr2RenderContextDx11.cpp` GetRenderTargetSize), and the effect state
   * manager asks it rather than measuring a texture, because a bound target
   * may be a null one.
   *
   * @param {number} [slot] Target slot.
   * @returns {{result: number, width: number, height: number}} The extent.
   */
  GetRenderTargetSize(slot = 0)
  {
    if (this.#al) return this.#al.GetRenderTargetSize(slot);

    // Nothing knows a bound target's extent on the recording path; that is
    // why SetFullScreenViewport defers there rather than answering.
    return { result: ALResult.E_FAIL, width: 0, height: 0 };
  }

  /**
   * The render target currently bound to a slot, or null when that slot was
   * never set.
   *
   * THE BACKEND OWNS THE BINDING WHEN THERE IS ONE. Carbon has no split to
   * bridge here - its `Tr2RenderContext` IS `Tr2RenderContextBase` plus
   * `Tr2RenderContextAL`, so there is one piece of state. Ours composes the two,
   * and a getter that answered from the recording path while the backend held
   * the real binding would report a target nothing is drawing to.
   */
  GetRenderTarget(slot = 0)
  {
    if (this.#al) return this.#al.GetRenderTarget(slot);

    return this.#renderTargets.get(Number(slot) >>> 0) ?? null;
  }

  /** Binds the depth-stencil surface and records a set-depth-stencil intent. */
  SetDepthStencil(depthStencil)
  {
    if (this.#al) return this.#al.SetDepthStencil(depthStencil);

    this.#depthStencil = depthStencil ?? null;
    this.#intents.push({ type: "set-depth-stencil", depthStencil: this.#depthStencil });
    return true;
  }

  /** The currently bound depth-stencil surface, or null. */
  GetDepthStencil()
  {
    if (this.#al) return this.#al.GetDepthStencil();

    return this.#depthStencil;
  }

  /**
   * Records a clear intent with separate colour, depth and stencil enables; the
   * colour is snapshotted by value so a caller's reusable buffer cannot mutate
   * the queued intent.
   */
  Clear(options)
  {
    if (this.#al) return this.#al.Clear(options);

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

  /**
   * What the installed backend can do.
   *
   * Carbon reaches capabilities through the context and nowhere else
   * (`TriDevice.cpp:1295-1300,1399-1403` both read
   * `renderContext.GetCaps().SupportsX()`), so this is the only door.
   *
   * With no backend there is nothing to ask, and answering anyway would mean
   * inventing a capability set - so it fails rather than guessing.
   *
   * @returns {object} The backend capabilities.
   */
  GetCaps()
  {
    if (!this.#al)
    {
      throw new Error("Tr2RenderContext has no render-context AL installed; capabilities belong to one.");
    }

    return this.#al.GetCaps();
  }

  // THE GEOMETRY BINDING FAMILY, which forwards to the AL and fails without one.
  //
  // Every other verb here has a recording fallback, because the intent stream
  // has a vocabulary for it. These have none, and inventing one would be
  // building exactly what the WebGPU AL is about to replace. Carbon's
  // `SubmitGeometry` (`Tr2RenderContext.cpp:83-103`) is the sequence they
  // exist for: topology, then the declaration, streams and indices through the
  // state manager's `Apply*` redundancy filter, then the draw.

  /**
   * Sets the primitive topology for following draws.
   *
   * @param {number} topology A `Topology` value, NOT a `D3dPrimitiveTopology`.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetTopology(topology)
  {
    return this.#requireAL("SetTopology").SetTopology(topology);
  }

  /**
   * The per-object constant buffer for one slot, created on first use.
   *
   * Carbon `Tr2RenderContext::GetConstantBuffer` (`Tr2RenderContext.h:56-59`),
   * which returns a pointer into `m_perObjectConstantBuffers` - an array of
   * `CBUFFER_COUNT` value members, one per shader stage plus a GUI slot.
   *
   * THE CONTEXT OWNING THESE IS THE POINT, not an implementation detail.
   * `RenderBatchGroup` collects them once and hands the same array to every
   * batch in a group, so a group of two hundred objects refills one buffer per
   * stage rather than allocating two hundred. A per-draw allocation would be
   * correct and unusably slow.
   *
   * Carbon default-constructs them eagerly and they are invalid until
   * `FillAndSetConstants` creates one at the size it needs; ours are made on
   * first ask, which reaches the same state without holding seven objects a
   * headless context never uses.
   *
   * @param {number} slot A `ShaderType`, or `CBUFFER_GUI`.
   * @returns {object|null} A `Tr2ConstantBufferAL`, or null for a bad slot.
   */
  GetConstantBuffer(slot)
  {
    if (!Number.isInteger(slot) || slot < 0 || slot >= ConstantBufferSlot.CBUFFER_COUNT) return null;

    this.#perObjectConstantBuffers[slot] ??= new Tr2ConstantBufferALStub();

    return this.#perObjectConstantBuffers[slot];
  }

  /**
   * Every per-object constant buffer, in slot order, for handing to a batch
   * group. Carbon builds this array on the stack in `RenderBatchGroup`.
   *
   * @returns {Array<object>} One `Tr2ConstantBufferAL` per slot.
   */
  GetConstantBuffers()
  {
    return Array.from(
      { length: ConstantBufferSlot.CBUFFER_COUNT },
      (unused, slot) => this.GetConstantBuffer(slot)
    );
  }

  #perObjectConstantBuffers = new Array(ConstantBufferSlot.CBUFFER_COUNT).fill(null);

  /**
   * Binds a realized resource set for following draws.
   *
   * Carbon's `Tr2Material::ApplyMaterialDataForPass` ends in exactly this call.
   * Trinity fills a `Tr2ResourceSetDescriptionAL`, the abstraction layer turns
   * it into whatever its API calls a bind group, and this binds the result.
   *
   * @param {object} resourceSet A `Tr2ResourceSetAL`.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetResourceSet(resourceSet)
  {
    return this.#requireAL("SetResourceSet").SetResourceSet(resourceSet);
  }

  /**
   * Binds a constant buffer to one shader stage at one register.
   *
   * @param {object} buffer A `Tr2ConstantBufferAL`.
   * @param {number} constantType A `ShaderType`.
   * @param {number} registerIndex The constant-buffer register.
   * @param {number} [maxRegisterCount] Carbon's optional bound.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetConstants(buffer, constantType, registerIndex, maxRegisterCount = 0)
  {
    return this.#requireAL("SetConstants").SetConstants(buffer, constantType, registerIndex, maxRegisterCount);
  }

  /**
   * Binds one vertex stream. Reached through `ApplyStreamSource`, which filters
   * a redundant bind out first.
   *
   * @param {number} stream The stream index.
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} offset Byte offset into the buffer.
   * @param {number} stride Bytes per vertex.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetStreamSource(stream, buffer, offset, stride)
  {
    return this.#requireAL("SetStreamSource").SetStreamSource(stream, buffer, offset, stride);
  }

  /**
   * Binds the index buffer. Reached through `ApplyIndexBuffer`.
   *
   * @param {object} buffer A `Tr2BufferAL`.
   * @param {number} [stride] Bytes per index.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetIndices(buffer, stride = 0)
  {
    return this.#requireAL("SetIndices").SetIndices(buffer, stride);
  }

  /**
   * Binds the vertex declaration. Reached through `ApplyVertexDeclaration`.
   *
   * @param {object} layout A `Tr2VertexLayoutAL`.
   * @returns {boolean} Whether the AL accepted it.
   */
  SetVertexLayout(layout)
  {
    return this.#requireAL("SetVertexLayout").SetVertexLayout(layout);
  }

  /**
   * Draws the bound geometry, indexed.
   *
   * @param {number} indexCountPerInstance Indices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startIndexLocation First index to read.
   * @param {number} baseVertexLocation Value added to every index.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the AL accepted it.
   */
  DrawIndexedInstanced(
    indexCountPerInstance,
    instanceCount,
    startIndexLocation,
    baseVertexLocation,
    startInstanceLocation
  )
  {
    return this.#requireAL("DrawIndexedInstanced").DrawIndexedInstanced(
      indexCountPerInstance,
      instanceCount,
      startIndexLocation,
      baseVertexLocation,
      startInstanceLocation
    );
  }

  /**
   * Draws the bound geometry, non-indexed.
   *
   * @param {number} vertexCountPerInstance Vertices each instance reads.
   * @param {number} instanceCount Instances to draw.
   * @param {number} startVertexLocation First vertex to read.
   * @param {number} startInstanceLocation First instance id.
   * @returns {boolean} Whether the AL accepted it.
   */
  DrawInstanced(vertexCountPerInstance, instanceCount, startVertexLocation, startInstanceLocation)
  {
    return this.#requireAL("DrawInstanced").DrawInstanced(
      vertexCountPerInstance,
      instanceCount,
      startVertexLocation,
      startInstanceLocation
    );
  }

  /**
   * The installed backend, or a failure naming the verb that needed one.
   *
   * @param {string} verb The verb being forwarded.
   * @returns {object} The render-context AL.
   */
  #requireAL(verb)
  {
    if (!this.#al)
    {
      throw new Error(`Tr2RenderContext has no render-context AL installed; ${verb} binds on a device.`);
    }

    return this.#al;
  }

  /**
   * The effect state manager this context owns.
   *
   * @returns {Tr2EffectStateManager} The manager.
   */
  GetEffectStateManager()
  {
    return this.#esm;
  }

  /** GPU-free validity check: any non-null render target counts as valid. */
  IsRenderTargetValid(renderTarget)
  {
    if (this.#al) return this.#al.IsRenderTargetValid(renderTarget);

    return renderTarget != null;
  }

  /**
   * Records a resolve intent moving a multisampled source into a resolved
   * destination.
   */
  ResolveRenderTarget(source, destination)
  {
    if (this.#al) return this.#al.ResolveRenderTarget(source, destination);

    this.#intents.push({ type: "resolve-render-target", source, destination });
    return true;
  }

  /**
   * Records a copy-render-target intent, spreading the caller's descriptor
   * fields into it.
   */
  CopyRenderTarget(intent)
  {
    if (this.#al) return this.#al.CopyRenderTarget(intent);

    this.#intents.push({ type: "copy-render-target", ...intent });
    return true;
  }

  /** Records a generate-mipmaps intent for a render target. */
  GenerateMipMaps(renderTarget)
  {
    if (this.#al) return this.#al.GenerateMipMaps(renderTarget);

    this.#intents.push({ type: "generate-mipmaps", renderTarget });
    return true;
  }

  /**
   * Records a render-object intent naming a renderable, with any extra options
   * merged into the intent.
   */
  /**
   * Records a submission of one finalized batch accumulator.
   *
   * Carbon's RenderBatches (Tr2RenderContext.h:37-52) walks the accumulator and
   * issues draws immediately. Ours records the intent and an engine drains it,
   * for the reason this whole class records rather than executes: a WebGPU pass
   * is an object with a fixed attachment set, so the submission point is decided
   * when the frame is planned rather than when Trinity asks.
   *
   * The accumulator is passed by reference, not copied. It is finalized by the
   * time it arrives - sorting and grouping are Trinity's - and copying it would
   * lose the group runs that Finalize wrote.
   *
   * @param {object} batches Finalized accumulator.
   * @param {string} [techniqueName] Carbon's DEFAULT_TECHNIQUE.
   * @returns {boolean} Whether the submission was recorded.
   */
  RenderBatches(batches, techniqueName = DEFAULT_TECHNIQUE)
  {
    if (!batches) return false;

    this.#intents.push({ type: "render-batches", batches, techniqueName });
    return true;
  }

  /**
   * Records a submission drawn with a material substituted for every batch's
   * own, which is how Carbon renders a depth or picking pass over geometry
   * authored for colour (RenderBatchesWithOverride, Tr2RenderContext.cpp:806).
   *
   * A null override is Carbon's own no-op: it falls straight through to
   * RenderBatches (cpp:810-814), and a port that treated null as "no draw"
   * would silently drop the default visualizer path.
   *
   * @param {object} batches Finalized accumulator.
   * @param {object|null} overrideMaterial Material to substitute, or null.
   * @param {string} [techniqueName] Carbon's DEFAULT_TECHNIQUE.
   * @returns {boolean} Whether the submission was recorded.
   */
  RenderBatchesWithOverride(batches, overrideMaterial = null, techniqueName = DEFAULT_TECHNIQUE)
  {
    if (!batches) return false;
    if (!overrideMaterial) return this.RenderBatches(batches, techniqueName);

    this.#intents.push({
      type: "render-batches",
      batches,
      techniqueName,
      overrideMaterial
    });
    return true;
  }

  /**
   * Records a submission for picking, which Carbon separates because it reads
   * the batch's user data as an object id rather than shading it
   * (RenderBatchesForPicking, Tr2RenderContext.h:44).
   *
   * @param {object} batches Finalized accumulator.
   * @param {string} [techniqueName] Carbon's DEFAULT_TECHNIQUE.
   * @returns {boolean} Whether the submission was recorded.
   */
  RenderBatchesForPicking(batches, techniqueName = DEFAULT_TECHNIQUE)
  {
    if (!batches) return false;

    this.#intents.push({ type: "render-batches", batches, techniqueName, picking: true });
    return true;
  }

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
    if (this.#al) return this.#al.ClearUav(buffer, value, clearWithFloat);

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
    if (this.#al) return this.#al.RunComputeShader(effect, groupDimX, groupDimY, groupDimZ);

    this.#intents.push({ type: "run-compute-shader", effect, groupDimX, groupDimY, groupDimZ });
    return true;
  }

  /**
   * Records an indirect compute-dispatch intent reading its group counts from a
   * buffer at the given byte offset.
   */
  RunComputeShaderIndirect(effect, indirectionBuffer, offsetForArgs = 0)
  {
    if (this.#al) return this.#al.RunComputeShaderIndirect(effect, indirectionBuffer, offsetForArgs);

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
    if (this.#al) return this.#al.PresentSwapChain(swapChain);

    this.#intents.push({ type: "present-swap-chain", swapChain });
    return true;
  }

  /**
   * Caches the viewport and records a set-viewport intent; the viewport object
   * is held by reference, not copied.
   */
  SetViewport(viewport)
  {
    if (this.#al) return this.#al.SetViewport(viewport);

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
    // With a backend installed there is nothing to defer: it knows the bound
    // target's extent, so "full screen" resolves here. Without one the extent
    // is not known until realization, which is why the recording path defers it
    // as its own intent.
    if (this.#al)
    {
      const size = this.#al.GetRenderTargetSize(0);

      if (Failed(size.result)) return false;

      this.#esm.UpdateRenderTargetViewport(size.width, size.height);
      this.#esm.SetupViewport();

      return true;
    }

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
    if (this.#al) return this.#al.GetViewport();

    return this.#viewport;
  }

  // The viewport save stack is the effect state manager's, not this context's
  // (`TriStepPushViewport.cpp:9` pushes through `renderContext.m_esm`). It used
  // to live here, which put the authored viewport in one place and the stack
  // that saves it in another.

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
   * Copies the active 4x4 projection matrix and records it as an intent.
   * Tr2RenderContext owns this matrix so later caller mutations cannot change
   * the state observed by frame consumers.
   */
  SetProjection(projection, fieldOfView = undefined)
  {
    if (!projection || projection.length !== 16)
    {
      throw new TypeError("Tr2RenderContext.SetProjection requires a 16-element matrix");
    }
    if (!this.#projection) this.#projection = mat4.create();
    mat4.copy(this.#projection, projection);
    this.#fieldOfView = fieldOfView === undefined
      ? (projection[5] ? 2 * Math.atan(1 / projection[5]) : 0)
      : Number(fieldOfView);
    this.#intents.push({ type: "set-projection", projection: mat4.clone(this.#projection) });
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

  /**
   * The vertical field of view cached when the active projection was set.
   * This is Carbon's Tr2Renderer::GetFieldOfView state, cached on the context.
   */
  GetFieldOfView()
  {
    return this.#fieldOfView;
  }

  // Save/restore stack for the current projection (Carbon Push/PopProjection).

  /** Saves the current projection on its own save/restore stack. */
  PushProjection()
  {
    this.#projectionStack.push({
      projection: this.#projection ? mat4.clone(this.#projection) : null,
      fieldOfView: this.#fieldOfView
    });
    return true;
  }

  /**
   * Restores the last pushed projection and re-records a set-projection intent;
   * returns false when the stack is empty.
   */
  PopProjection()
  {
    if (!this.#projectionStack.length) return false;
    const saved = this.#projectionStack.pop();
    if (saved.projection)
    {
      if (!this.#projection) this.#projection = mat4.create();
      mat4.copy(this.#projection, saved.projection);
    }
    else
    {
      this.#projection = null;
    }
    this.#fieldOfView = saved.fieldOfView;
    this.#intents.push({
      type: "set-projection",
      projection: this.#projection ? mat4.clone(this.#projection) : null
    });
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
      if (!(batch instanceof Tr2RenderBatch))
      {
        throw new TypeError("Tr2RenderContext.TechniqueInBatch expects Tr2RenderBatch entries.");
      }
      const shader = batch.shader;
      if (shader === null || shader === prevShader)
      {
        continue;
      }
      if (!(shader instanceof Tr2Shader))
      {
        throw new TypeError("Tr2RenderBatch.shader must be a Tr2Shader or null.");
      }
      prevShader = shader;
      const technique = shader.GetTechniqueIndex(techniqueName);
      if (technique < 0)
      {
        continue;
      }
      if (shader.GetPassCount(technique) > 0)
      {
        return true;
      }
    }
    return false;
  }

  static #defaultContext = new Tr2RenderContext();
}
