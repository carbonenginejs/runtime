// Source: trinity/trinity/TriDevice.h
// Hand-maintained from Carbon source. Unimplemented backend methods here are
// unported Carbon behaviour, not a boundary: Carbon holds its handles on this
// class and calls the AL from it.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { PresentInterval, SwapEffect, UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import {
  convertProjectionCoordToWorldPickRay,
  screenToProjection
} from "../view/pickRay.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";

/** TriDevice (trinityCore) - generated from schema shapeHash 1db3a492.... */
@type.define({ className: "TriDevice", family: "trinityCore" })
export class TriDevice extends CjsModel
{

  static ThrottlingReason = Object.freeze({
    WINDOW_OUT_OF_FOCUS: 1,
    WINDOW_HIDDEN: 2,
    THERMAL_STATE: 4
  });

  static DeviceScreenType = Object.freeze({ WINDOWED: 0, FULLSCREEN: 1, NO_ADAPTER: 2 });

  static DeviceType = Object.freeze({ DEVICE_TYPE_HARDWARE: 0, DEVICE_TYPE_SOFTWARE: 1 });

  static ApplicationActivation = Object.freeze({ APP_ACTIVATED: 0, APP_DEACTIVATED: 1 });

  /** mPresentParam.presentInterval (Tr2PresentParametersAL - enum Tr2PresentParametersAL) [READWRITE, NOTIFY, PERSIST, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("PresentInterval")
  presentationInterval = 1;

  /** mSwapEffect (Tr2RenderContextEnum::SwapEffect - enum SwapEffect) [READWRITE, NOTIFY, PERSIST, ENUM] */
  @io.notify
  @io.persist
  @type.int32
  @type.enum("SwapEffect")
  swapEffect = 0;

  /** m_throttlingState (uint32_t) [READ] */
  @io.read
  @type.uint32
  throttlingState = 0;

  /** m_deviceType (DeviceType - enum DeviceType) [READWRITE, ENUM] */
  @io.readwrite
  @type.int32
  @type.enum("DeviceType")
  deviceType = 0;

  /** m_allowThrottling (bool) [READWRITE] */
  @io.readwrite
  @type.boolean
  allowThrottling = true;

  /** m_onDeviceRemoved (BlueScriptCallback) [READWRITE] */
  @io.readwrite
  @type.rawStruct("BlueScriptCallback")
  onDeviceRemoved = null;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @io.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_supportedUpscalingTechniques (PTr2UpscalingTechniqueInfoStructureList) [READ] */
  @io.read
  @type.list("Tr2UpscalingTechniqueInfo")
  supportedUpscalingTechniques = [];

  /** mViewport (PTriViewport) [READ, PERSIST] */
  @io.persist
  @type.objectRef("TriViewport")
  viewport = null;

  /** mDisplayMode.width (Tr2DisplayModeInfo) [READ] */
  @io.read
  @type.uint32
  adapterWidth = 0;

  /** mDisplayMode.height (Tr2DisplayModeInfo) [READ] */
  @io.read
  @type.uint32
  adapterHeight = 0;

  /** mDisplayMode.refreshRateDenominator (Tr2DisplayModeInfo) [READ] */
  @io.read
  @type.uint32
  adapterRefreshRate = 0;

  /** mAdapter (int) [READ] */
  @io.read
  @type.int32
  adapter = 0;

  /** mWidth (int32_t) [READ] */
  @io.read
  @type.int32
  width = 0;

  /** mHeight (int32_t) [READ] */
  @io.read
  @type.int32
  height = 0;

  /** mPresentParam.msaaType (Tr2PresentParametersAL) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.uint32
  multiSampleType = 0;

  /** mPresentParam.msaaQuality (Tr2PresentParametersAL) [READWRITE, NOTIFY, PERSIST] */
  @io.notify
  @io.persist
  @type.uint32
  multiSampleQuality = 0;

  /** m_scene (ITr2ScenePtr) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.objectRef("ITr2Scene")
  scene = null;

  /** mBackBufferCount (int) [READWRITE, NOTIFY] */
  @io.notify
  @io.readwrite
  @type.int32
  backBufferCount = 1;

  /** mTickInterval (int) [READWRITE] */
  @io.readwrite
  @type.int32
  tickInterval = 0;

  /** m_mipLevelSkipCount (unsigned int) [READWRITE] */
  @io.readwrite
  @type.uint32
  mipLevelSkipCount = 0;

  /** m_animationTimeScale (float) [READWRITE] */
  @io.readwrite
  @type.float32
  animationTimeScale = 1;

  /** m_animationTime (float) [READWRITE] */
  @io.readwrite
  @type.float32
  animationTime = 0;

  /** m_upscalingSetting (Tr2UpscalingAL::Setting) [READ] */
  @io.read
  @type.uint32
  @type.enum("UpscalingSetting")
  upscalingSetting = 1;

  /** m_upscalingTechnique (Tr2UpscalingAL::Technique) [READ] */
  @io.read
  @type.uint32
  @type.enum("UpscalingTechnique")
  upscalingTechnique = 0;

  /** m_upscalingWithFrameGeneration (bool) [READ] */
  @io.read
  @type.boolean
  frameGeneration = false;

  /** Get/SetGeometryLoadDisabled (MAP_PROPERTY) - disables external geometry loads for batch processing. */
  @io.readwrite
  @type.boolean
  disableGeometryLoad = false;

  /** Get/SetTextureLoadDisabled (MAP_PROPERTY) - disables external texture loads for batch processing. */
  @io.readwrite
  @type.boolean
  disableTextureLoad = false;

  /** Get/SetAsyncLoadDisabled (MAP_PROPERTY) - makes resource loads synchronous. */
  @io.readwrite
  @type.boolean
  disableAsyncLoad = false;

  /** Get/SetMinimumModelLOD (MAP_PROPERTY) - prevents the first N model LODs from loading; 0 disables. */
  @io.readwrite
  @type.int32
  minimumModelLOD = 0;

  /**
   * Width over height of the device viewport in pixels; zero when there is no
   * viewport or its height is zero.
   */
  @carbon.method
  @impl.implemented
  AspectRatio()
  {
    const viewport = this.viewport;
    if (!viewport || !viewport.height)
    {
      return 0;
    }
    return viewport.width / viewport.height;
  }

  /**
   * Maps window-space pixel coordinates into the [-1, 1] projection space.
   * DX maps viewport pixel CENTRES to view space, so for four pixels, pixel
   * 3 maps to 1 and pixel 0 to -1.
   */
  @carbon.method
  @impl.adapted
  ScreenToProjection(x, y, viewport = this.viewport, out = {})
  {
    const vx = x - (viewport?.x ?? 0);
    const vy = y - (viewport?.y ?? 0);
    const w = viewport?.width ?? 1;
    const h = viewport?.height ?? 1;
    out.x = (2 * vx) / (w - 1) - 1;
    out.y = -((2 * vy) / (h - 1) - 1);
    return out;
  }

  /**
   * Returns Carbon's script-facing `[rayDirection, rayStart]` pair for a screen
   * pixel under the supplied viewport and view/projection matrices.
   *
   * The returned vectors are detached from the picking helper's reusable
   * scratch storage, so a later query cannot mutate an earlier result.
   */
  @carbon.method
  @impl.adapted
  GetPickRayFromViewport(x, y, viewport, view, projection)
  {
    const projected = screenToProjection(x, y, viewport);
    const ray = convertProjectionCoordToWorldPickRay(projected.x, projected.y, projection, view);
    if (!ray)
    {
      return null;
    }
    return [ new Float32Array(ray.direction), new Float32Array(ray.start) ];
  }

  /** Time in seconds, recentered regularly (once per hour). */
  @carbon.method
  @impl.implemented
  GetAnimationTime()
  {
    return this.animationTime;
  }

  /**
   * Elapsed animation time since startTime, correct across the hourly
   * ANIMATION_TIME_MAX recenter.
   */
  @carbon.method
  @impl.implemented
  GetAnimationTimeElapsed(startTime)
  {
    let elapsed = this.animationTime - startTime;
    if (elapsed < 0)
    {
      elapsed += TriDevice.ANIMATION_TIME_MAX;
    }
    return elapsed;
  }

  // Source: trinity/trinity/TriDevice.cpp:805-833
  //
  // The clock half of Carbon's tick. The rest of TriDevice::Tick - the crash
  // key, the scheduled event, Update, HandleRenderTick, the main-thread action
  // queue and the resource-pool sweep - is not ported, and this does not
  // pretend otherwise.
  //
  // Carbon keeps the frame counter in a file-scope `g_currentFrameCounter`
  // rather than on the device, and reads it back through
  // Tr2Renderer::GetCurrentFrameCounter. It is a device member here because
  // `gTriDev` is how everything reaches the device anyway, and a second
  // module-scope counter would be a second thing to keep in step.

  /** `g_currentFrameCounter` - the frame the device is on. */
  frameCounter = 0;

  /** m_simTime, the simulation clock the animation delta is taken from. */
  simTime = 0;

  /** m_realTime. */
  realTime = 0;

  /** The animation time before the current tick, for the render-time vector. */
  previousAnimationTime = 0;

  /** `Tr2Renderer::GetCurrentFrameCounter` reads this through gTriDev. */
  @carbon.method
  @impl.implemented
  GetCurrentFrameCounter()
  {
    return this.frameCounter;
  }

  /**
   * `TriDevice::Tick`'s clock half: advance the frame counter and the
   * animation time by the simulation delta.
   *
   * Carbon clamps the delta to one second, so a stall does not jump every
   * animation forward, and recenters the clock hourly.
   *
   * @param {number} realTime Real clock, in seconds.
   * @param {number} simTime Simulation clock, in seconds.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The clock half only. Carbon's Tick also sets a crash key, schedules the next event, and runs Update, HandleRenderTick, the main-thread actions and the resource-pool sweep; none of those are ported.")
  Tick(realTime = 0, simTime = 0)
  {
    this.frameCounter++;

    let delta = Number(simTime) - this.simTime;
    if (!(delta > 0)) delta = 0;
    if (delta > 1) delta = 1;

    this.previousAnimationTime = this.animationTime;
    this.animationTime += delta * this.animationTimeScale;

    // cpp:823-826. Carbon also rebases every animation player and Granny
    // control clock by the same amount here; neither is ported, so a clock
    // that runs past an hour will step those consumers.
    if (this.animationTime > TriDevice.ANIMATION_TIME_MAX)
    {
      this.animationTime -= TriDevice.ANIMATION_TIME_MAX;
    }

    this.simTime = Number(simTime) || 0;
    this.realTime = Number(realTime) || 0;
    return this;
  }

  /** Carbon method CreateUpscalingContext (MAP_METHOD_AND_WRAP_OPTIONAL_ARGS). */
  @carbon.method
  @impl.notImplemented
  CreateUpscalingContext(...args)
  {
    throw new Error("TriDevice.CreateUpscalingContext is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DeleteUpscalingContext (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  DeleteUpscalingContext(...args)
  {
    throw new Error("TriDevice.DeleteUpscalingContext is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetRenderResolution (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetRenderResolution(...args)
  {
    throw new Error("TriDevice.GetRenderResolution is not implemented in CarbonEngineJS.");
  }

  /** Carbon method RefreshDeviceResources (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  RefreshDeviceResources(...args)
  {
    throw new Error("TriDevice.RefreshDeviceResources is not implemented in CarbonEngineJS.");
  }

  /**
   * The backend-neutral frame body (`TriDevice.cpp:1151-1187`).
   *
   * THE ORDER IS THE CONTRACT, and two parts of it are load bearing:
   *
   * - the bracket is ASYMMETRIC. `EndRenderContext` rewinds the per-object
   *   pool before ending the scene, so every transient payload leased during
   *   the frame dies inside the bracket that leased it;
   * - PRESENTATION IS NOT HERE. The previous frame is presented at the top of
   *   the NEXT tick, which is what overlaps CPU and GPU work.
   *
   * TWO CARBON STEPS ARE MISSING, and they are absent rather than reworked.
   * `Tr2SyncToGpu::GetInstance().Tick()` has no port at all, and
   * `Tr2GpuProfiler` exists only as a generated shell with fields and no
   * `BeginFrame`/`EndFrame`. Both are named here so the gap is visible at the
   * site that needs them, rather than being discovered as a silent omission.
   *
   * @returns {boolean} True, as Carbon's does.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Tr2SyncToGpu is unported and Tr2GpuProfiler is a fields-only shell, so their two calls are absent from the body. Everything else is Carbon's order verbatim.")
  Render()
  {
    this.Throttle();

    const renderContext = Tr2RenderContext_GetMainThreadRenderContext();

    // Tr2SyncToGpu::GetInstance().Tick() belongs here - unported.

    if (this.viewport) renderContext.SetViewport(this.viewport);

    // Tr2GpuProfiler::GetProfiler().BeginFrame(Tr2Renderer.GetCurrentFrameCounter()) belongs here - unported.

    Tr2Renderer.BeginFrame();
    Tr2Renderer.BeginRenderContext();
    Tr2Renderer.ReserveQuadListIndexBuffer(0);

    this.#renderJobs?.Run(this.realTime, this.simTime);

    // Tr2GpuProfiler::GetProfiler().EndFrame() belongs here - unported.

    Tr2Renderer.EndRenderContext();
    Tr2Renderer.EndFrame();

    return true;
  }

  /**
   * Sleeps the frame when the window is out of focus, hidden, or the machine
   * is thermally throttled (`TriDevice.cpp:1227-1260`).
   *
   * @returns {void}
   */
  @carbon.method
  @impl.notSupported
  @impl.reason("Carbon throttles by blocking the render thread with CcpThreadSleep and by shrinking the TBB thread pool. A browser has neither: blocking the main thread is what a frame budget is trying to avoid, and requestAnimationFrame already stops delivering frames to a hidden document, which is the case this exists for. Kept as a call site so the frame body is Carbon's order and a host that CAN throttle has somewhere to do it.")
  Throttle()
  {
  }

  /**
   * The render jobs the frame body runs (`TriDevice.cpp:1119-1122`).
   *
   * @param {object|null} renderJobs A `Tr2RenderJobs`, or null to detach.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.implemented
  SetRenderJobs(renderJobs)
  {
    this.#renderJobs = renderJobs ?? null;
    return this;
  }

  /**
   * The render jobs installed on this device, or null.
   *
   * @returns {object|null} The installed `Tr2RenderJobs`.
   */
  @impl.custom
  @impl.reason("Carbon's m_renderJobs is a member the frame body reads directly; a private field needs an accessor for anyone else to see what is installed.")
  GetRenderJobs()
  {
    return this.#renderJobs;
  }

  /** Carbon m_renderJobs (TriDevice.h:311). */
  #renderJobs = null;

  /** Carbon method GetRenderingPlatformID (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetRenderingPlatformID(...args)
  {
    throw new Error("TriDevice.GetRenderingPlatformID is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SupportsRenderTargetFormat (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SupportsRenderTargetFormat(...args)
  {
    throw new Error("TriDevice.SupportsRenderTargetFormat is not implemented in CarbonEngineJS.");
  }

  /** Carbon method IsVariableRefreshRateSupported (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  IsVariableRefreshRateSupported(...args)
  {
    throw new Error("TriDevice.IsVariableRefreshRateSupported is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SupportsRaytracing (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SupportsRaytracing(...args)
  {
    throw new Error("TriDevice.SupportsRaytracing is not implemented in CarbonEngineJS.");
  }

  /** Carbon method DoesD3DDeviceExist -> DeviceExists (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  DoesD3DDeviceExist(...args)
  {
    throw new Error("TriDevice.DoesD3DDeviceExist is not implemented in CarbonEngineJS.");
  }

  /** Carbon method SetUpscaling (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SetUpscaling(...args)
  {
    throw new Error("TriDevice.SetUpscaling is not implemented in CarbonEngineJS.");
  }

  /** Carbon method GetRenderContext (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  GetRenderContext(...args)
  {
    throw new Error("TriDevice.GetRenderContext is not implemented in CarbonEngineJS.");
  }

  /** Carbon method UpdateAvailableUpscalingTechniques (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  UpdateAvailableUpscalingTechniques(...args)
  {
    throw new Error("TriDevice.UpdateAvailableUpscalingTechniques is not implemented in CarbonEngineJS.");
  }

  /** One hour - the animation-clock recenter period. */
  static ANIMATION_TIME_MAX = 3600;

  static PresentInterval = PresentInterval;

  static SwapEffect = SwapEffect;

  static UpscalingSetting = UpscalingSetting;

  static UpscalingTechnique = UpscalingTechnique;

}
