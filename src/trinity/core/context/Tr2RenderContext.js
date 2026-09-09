// Source: trinity/trinity/Tr2RenderContext.h (name/role)
//   trinity/trinityal/*/Tr2RenderContext*.h (command surface)
//   trinity/trinity/Tr2Renderer.cpp (view-state statics, relocated here)
// Hand-maintained amalgam of three Carbon surfaces (audited 2026-07-18):
// 1. The command surface (PushRenderTarget/Clear/SetViewport/Present/
//    SetRenderState/...) mirrors the backend AL context classes and CALLS the
//    installed backend, as Carbon does.
//
//    IT USED TO RECORD INTENTS, and that mechanism is gone (2026-09-06). The
//    recording existed because "the engine does device work" was read as the
//    trinityal/webgpu PACKAGE rather than the abstraction layer, so a queue was
//    invented to carry work across a boundary Carbon does not have.
//
//    THE BACKEND IS NEVER ABSENT. Carbon's context INHERITS Tr2RenderContextAL,
//    a compile-time platform typedef, so it cannot be missing one; ours
//    defaults the field to the stub for the same guarantee. A bare context is
//    therefore headless, not broken - see the field's own comment.
//
//    Four verbs refuse outright rather than pretend: DrawLineSet, RenderAtlas,
//    RenderLineGraphs and RenderDebug are unported and name what they need.
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
import { ALResult, Failed } from "../../../trinityal/ALResult.js";
import { ConstantBufferSlot } from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { TriPoolAllocator } from "../rawData/TriPoolAllocator.js";
import { CjsDirectTrinityStepExecutor } from "./CjsDirectTrinityStepExecutor.js";
import { CjsShadowMapExecutor } from "./CjsShadowMapExecutor.js";
import { CjsTrinityStepExecutor } from "./CjsTrinityStepExecutor.js";
import { CjsVolumetricsExecutor } from "./CjsVolumetricsExecutor.js";
import { Tr2RenderBatch } from "../batch/Tr2RenderBatch.js";
import { Tr2Shader } from "#resource/shader";
import { Tr2EffectStateManager } from "../../shader/Tr2EffectStateManager.js";
import { Tr2RenderContextALStub } from "../../../trinityal/stub/Tr2RenderContextALStub.js";
import { Tr2Blitter } from "../Tr2Blitter.js";

const DIRECT_STEP_EXECUTOR = Object.freeze(new CjsDirectTrinityStepExecutor());

/** Carbon DEFAULT_TECHNIQUE (Tr2RenderContext.h:37). */
const DEFAULT_TECHNIQUE = "Main";

/** Tr2RenderContext (trinityCore) - generated from schema shapeHash 73e2a4e7.... */
@type.define({ className: "Tr2RenderContext", family: "trinityCore" })
export class Tr2RenderContext extends CjsModel
{
  #diagnostics = [];

  #stepExecutor = DIRECT_STEP_EXECUTOR;

  #shadowMapExecutor = null;

  #volumetricsExecutor = null;

  /**
   * The abstraction-layer backend. THERE IS ALWAYS ONE.
   *
   * Carbon's context does not hold a backend, it IS one:
   *
   *     BLUE_CLASS( Tr2RenderContext ) :
   *         public Tr2RenderContextBase,
   *         public Tr2RenderContextAL      // Tr2RenderContext.h:85-87
   *
   * `Tr2RenderContextAL` is a compile-time platform typedef - dx11, dx12, metal
   * or stub - so a context without a backend is structurally impossible there.
   * Carbon therefore has no fallback for the case AND no error for it either.
   *
   * We compose rather than inherit, so the field could be empty; defaulting it
   * to the stub is how the state stays impossible. A bare `new
   * Tr2RenderContext()` then behaves exactly as Carbon compiled against its
   * stub backend does: real render-target and depth-stencil stacks, real sizes,
   * draws counted, nothing drawn, and `IsValid()` false until `CreateDevice`.
   *
   * TWO EARLIER ANSWERS HERE WERE BOTH INVENTED. The first was to RECORD every
   * verb into an intent queue when no backend was installed; the second, while
   * removing that, was to THROW. Carbon does neither, because Carbon never
   * reaches the state. Deleting a behaviour still means choosing what stands in
   * its place, and that choice needs a citation like any other.
   */
  #al = new Tr2RenderContextALStub();

  // Carbon's context OWNS its state manager as a public member
  // (`Tr2RenderContext.h:35`), and its render steps reach the Trinity-level
  // verbs through it - `renderContext.m_esm.SetViewport(...)`
  // (`TriStepSetViewport.cpp:25`). Ours composes rather than inherits, so the
  // manager is bound to this context once and never rebound.

  /** m_esm */
  #esm = new Tr2EffectStateManager().SetRenderContext(this);

  /** Carbon's s_blitter, per context rather than per process; see GetBlitter. */
  #blitter = null;

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
    // Null RESTORES THE STUB rather than emptying the field: Carbon cannot
    // detach a backend, so neither can this.
    this.#al = al ?? new Tr2RenderContextALStub();

    return this.#al;
  }

  /** The installed backend; never null. */
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
   * Clears the per-object pool arena at the end of a frame, freeing every
   * transient payload leased during it (Carbon calls TriPoolAllocator::Clear
   * here, Tr2Renderer.cpp:1072-1081); a context that never leased one does
   * nothing.
   */
  EndRenderContext()
  {
    try
    {
      this.#poolAllocator?.Clear();
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

    return this.#requireAL("PushRenderTarget").PushRenderTarget(index);
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
    return this.#requireAL("PopRenderTarget").PopRenderTarget(slot);
  }

  /** Depth of one slot's render-target stack; zero for a slot never pushed to. */
  GetStackSizeRT(slot = 0)
  {
    return this.#requireAL("GetStackSizeRT").GetStackSizeRT(slot);
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
    return this.#requireAL("PushDepthStencil").PushDepthStencil();
  }

  /**
   * Restores the saved depth-stencil, binding it again.
   *
   * @returns {boolean} False when nothing was pushed.
   */
  PopDepthStencil()
  {
    return this.#requireAL("PopDepthStencil").PopDepthStencil();
  }

  /** Depth of the depth-stencil stack. */
  GetStackSizeDS()
  {
    return this.#requireAL("GetStackSizeDS").GetStackSizeDS();
  }

  /**
   * Binds a render target to a slot and records a set-render-target intent for
   * the engine to realize.
   */
  SetRenderTarget(slot, renderTarget)
  {
    // THE BACKEND OWNS THE BINDING, as Carbon's do (m_boundRenderTarget), and
    // GetRenderTarget below reads it back from there. The context kept a
    // duplicate map while it was also a recorder; two copies of one binding is
    // one too many, and the local one was the stale half.
    return this.#requireAL("SetRenderTarget").SetRenderTarget(Number(slot) >>> 0, renderTarget);
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
    return this.#requireAL("GetRenderTargetSize").GetRenderTargetSize(slot);
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
    return this.#requireAL("GetRenderTarget").GetRenderTarget(slot);
  }

  /** Binds the depth-stencil surface and records a set-depth-stencil intent. */
  SetDepthStencil(depthStencil)
  {
    this.#depthStencil = depthStencil ?? null;

    return this.#requireAL("SetDepthStencil").SetDepthStencil(this.#depthStencil);
  }

  /** The currently bound depth-stencil surface, or null. */
  GetDepthStencil()
  {
    return this.#requireAL("GetDepthStencil").GetDepthStencil();
  }

  /**
   * Clears the bound attachments, with separate colour, depth and stencil
   * enables.
   *
   * @param {object} options `{ color, depth, stencil, clearColor, clearDepth,
   *   clearStencil }`.
   * @returns {boolean} Whether the backend accepted the clear.
   */
  Clear(options)
  {
    return this.#requireAL("Clear").Clear(options);
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

    // The backend's kind, not the stub's. This constructed `Tr2ConstantBufferALStub`
    // directly, so per-object constants landed in a CPU shadow on every
    // backend - the same hard-wiring `Tr2RingBuffer` had, fixed the same way.
    this.#perObjectConstantBuffers[slot] ??= this.CreateConstantBuffer();

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
   * Creates a buffer of the running backend's kind.
   *
   * Carbon's `Tr2BufferAL` is a compile-time platform typedef, so a Trinity
   * class declares one and the build picks the implementation. Here the context
   * picks it, which is the same authority: Carbon's `Create` already takes a
   * `Tr2PrimaryRenderContextAL&`. A Trinity class that imports a concrete
   * buffer instead picks a backend at authoring time.
   *
   * @param {object} description A `Tr2BufferDescriptionAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} The buffer, or null when the backend refused.
   */
  CreateBuffer(description, initialData = null)
  {
    return this.#requireAL("CreateBuffer").CreateBuffer(description, initialData);
  }

  /**
   * Creates a constant buffer of the running backend's kind.
   *
   * The same reason `CreateBuffer` is here. Carbon default-constructs a
   * `Tr2ConstantBufferAL` member and sizes it later (`FillAndSetConstants`,
   * `Tr2MaterialStageInput::AllocateConstants`); a caller here asks for the
   * empty object with no size and fills it the same way.
   *
   * @param {number} [size] Bytes; zero returns an empty, invalid buffer.
   * @param {number} [usage] A `Tr2ConstantUsageAL`.
   * @param {ArrayBufferView|null} [initialData] Initial contents, if any.
   * @returns {object|null} A `Tr2ConstantBufferAL`, or null when a sized Create refused.
   */
  CreateConstantBuffer(size = 0, usage = undefined, initialData = null)
  {
    return this.#requireAL("CreateConstantBuffer").CreateConstantBuffer(size, usage, initialData);
  }

  /**
   * The running backend's sampler state for a description.
   *
   * Carbon's `Tr2SamplerStateAL::Create` is a factory lookup on the primary
   * context; equal descriptions are one state. Created at effect load
   * (`Tr2EffectDescription.cpp:436`) and for sampler overrides
   * (`Tr2Effect.cpp:690`), both through the main-thread context, which is
   * `GetDefault()` here.
   *
   * @param {object} description A `Tr2SamplerDescription`.
   * @returns {object|null} A `Tr2SamplerStateAL`, shared, or null.
   */
  CreateSamplerState(description)
  {
    return this.#requireAL("CreateSamplerState").CreateSamplerState(description);
  }

  /**
   * Creates a resource set of the running backend's kind from a filled
   * description and the realized program it binds against.
   *
   * Carbon's `Tr2ResourceSetAL::Create( description, program, context )` is a
   * member call on a default-constructed set (`Tr2Material.cpp:234`); the
   * context makes it here for the reason `CreateBuffer` is here.
   *
   * @param {object} description A `Tr2ResourceSetDescriptionAL`.
   * @param {object} program A `Tr2ShaderProgramAL`.
   * @returns {object|null} A `Tr2ResourceSetAL`, or null when Create refused.
   */
  CreateResourceSet(description, program)
  {
    return this.#requireAL("CreateResourceSet").CreateResourceSet(description, program);
  }

  /**
   * Creates the running backend's vertex layout from a vertex definition.
   *
   * The same reason `CreateBuffer` is here. Carbon's effect state manager holds
   * a `Tr2VertexLayoutAL` in its own intern table and calls `hvl.Create` on
   * first use (`Tr2EffectStateManager.cpp:899-906`), which it can do because
   * one backend is compiled. The manager here cannot name a layout class, so it
   * asks the context, which knows which backend it holds.
   *
   * @param {object[]|object} definition The vertex element list or definition.
   * @returns {object|null} A `Tr2VertexLayoutAL`, or null when Create refused.
   */
  CreateVertexLayout(definition)
  {
    return this.#requireAL("CreateVertexLayout").CreateVertexLayout(definition);
  }

  /**
   * Creates one shader stage on the running backend.
   *
   * @param {number} stageType A `ShaderType`.
   * @param {ArrayBufferView|string} bytecode The stage's bytecode.
   * @param {object|null} signature The reflected signature.
   * @param {string} [shaderPath] A debug label.
   * @returns {object|null} A `Tr2ShaderAL`, or null when Create refused.
   */
  CreateShader(stageType, bytecode, signature, shaderPath = "")
  {
    return this.#requireAL("CreateShader").CreateShader(stageType, bytecode, signature, shaderPath);
  }

  /**
   * Links created stages into a program on the running backend.
   *
   * @param {object[]} shaders The stages to link.
   * @returns {object|null} A `Tr2ShaderProgramAL`, or null when Create refused.
   */
  CreateShaderProgram(shaders)
  {
    return this.#requireAL("CreateShaderProgram").CreateShaderProgram(shaders);
  }

  /**
   * Binds the shader program following draws use.
   *
   * Carbon's effect state manager calls this from `ApplyShaderProgram`
   * (`Tr2EffectStateManager.cpp:770-776`), and a NULL program is the unbind its
   * else branch performs with a default-constructed one. This context had no
   * such method at all until 2026-09-09, which is why the manager recorded a
   * handle and bound nothing.
   *
   * @param {object|null} shaderProgram A `Tr2ShaderProgramAL`, or null to unbind.
   * @returns {boolean} Whether the backend accepted it.
   */
  SetShaderProgram(shaderProgram)
  {
    return this.#requireAL("SetShaderProgram").SetShaderProgram(shaderProgram);
  }

  /**
   * The fullscreen-quad blitter, created on first use.
   *
   * WHERE CARBON PUTS IT, AND WHY WE DO NOT. Carbon holds one in a file-scope
   * `s_blitter` in `Tr2Renderer.cpp:25`, immediately under its own comment:
   * "The whole s_blitter thing needs to be rethough anyway." Its
   * `DrawTexture`/`DrawFullScreenWithShader` statics are three-line wrappers
   * that null-check it.
   *
   * Ours is per-context because `Tr2Renderer` here is deliberately NOT a
   * process-wide singleton - see that file's head comment, which explains that
   * two libraries with two resource managers would silently share one. The
   * blitter owns a vertex buffer created against a context, so a context is
   * exactly the lifetime it wants, and every render step already has one.
   *
   * @returns {Tr2Blitter} The blitter.
   */
  GetBlitter()
  {
    this.#blitter ??= new Tr2Blitter();

    return this.#blitter;
  }

  // Carbon's four immediate draws (Tr2RenderContext.h). Trinity calls these
  // directly - Tr2Blitter ends DrawHelper with SetTopology + DrawPrimitive, and
  // TriStepRenderDebug draws its line vertices with DrawPrimitiveUP - so the
  // context needs them even though the AL is what does the work. They were
  // missing for the usual reason: the batch path never reaches them, and the
  // batch path was all that had been driven.

  /**
   * Draws non-indexed from the bound stream source.
   *
   * @param {number} startVertex First vertex to read.
   * @param {number} primitiveCount Primitives to draw.
   * @returns {boolean} Whether the AL accepted the draw.
   */
  DrawPrimitive(startVertex, primitiveCount)
  {
    return this.#requireAL("DrawPrimitive").DrawPrimitive(startVertex, primitiveCount);
  }

  /**
   * Draws indexed from the bound stream source and index buffer.
   *
   * @param {number} numVertices Vertices the index range spans.
   * @param {number} startIndex First index to read.
   * @param {number} primitiveCount Primitives to draw.
   * @param {number} [minimumIndex] Smallest index value in the range.
   * @returns {boolean} Whether the AL accepted the draw.
   */
  DrawIndexedPrimitive(numVertices, startIndex, primitiveCount, minimumIndex = 0)
  {
    return this.#requireAL("DrawIndexedPrimitive").DrawIndexedPrimitive(numVertices, startIndex, primitiveCount, minimumIndex);
  }

  /**
   * Draws non-indexed straight from caller memory, with no buffer bound.
   *
   * @param {number} primitiveCount Primitives to draw.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether the AL accepted the draw.
   */
  DrawPrimitiveUP(primitiveCount, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return this.#requireAL("DrawPrimitiveUP").DrawPrimitiveUP(primitiveCount, vertexStreamZeroData, vertexStreamZeroStride);
  }

  /**
   * Draws indexed straight from caller memory. The index width is carried by
   * the array's own type rather than Carbon's two separate overloads.
   *
   * @param {number} numVertices Vertices the index data spans.
   * @param {number} primitiveCount Primitives to draw.
   * @param {ArrayBufferView} indexData The indices.
   * @param {ArrayBufferView} vertexStreamZeroData The vertices.
   * @param {number} vertexStreamZeroStride Bytes per vertex.
   * @returns {boolean} Whether the AL accepted the draw.
   */
  DrawIndexedPrimitiveUP(numVertices, primitiveCount, indexData, vertexStreamZeroData, vertexStreamZeroStride)
  {
    return this.#requireAL("DrawIndexedPrimitiveUP")
      .DrawIndexedPrimitiveUP(numVertices, primitiveCount, indexData, vertexStreamZeroData, vertexStreamZeroStride);
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
  // There is no "no backend" case to guard - the field defaults to the stub and
  // a null assignment restores it. What remains worth checking is whether the
  // installed backend implements the verb: without this, a backend that has not
  // yet ported one fails as "this.#al.Foo is not a function" from inside a
  // pass-through, which reads like a typo in Trinity rather than a gap in the
  // backend.
  #requireAL(verb)
  {
    if (typeof this.#al[verb] !== "function")
    {
      throw new Error(`${this.#al.constructor.name} does not implement ${verb}.`);
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
    return this.#requireAL("IsRenderTargetValid").IsRenderTargetValid(renderTarget);
  }

  /**
   * Records a resolve intent moving a multisampled source into a resolved
   * destination.
   */
  ResolveRenderTarget(source, destination)
  {
    return this.#requireAL("ResolveRenderTarget").ResolveRenderTarget(source, destination);
  }

  /**
   * Records a copy-render-target intent, spreading the caller's descriptor
   * fields into it.
   */
  CopyRenderTarget(intent)
  {
    return this.#requireAL("CopyRenderTarget").CopyRenderTarget(intent);
  }

  /** Records a generate-mipmaps intent for a render target. */
  GenerateMipMaps(renderTarget)
  {
    return this.#requireAL("GenerateMipMaps").GenerateMipMaps(renderTarget);
  }

  /**
   * Records a submission of one finalized batch accumulator.
   *
   * Carbon's RenderBatches (Tr2RenderContext.h:37-52) walks the accumulator and
   * issues draws immediately, and so does ours once a backend is installed.
   *
   * THE OLD REASON FOR RECORDING WAS WRONG. It said a WebGPU pass has a fixed
   * attachment set, so the submission point must be decided when the frame is
   * PLANNED rather than when Trinity asks. Metal has exactly the same
   * constraint and Carbon does not plan: its work queue opens a pass lazily, at
   * the moment work needs one. Ours does the same, so there is nothing to
   * decide ahead of time.
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

    return this.#requireAL("RenderBatches").RenderBatches(batches, techniqueName);
  }

  /**
   * Binds one batch's geometry and draws it.
   *
   * Carbon's free function `SubmitGeometry` (`Tr2RenderContext.cpp:83-103`),
   * verbatim in order: topology, declaration, both streams, then either the
   * index buffer and an indexed draw or a non-indexed one.
   *
   * A STREAM HERE MAY BE A DESCRIPTOR RATHER THAN A BUFFER. Carbon's batches
   * carry realized allocations because `Tr2MeshBase::CreateGeometryBatch` bakes
   * them in during collection; ours carry a geometry-resource descriptor that
   * something realizes later (`Tr2RenderBatch.geometrySource`). This passes
   * whatever the batch holds, exactly as Carbon does, and it is the backend's
   * business what it receives - which is the point of the boundary.
   *
   * @param {object} batch A `Tr2RenderBatch`.
   * @returns {boolean} Whether the draw was accepted.
   */
  SubmitGeometry(batch)
  {
    this.SetTopology(batch.topology);
    this.#esm.ApplyVertexDeclaration(batch.vertexDeclaration);

    if (batch.vertexStreams[0]) this.#esm.ApplyStreamSource(0, batch.vertexStreams[0], 0, batch.stride[0]);
    if (batch.vertexStreams[1]) this.#esm.ApplyStreamSource(1, batch.vertexStreams[1], 0, batch.stride[1]);

    if (batch.indexBuffer)
    {
      this.#esm.ApplyIndexBuffer(batch.indexBuffer, batch.indexStride);

      return this.DrawIndexedInstanced(
        batch.indexCountPerInstance,
        batch.instanceCount,
        batch.startIndexLocation,
        batch.baseVertexLocation,
        batch.startInstanceLocation
      );
    }

    return this.DrawInstanced(
      batch.indexCountPerInstance,
      batch.instanceCount,
      batch.startIndexLocation,
      batch.startInstanceLocation
    );
  }

  /**
   * Draws every batch in the accumulator's own order.
   *
   * Carbon `Tr2RenderContextBase::RenderBatchesInOrder`
   * (`Tr2RenderContext.cpp:357-430`). THE WALK IS TRINITY'S, and that is the
   * whole point of it being here: Carbon declares this on `Tr2RenderContext.h`,
   * not on any abstraction-layer header, and a grep of `trinity/trinityal/`
   * finds no `RenderBatches` at all. The backend is handed verbs - topology,
   * resource set, constants, draw - and never a batch, a material or an
   * accumulator.
   *
   * Carbon's three `Tr2RingBuffer::PrepareBuffer` calls at the top are not
   * ported: the ring buffer's device half is the AL's, and preparing it from
   * here would reach past the boundary this method exists to restore.
   *
   * @param {object} batches A finalized accumulator.
   * @param {string} [techniqueName] The technique to draw.
   * @returns {number} How many passes were submitted.
   */
  RenderBatchesInOrder(batches, techniqueName = DEFAULT_TECHNIQUE)
  {
    if (!batches) return 0;

    let lastShader = null;
    let currentObjectData = null;
    let technique = 0;
    let passCount = 0;
    let shaderMask = 0;
    let drawn = 0;

    for (const batch of batches.GetBatches())
    {
      // RM_ANY means "whatever is already set", so Carbon skips the apply
      // rather than applying a mode called any.
      if (batch.renderingMode !== RenderingMode.RM_ANY)
      {
        this.#esm.ApplyStandardStates(batch.renderingMode);
      }

      if (batch.shader !== lastShader)
      {
        // Direct, as Carbon is: a batch with no shader is not valid, and
        // Tr2RenderBatch.IsValid uses the shader as its key.
        const found = batch.shader.GetTechniqueIndex(techniqueName);

        // Carbon `continue`s on both of these, which SKIPS THE BATCH and
        // leaves lastShader unchanged, so the next batch re-tests. Reproduced
        // rather than tidied into a cached failure.
        //
        // AND `technique` MUST NOT BE CLOBBERED ON THE WAY OUT. Carbon's
        // GetTechniqueIndex is an out-parameter that it does NOT write when it
        // returns false (`Tr2Shader.cpp:28-46`), so the variable keeps the
        // previous batch's value. Assigning -1 here was wrong in a way only a
        // three-batch sequence shows: S1, S2, S1 - the middle one fails and
        // leaves -1 behind, and the third takes the `shader === lastShader`
        // fast path and draws with technique -1.
        if (found < 0) continue;

        technique = found;

        passCount = batch.shader.GetPassCount(technique);

        if (passCount === 0) continue;

        shaderMask = batch.shader.GetShaderTypeMask(technique);
        lastShader = batch.shader;
      }

      if (batch.objectData && batch.objectData !== currentObjectData)
      {
        // Carbon fills an array of POINTERS into m_perObjectConstantBuffers
        // before the loop, so every slot exists. Ours are created on demand by
        // GetConstantBuffer, so the array is materialised the same way.
        const buffers = Array.from(
          { length: ConstantBufferSlot.CBUFFER_COUNT },
          (_unused, slot) => this.GetConstantBuffer(slot)
        );

        batch.objectData.SetPerObjectDataToDevice(buffers, shaderMask, this);
        currentObjectData = batch.objectData;
      }

      for (let passIndex = 0; passIndex < passCount; passIndex += 1)
      {
        batch.shader.ApplyAllStateForPass(technique, passIndex, this);
        batch.material.ApplyMaterialDataForPass(technique, passIndex, this);

        this.SubmitGeometry(batch);

        // COUNTED PER PASS, INSIDE THE LOOP, which is where Carbon counts
        // (`Tr2RenderContext.cpp:424-425`, batchCount and batchNormalDraws).
        // Counting after the loop counted a batch whose passCount was zero -
        // reachable through a stale passCount left by a previous batch on the
        // same shader - as a batch that drew.
        drawn += 1;
      }
    }

    return drawn;
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

    return this.#requireAL("RenderBatches").RenderBatches(batches, techniqueName, { overrideMaterial });
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

    return this.#requireAL("RenderBatches").RenderBatches(batches, techniqueName, { picking: true });
  }

  // THE FOUR BELOW ARE NOT PORTED, AND THEY REFUSE RATHER THAN RECORD.
  //
  // Each used to push an intent nothing ever read - the queue's whole failure
  // mode: a call that reports success and moves nothing. Refusing by name costs
  // a caller one clear error instead of a silent absence they debug elsewhere.
  //
  // What each actually needs:
  //   DrawLineSet      - line rendering; Carbon has no TriStepDrawLineSet, this
  //                      verb is ours (see the non-Carbon extension register).
  //   RenderAtlas      - Tr2TextureAtlas, an unported shell with no
  //                      GetFreeAreas/GetUsedAreas/GetMargin. Debug visualiser.
  //   RenderLineGraphs - Tr2Renderer::PrintfImmediate, so fonts.
  //   RenderDebug      - DrawPrimitiveUP plus fonts.

  /** NOT PORTED: line rendering. @returns {never} Always throws. */
  DrawLineSet(_lineSet)
  {
    throw new Error("Tr2RenderContext.DrawLineSet is not ported; it needs the line-rendering path.");
  }

  /**
   * Records a clear-unordered-access-view intent; the clear value is copied by
   * value and clearWithFloat selects float rather than integer clearing.
   */
  ClearUav(buffer, value, clearWithFloat = false)
  {
    return this.#requireAL("ClearUav").ClearUav(buffer, value, clearWithFloat);
  }

  /** NOT PORTED: needs Tr2TextureAtlas. @returns {never} Always throws. */
  RenderAtlas(_step)
  {
    throw new Error("Tr2RenderContext.RenderAtlas is not ported; Tr2TextureAtlas is an unported shell.");
  }

  /** NOT PORTED: needs the font path. @returns {never} Always throws. */
  RenderLineGraphs(_step)
  {
    throw new Error("Tr2RenderContext.RenderLineGraphs is not ported; it needs Tr2Renderer::PrintfImmediate.");
  }

  /** NOT PORTED: needs DrawPrimitiveUP and fonts. @returns {never} Always throws. */
  RenderDebug(_debugStep)
  {
    throw new Error("Tr2RenderContext.RenderDebug is not ported; it needs DrawPrimitiveUP and the font path.");
  }

  /**
   * Records a compute-dispatch intent with an explicit thread-group count per
   * axis.
   */
  RunComputeShader(effect, groupDimX = 1, groupDimY = 1, groupDimZ = 1)
  {
    return this.#requireAL("RunComputeShader").RunComputeShader(effect, groupDimX, groupDimY, groupDimZ);
  }

  /**
   * Records an indirect compute-dispatch intent reading its group counts from a
   * buffer at the given byte offset.
   */
  RunComputeShaderIndirect(effect, indirectionBuffer, offsetForArgs = 0)
  {
    return this.#requireAL("RunComputeShaderIndirect").RunComputeShaderIndirect(effect, indirectionBuffer, offsetForArgs);
  }

  /** Records the upscaler context the following work belongs to. */
  SetUpscalingContextID(upscalingContextID)
  {
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
    return true;
  }

  /**
   * Ends the frame at the device level.
   *
   * THIS IS NOT THE SWAP CHAIN'S PRESENT. Carbon has two, and they are reached
   * from different places: `TriDevice::HandleRenderTick` calls
   * `renderContext.Present()` (`TriDeviceStub.cpp:25`), which is the AL
   * context's frame boundary and what advances the frame number; publishing the
   * surface is `Tr2SwapChain::Present`, reached from `TriStepPresentSwapChain`.
   *
   * Carbon's `Tr2RenderContext` INHERITS `Tr2RenderContextAL`, so its `Present`
   * is the AL's. We compose, so this forwards. It was called `PresentSwapChain`
   * and took a swap chain it ignored until 2026-09-09; that name belongs to the
   * render STEP and Carbon has no such method on either context.
   *
   * @returns {number} An `ALResult` value.
   */
  Present()
  {
    return this.#requireAL("Present").Present();
  }

  /**
   * Sets the viewport. The viewport object is held by reference, not copied.
   *
   * @param {object} viewport `{ x, y, width, height, minZ, maxZ }`.
   * @returns {boolean} Whether the backend accepted it.
   */
  SetViewport(viewport)
  {
    this.#viewport = viewport ?? null;

    return this.#requireAL("SetViewport").SetViewport(viewport);
  }

  /**
   * Clears the cached viewport and records a fullscreen-viewport intent, leaving
   * the engine to resolve the actual target extent.
   */
  SetFullScreenViewport()
  {
    // Nothing to defer: the backend knows the bound target's extent, so "full
    // screen" resolves here and now. The old recording path deferred it as its
    // own intent because without a backend the extent was unknown until
    // realization - which is exactly the deferral the queue existed to provide.
    const size = this.#requireAL("GetRenderTargetSize").GetRenderTargetSize(0);

    if (Failed(size.result)) return false;

    this.#esm.UpdateRenderTargetViewport(size.width, size.height);
    this.#esm.SetupViewport();

    return true;
  }

  /**
   * The viewport last set, or null while the context is in fullscreen-viewport
   * mode.
   */
  GetViewport()
  {
    return this.#requireAL("GetViewport").GetViewport();
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
    return true;
  }

  /**
   * Sets a single render state, as `TriStepSetRenderState` does
   * (`TriStepSetRenderState.cpp:10-14`). Both arguments are coerced to
   * unsigned integers.
   *
   * @param {number} state A `RenderState` value.
   * @param {number} value The value to set.
   * @returns {boolean} Whether the backend accepted it.
   */
  SetRenderState(state, value)
  {
    return this.#requireAL("SetRenderState").SetRenderState(Number(state) >>> 0, Number(value) >>> 0);
  }

  /**
   * Applies a whole render-state setup, with the state manager's overrides.
   *
   * Carbon's `DoApplyRenderStates` ends with
   * `m_renderContext.SetRenderStates( &kv[0], kv.size() / 2 )`
   * (`Tr2EffectStateManager.cpp:753`), where its context IS the backend. Ours
   * composes, so this forwards - and carries the interpreted setup rather than
   * a resolved pair list, because a registered setup is interpreted once at
   * registration here and the backend projects it.
   *
   * @param {object} setup A `Tr2RenderStateSetup`.
   * @param {object} [overrides] The state manager's render-state overrides.
   * @returns {boolean} Whether the backend accepted it.
   */
  SetRenderStates(setup, overrides = null)
  {
    return this.#requireAL("SetRenderStates").SetRenderStates(setup, overrides);
  }

  /** Records the intent to apply the standard state block for a rendering mode. */
  ApplyStandardStates(renderingMode)
  {
    // The state manager owns this, and always did. Recording it instead sent
    // the call to a planner that classified it PIPELINE_STATE and then failed
    // on it - `requires a WebGPU pipeline-state translator` - so the intent was
    // not merely redundant, it was fatal if ever planned.
    return this.#esm.ApplyStandardStates(Number(renderingMode) >>> 0);
  }

  /**
   * Toggles wireframe rendering.
   *
   * THE STATE MANAGER OWNS THIS, as it owns the cull-mode and depth-test
   * overrides beside it. Carbon's own step goes straight there -
   * `renderContext.m_esm.SetWireframeRendering( m_enableWireframe )`
   * (`TriStepEnableWireframeMode.cpp:...`) - and never through the context at
   * all. This forwards for callers that already hold a context.
   *
   * @param {boolean} enabled Whether to draw wireframe.
   * @returns {boolean} Whether the override was applied.
   */
  SetWireframeRendering(enabled)
  {
    return this.#esm.SetWireframeRendering(!!enabled);
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
    return true;
  }

  /** Depth of the projection save/restore stack. */
  GetStackSizeProjection()
  {
    return this.#projectionStack.length;
  }

  /**
   * Appends a diagnostic record for the frame.
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
