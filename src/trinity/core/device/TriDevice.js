// Source: trinity/trinity/TriDevice.h
// Hand-maintained from Carbon source. Unimplemented backend methods here are
// unported Carbon behaviour, not a boundary: Carbon holds its handles on this
// class and calls the AL from it.
import { carbon, impl, edit, type } from "#schema";
import { CjsModel } from "#model";
import { PresentInterval, SwapEffect, UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import {
  convertProjectionCoordToWorldPickRay,
  screenToProjection
} from "../view/pickRay.js";
import { blue, EnumRegistrationType, IBlueEvents, ISimTimeRebaseNotify } from "#blue";
import { TriStorageFlags } from "#consts/graphics";
import { ALResult, Failed } from "../../../trinityal/ALResult.js";
import { TriViewport } from "../view/TriViewport.js";
import { Tr2RenderContext } from "../context/Tr2RenderContext.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import "#blue/registerTrinityEnums";

/** TriDevice (trinityCore) - generated from schema shapeHash 1db3a492.... */
@type.define({ className: "TriDevice", family: "trinityCore" })
// CARBON'S BASE LIST, AND IT HAS THREE ENTRIES (`TriDevice.h:33-36`):
//
//     BLUE_CLASS( TriDevice ) : public ITriDevice, public IBlueEvents,
//                               public ISimTimeRebaseNotify
//
// All three arrive through `@carbon.inherit` rather than one of them taking
// the `extends` slot, and that is deliberate rather than forced: a base list
// reads as a base list, and which member happens to be the JS prototype parent
// is an implementation detail that should not change when `CjsModel` is
// removed. That is what makes the device acceptable to
// `BeOS->RegisterForTicks` and to the sim-clock rebase, and what makes
// `CjsSchema.cast(device, IBlueEvents)` answer - the port of `dynamic_cast`,
// which in C++ answers to the base list and needs no exposure entry.
//
// THIS IS NOT THE SAME QUESTION AS `MAP_INTERFACE`. `TriDevice_Blue.cpp` maps
// only `ITriDevice`, and nothing in Carbon maps `IBlueEvents` at all - but
// that governs `BlueCastPtr`, not `dynamic_cast`, and inheriting really does
// make a C++ base castable. An earlier revision of this file removed the
// declaration on the strength of the mapping, which was the wrong test.
//
// `ITriDevice` is not declared here because it is still in `trinity/dropped`;
// it is the one entry this class's `@carbon.mapInterface` will carry.
@carbon.inherit(IBlueEvents, ISimTimeRebaseNotify)
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
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2RenderContextEnum.PresentInterval")
  presentationInterval = 1;

  /** mSwapEffect (Tr2RenderContextEnum::SwapEffect - enum SwapEffect) [READWRITE, NOTIFY, PERSIST, ENUM] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.int32
  @type.enum("trinity.Tr2RenderContextEnum.SwapEffect")
  swapEffect = 0;

  /** m_throttlingState (uint32_t) [READ] */
  @edit.read
  @type.uint32
  throttlingState = 0;

  /** m_deviceType (DeviceType - enum DeviceType) [READWRITE, ENUM] */
  @edit.readwrite
  @type.int32
  @type.enum("trinity.TriDevice.DeviceType")
  deviceType = 0;

  /** m_allowThrottling (bool) [READWRITE] */
  @edit.readwrite
  @type.boolean
  allowThrottling = true;

  /** m_onDeviceRemoved (BlueScriptCallback) [READWRITE] */
  @edit.readwrite
  @type.rawStruct("BlueScriptCallback")
  onDeviceRemoved = null;

  /** m_curveSets (PTriCurveSetVector) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.list("TriCurveSet")
  curveSets = [];

  /** m_supportedUpscalingTechniques (PTr2UpscalingTechniqueInfoStructureList) [READ] */
  @edit.read
  @type.list("Tr2UpscalingTechniqueInfo")
  supportedUpscalingTechniques = [];

  /** mViewport (PTriViewport) [READ, PERSIST] */
  @edit.read
  @edit.persist
  @type.objectRef("TriViewport")
  viewport = null;

  /** mDisplayMode.width (Tr2DisplayModeInfo) [READ] */
  @edit.read
  @type.uint32
  adapterWidth = 0;

  /** mDisplayMode.height (Tr2DisplayModeInfo) [READ] */
  @edit.read
  @type.uint32
  adapterHeight = 0;

  /** mDisplayMode.refreshRateDenominator (Tr2DisplayModeInfo) [READ] */
  @edit.read
  @type.uint32
  adapterRefreshRate = 0;

  /** mAdapter (int) [READ] */
  @edit.read
  @type.int32
  adapter = 0;

  /** mWidth (int32_t) [READ] */
  @edit.read
  @type.int32
  width = 0;

  /** mHeight (int32_t) [READ] */
  @edit.read
  @type.int32
  height = 0;

  /** mPresentParam.msaaType (Tr2PresentParametersAL) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  multiSampleType = 0;

  /** mPresentParam.msaaQuality (Tr2PresentParametersAL) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.readwrite
  @edit.persist
  @type.uint32
  multiSampleQuality = 0;

  /** m_scene (ITr2ScenePtr) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.objectRef("ITr2Scene")
  scene = null;

  /** mBackBufferCount (int) [READWRITE, NOTIFY] */
  @edit.notify
  @edit.readwrite
  @type.int32
  backBufferCount = 1;

  /** mTickInterval (int) [READWRITE] */
  @edit.readwrite
  @type.int32
  tickInterval = 0;

  /** m_mipLevelSkipCount (unsigned int) [READWRITE] */
  @edit.readwrite
  @type.uint32
  mipLevelSkipCount = 0;

  /** m_animationTimeScale (float) [READWRITE] */
  @edit.readwrite
  @type.float32
  animationTimeScale = 1;

  /** m_animationTime (float) [READWRITE] */
  @edit.readwrite
  @type.float32
  animationTime = 0;

  /** m_upscalingSetting (Tr2UpscalingAL::Setting) [READ] */
  @edit.read
  @type.uint32
  @type.enum("trinity.Tr2UpscalingAL.Setting")
  upscalingSetting = 1;

  /** m_upscalingTechnique (Tr2UpscalingAL::Technique) [READ] */
  @edit.read
  @type.uint32
  @type.enum("trinity.Tr2UpscalingAL.Technique")
  upscalingTechnique = 0;

  /** m_upscalingWithFrameGeneration (bool) [READ] */
  @edit.read
  @type.boolean
  frameGeneration = false;

  /** Get/SetGeometryLoadDisabled (MAP_PROPERTY) - disables external geometry loads for batch processing. */
  @edit.readwrite
  @type.boolean
  disableGeometryLoad = false;

  /** Get/SetTextureLoadDisabled (MAP_PROPERTY) - disables external texture loads for batch processing. */
  @edit.readwrite
  @type.boolean
  disableTextureLoad = false;

  /** Get/SetAsyncLoadDisabled (MAP_PROPERTY) - makes resource loads synchronous. */
  @edit.readwrite
  @type.boolean
  disableAsyncLoad = false;

  /** Get/SetMinimumModelLOD (MAP_PROPERTY) - prevents the first N model LODs from loading; 0 disables. */
  @edit.readwrite
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

  // Source: trinity/trinity/TriDevice.cpp:697,805-833
  //
  // The clock half of Carbon's tick. The rest of TriDevice::OnTick - the crash
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
   * Blue's tick: advance the frame counter and the animation time by the
   * simulation delta (`TriDevice::OnTick`, `TriDevice.cpp:697,805-833`).
   *
   * THIS IS A CALLBACK, not a method a caller invokes directly. Carbon
   * declares it under an `// IBlueEvents` banner (`TriDevice.h:154-159`) and
   * the device hands ITSELF to `BeOS->RegisterForTicks( this, TRINITY )`
   * (`TriDevice.cpp:310`), so the pump calls it. `blue.os` is that pump here.
   *
   * BOTH TIMES ARE `Be::Time` - 100-nanosecond ticks since the client started,
   * not seconds. Carbon divides the delta by 10,000,000 to get the seconds the
   * animation clock advances by, and so does this. The clamp is to one second,
   * so a stall does not jump every animation forward, and the clock recentres
   * hourly.
   *
   * @param {number} realTime Time since the client started, in 100ns ticks.
   * @param {number} simTime The same, slowed under load to manage it.
   * @param {*} [_cookie] The cookie this device registered with; unread.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("The clock half only. Carbon's OnTick also sets a crash key, schedules the next event, and runs Update, HandleRenderTick, the main-thread actions and the resource-pool sweep; none of those are ported. The cookie is accepted so the signature matches IBlueEvents, and ignored because Carbon's body ignores it too - it exists for registrants that register more than once.")
  OnTick(realTime = 0, simTime = 0, _cookie = null)
  {
    this.frameCounter++;

    let delta = Number(simTime) - this.simTime;
    if (!(delta > 0)) delta = 0;

    // cpp:817-822. Be::Time is 100ns ticks, so the seconds delta is the tick
    // delta over ten million; the clamp is applied to the SECONDS value, as
    // Carbon applies it to fDelta rather than to delta.
    let deltaSeconds = delta / 10000000;
    if (deltaSeconds > 1) deltaSeconds = 1;

    this.previousAnimationTime = this.animationTime;
    this.animationTime += deltaSeconds * this.animationTimeScale;

    // cpp:823-826. Carbon also rebases every animation player and Granny
    // control clock by the same amount here; neither is ported, so a clock
    // that runs past an hour will step those consumers.
    if (this.animationTime > TriDevice.ANIMATION_TIME_MAX)
    {
      this.animationTime -= TriDevice.ANIMATION_TIME_MAX;
    }

    this.simTime = Number(simTime) || 0;
    this.realTime = Number(realTime) || 0;

    // cpp:840-845. ExecuteMainThreadActions and
    // Tr2GpuResourcePool::ClearAllUnusedResources close Carbon's tick; neither
    // is ported, and both are named here rather than silently absent.
    this.Update(this.realTime, this.simTime);
    this.HandleRenderTick(this.realTime, this.simTime);

    return this;
  }

  /**
   * Tears the device down and stops it being ticked (`TriDevice.cpp:687-691`).
   *
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.implemented
  InvalidateAndUnregisterForTicks()
  {
    this.DestroyRenderContext();
    blue.os.UnregisterForTicks(this, TriDevice.TICK_COOKIE);
    this.#hwnd = null;
    this.width = 0;
    this.height = 0;
    return this;
  }

  /** Carbon's tick cookie, the string "Trinity" (`TriDevice.cpp:148`). */
  static TICK_COOKIE = "Trinity";

  // ==========================================================================
  // THE DEVICE LIFECYCLE. Source: TriDevice.cpp:230-341, :480-487, :669-691,
  // :1019-1060, and TriDeviceStub.cpp:16-37 for the headless backend.
  //
  // This is the path that ends in `BeOS->RegisterForTicks`, which is why it
  // matters beyond device creation: until something here runs, nothing ticks
  // the device and the animation clock never moves.
  //
  // CARBON SPLITS IT PER BACKEND AND WE HAVE ONE SEAM INSTEAD. `CreateDeviceInt`
  // and `DeviceExists` live in TriDevice11/12/Metal/Stub; the abstraction layer
  // is that seam here, so device creation is the AL's `CreateDevice` and
  // existence is the ambient context's own `IsValid`. The headless backend
  // (`TriDeviceStub.cpp:34-37`) answers existence exactly that way, which is the
  // evidence this is the right seam rather than a convenience.
  // ==========================================================================

  /** Carbon mHwnd - the output window the device presents to. */
  #hwnd = null;

  /** Carbon mPresentParam - the present parameters the device was created with. */
  #presentParam = null;

  /** Carbon mDeviceLost. */
  #deviceLost = false;

  /** Carbon m_postUpdateCallbacks (TriDevice.h:313). */
  #postUpdateCallbacks = [];

  /** Carbon's static resource registry (TriDevice.h:265-266). */
  static #resourcesRegistered = new Set();

  /**
   * Every `Tr2DeviceResource` that has registered itself
   * (`TriDevice.cpp:1061-1065`).
   *
   * STATIC, AND A PROCESS-WIDE SINGLETON IN CARBON TOO - resources register
   * without knowing which device they belong to, because there is one.
   *
   * @returns {Set<object>} The live registry, not a copy.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon guards this set with a mutex because EveShip2Builder registers sprite sets from a background thread (TriDevice.cpp:1075-1080). JavaScript has no shared-memory threads, so there is nothing to guard and the mutex has no counterpart.")
  static GetResourcesRegistered()
  {
    return TriDevice.#resourcesRegistered;
  }

  /**
   * Registers a device resource so it is prepared and released with the device.
   *
   * @param {object} resource A `Tr2DeviceResource`.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  static RegisterResource(resource)
  {
    // CHECKED AT THE DOOR, because both verbs are non-optional on Carbon's
    // base: ReleaseResources is pure virtual and PrepareResources is concrete
    // on Tr2DeviceResource itself (`Tr2DeviceResource.h:45,53`). A registry
    // that accepted something without them would have to hedge every call, and
    // a resource silently never released is exactly the failure this device is
    // meant to prevent.
    if (typeof resource?.ReleaseResources !== "function"
      || typeof resource?.PrepareResources !== "function")
    {
      throw new TypeError(
        "TriDevice.RegisterResource expects a Tr2DeviceResource with "
        + "PrepareResources and ReleaseResources."
      );
    }

    TriDevice.#resourcesRegistered.add(resource);
  }

  /**
   * Unregisters one.
   *
   * @param {object} resource The registered resource.
   * @returns {void}
   */
  @carbon.method
  @impl.implemented
  static UnregisterResource(resource)
  {
    TriDevice.#resourcesRegistered.delete(resource);
  }

  /**
   * Whether a device exists at all (`TriDeviceStub.cpp:31-37`).
   *
   * Carbon's comment is worth keeping: this is a LOWER-level question than
   * "do we have a valid render context", so it can be true while that is still
   * false. On the headless backend the two coincide, because the AL's validity
   * IS the device.
   *
   * @returns {boolean} Whether the ambient context has a live backend.
   */
  @carbon.method
  @impl.implemented
  DeviceExists()
  {
    return Tr2RenderContext_GetMainThreadRenderContext().IsValid();
  }

  /**
   * The Blue-exposed spelling of `DeviceExists`.
   *
   * TWO NAMES FOR ONE METHOD, AND BOTH ARE CARBON'S. The C++ method is
   * `DeviceExists` (`TriDevice.h:209`); `TriDevice_Blue.cpp` exposes it to
   * script as `DoesD3DDeviceExist`, which is why the generated schema carries
   * both. The alias forwards rather than being the implementation, so there is
   * one body to be wrong.
   *
   * @returns {boolean} Whether the ambient context has a live backend.
   */
  @carbon.method
  @impl.implemented
  DoesD3DDeviceExist()
  {
    return this.DeviceExists();
  }

  /**
   * Releases the device's resources and the ambient render context with it
   * (`TriDevice.cpp:480-487`).
   *
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.implemented
  DestroyRenderContext()
  {
    if (this.DeviceExists())
    {
      this.ReleaseDeviceResources(TriStorageFlags.TRISTORAGE_ALL);
      Tr2RenderContext.DestroyMainThreadRenderContext();
    }
    return this;
  }

  /**
   * Releases every registered resource's device storage
   * (`TriDevice.cpp:492-520`), which Carbon must do before resetting a device.
   *
   * @param {number} [storage] A `TriStorage` mask.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon guards against a resource unregistering itself mid-iteration with an s_resourcesToBeRemoved set and an s_iteratingForRelease flag; iterating over a copy of the registry answers the same problem without two statics to keep in step. Carbon also logs a warning for a null entry, which this registry cannot hold because RegisterResource refuses it at the door.")
  ReleaseDeviceResources(storage = TriStorageFlags.TRISTORAGE_ALL)
  {
    for (const resource of [ ...TriDevice.#resourcesRegistered ])
    {
      resource.ReleaseResources(storage);
    }
    return this;
  }

  /**
   * Rebuilds every registered resource after a device comes up
   * (`TriDevice.cpp:1038-1059`).
   *
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon's third step is RebuildDeviceResourcesInPython, which has no counterpart: there is no Python here and no second resource registry to rebuild.")
  PrepareDeviceResources()
  {
    for (const resource of [ ...TriDevice.#resourcesRegistered ])
    {
      resource.PrepareResources();
    }

    // Carbon's second step is Tr2Renderer::PrepareDeviceResources, a STATIC
    // that builds the blitter and the debug line set (Tr2Renderer.cpp:1273).
    // Ours is an instance method on a renderer this device has no handle to,
    // which is the same "Tr2Renderer is 106/106 static in Carbon" gap recorded
    // in the wrong-shape register. Calling it optionally would be a hedge that
    // silently does nothing, so it is named and left undone instead.
    return this;
  }

  /**
   * Hands the present parameters to the ambient render context
   * (`TriDevice.cpp:1019-1037`).
   *
   * The early return is Carbon's: a software device with no output window has
   * nothing to present to, and saying so is not a failure.
   *
   * @param {number} adapter Which adapter.
   * @param {object} presentParameters A `Tr2PresentParametersAL`.
   * @returns {boolean} Whether the parameters were accepted.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon logs every live video-memory resource and the HRESULT before returning false, through LogAllLiveResources and CCP_LOGERR; neither logging facility is ported, so the failure is reported by the return value alone.")
  SetPresentParameters(adapter, presentParameters)
  {
    if (!this.#hwnd && presentParameters.software) return true;

    const al = Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL();
    const result = al ? al.SetPresentParameters(presentParameters, adapter) : ALResult.S_OK;

    return !Failed(result);
  }

  /**
   * Fills in the default viewport once a device exists
   * (`TriDevice.cpp:315-338`).
   *
   * @returns {boolean} False when there is no device to describe.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon also reads the adapter display mode into mDisplayMode when there is an output window or the device is not software. That enumeration has no browser counterpart - see CreateSimpleDevice - so the viewport half is ported and the display-mode half is not.")
  InitD3DDevice()
  {
    if (!this.DeviceExists()) return false;

    const viewport = new TriViewport();
    viewport.__init__(0, 0, this.width, this.height, 0, 1);
    this.viewport = viewport;

    this.#deviceLost = false;
    return true;
  }

  /**
   * Creates a device and starts ticking it (`TriDevice.cpp:230-312`).
   *
   * THE LAST LINE IS THE POINT: `BeOS->RegisterForTicks( this, TRINITY )`. A
   * device that was never created is never ticked, which is why the animation
   * clock sat at zero before this existed.
   *
   * FULLSCREEN IS REFUSED, and that is the one genuine platform limitation
   * here. Carbon reads the adapter's current display mode and adopts its
   * format and refresh rate (`cpp:252-262`); a browser cannot enumerate display
   * modes and its Fullscreen API does not change one, so there is nothing
   * truthful to put in those fields. Windowed and adapterless creation are
   * complete.
   *
   * @param {*} hwnd The output window; a canvas here.
   * @param {number} width Back-buffer width.
   * @param {number} height Back-buffer height.
   * @param {number} [type] A `TriDevice.DeviceScreenType`.
   * @param {number} [presentInterval] A `PresentInterval`.
   * @param {number} [adapter] Which adapter.
   * @returns {boolean} Whether a device now exists.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("FULLSCREEN refuses because display-mode enumeration has no browser counterpart. CreateUpscalingTechnique and the nvperfhud accommodation have no backend that offers them. Carbon's two CCP_LOGERR calls are absent with the logging facility. Everything else is Carbon's order, including that registration is the last step and happens only once a device exists.")
  CreateSimpleDevice(
    hwnd,
    width,
    height,
    type = TriDevice.DeviceScreenType.WINDOWED,
    presentInterval = this.presentationInterval,
    adapter = 0
  )
  {
    // Clean out the old resources and the old device, if there is one.
    this.DestroyRenderContext();

    if (type === TriDevice.DeviceScreenType.FULLSCREEN)
    {
      throw new Error(
        "TriDevice.CreateSimpleDevice cannot create a FULLSCREEN device: "
        + "adapter display-mode enumeration is not available in CarbonEngineJS."
      );
    }

    const pp = {
      ...(this.#presentParam ?? {}),
      mode: { ...(this.#presentParam?.mode ?? {}), width, height },
      outputWindow: hwnd,
      software: this.deviceType === TriDevice.DeviceType.DEVICE_TYPE_SOFTWARE,
      windowed: type === TriDevice.DeviceScreenType.WINDOWED,
      presentInterval,
      variableRefreshRateSupported: this.IsVariableRefreshRateSupported()
    };

    // Carbon: CreateUpscalingTechnique( adapter ) then CreateDeviceInt. No
    // backend here offers upscaling, and CreateDeviceInt is the abstraction
    // layer's CreateDevice.
    Tr2RenderContext_GetMainThreadRenderContext().GetRenderContextAL()?.CreateDevice(pp);

    if (!this.DeviceExists()) return false;

    this.#presentParam = pp;
    this.width = width;
    this.height = height;
    this.#hwnd = hwnd;
    this.#deviceLost = false;

    // Tr2VideoAdapterInfo::AreAdaptersDifferent (cpp:288). Adapters are indices
    // here, so the comparison is the identity Carbon's helper performs.
    const adapterChanged = adapter !== this.adapter;
    this.adapter = adapter;

    if (type !== TriDevice.DeviceScreenType.NO_ADAPTER
      && !this.SetPresentParameters(this.adapter, this.#presentParam))
    {
      return false;
    }

    if (!this.InitD3DDevice()) return false;

    if (adapterChanged || this.supportedUpscalingTechniques.length === 0)
    {
      this.UpdateAvailableUpscalingTechniques();
    }

    this.PrepareDeviceResources();

    blue.os.RegisterForTicks(this, TriDevice.TICK_COOKIE);

    return true;
  }

  /**
   * Adopts present parameters supplied by the application, and starts or stops
   * ticking accordingly (`ITriDevice::SetPresentation`, `TriDevice.cpp:669-685`).
   *
   * Carbon's own comment is "Called from the App to set some attributes", and
   * passing null is how the App says it is done: that branch tears the device
   * down and unregisters it.
   *
   * @param {number} adapter Which adapter.
   * @param {object|null} presentParameters A `Tr2PresentParametersAL`, or null.
   * @returns {boolean} True, as Carbon's does unconditionally.
   */
  @carbon.method
  @impl.implemented
  SetPresentation(adapter, presentParameters)
  {
    if (presentParameters)
    {
      this.adapter = adapter;
      this.#presentParam = presentParameters;
      this.#hwnd = presentParameters.outputWindow;
      this.width = presentParameters.mode.width;
      this.height = presentParameters.mode.height;
      blue.os.RegisterForTicks(this, TriDevice.TICK_COOKIE);
    }
    else
    {
      this.InvalidateAndUnregisterForTicks();
    }
    return true;
  }

  /**
   * The present parameters this device holds, or null.
   *
   * @returns {object|null} A `Tr2PresentParametersAL`.
   */
  @impl.custom
  @impl.reason("Carbon's mPresentParam is a member its own methods read directly; a private field needs an accessor for a host to see what the device was created with.")
  GetPresentParameters()
  {
    return this.#presentParam;
  }

  /**
   * The output window this device presents to, or null.
   *
   * @returns {*} The window, a canvas here.
   */
  @impl.custom
  @impl.reason("Carbon's mHwnd is a member its own methods read directly; same reason as GetPresentParameters.")
  GetOutputWindow()
  {
    return this.#hwnd;
  }

  /**
   * Registers a callback to run after the update, before the frame
   * (`TriDevice.cpp:1189-1192`).
   *
   * @param {Function} callback The callback.
   * @param {*} [context] Passed back to it.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon delegates to an IBlueCallbackMan, which carries flags and a comparison function neither of which has a caller here; this is the list itself.")
  AddPostUpdateCallback(callback, context = null)
  {
    if (typeof callback === "function") this.#postUpdateCallbacks.push({ callback, context });
    return this;
  }

  // ==========================================================================
  // THE TICK BODY. Source: TriDevice.cpp:840-845, TriDeviceStub.cpp:16-28.
  // ==========================================================================

  /**
   * The simulation half of the tick (`TriDevice.cpp:444-477`): update every
   * playing curve set, and drop the ones that finished.
   *
   * ITERATED OVER A COPY, as Carbon does and for the reason Carbon gives: a
   * curve set finishing can add curve sets to this list.
   *
   * @param {number} realTime Time since the client started, in 100ns ticks.
   * @param {number} simTime The same, for simulation.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon opens with TriSrand( simTime ), seeding its global random stream so a frame is reproducible from its simulation time; the math layer's random is not a seedable global, so there is nothing to seed. The BlueList refcount dance around Remove has no counterpart either, because a JS array holds no references to release.")
  Update(realTime, simTime)
  {
    for (const curveSet of [ ...this.curveSets ])
    {
      curveSet.Update(realTime, simTime);
    }

    this.curveSets = this.curveSets.filter(curveSet => curveSet.IsPlaying());
    return this;
  }

  /**
   * The render half of the tick (`TriDeviceStub.cpp:16-28`).
   *
   * PRESENTATION IS HERE, AND IT IS BEFORE THE FRAME. The previous frame is
   * presented at the top of THIS tick, then the new one is rendered - which is
   * what overlaps CPU and GPU work, and why `Render` does not present.
   *
   * @param {number} realTime Time since the client started, in 100ns ticks.
   * @param {number} simTime The same, for simulation.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.implemented
  HandleRenderTick(realTime, simTime)
  {
    this.#renderJobs?.RunUpdate(realTime, simTime);

    for (const { callback, context } of [ ...this.#postUpdateCallbacks ])
    {
      callback(context);
    }

    Tr2RenderContext_GetMainThreadRenderContext().Present();

    this.Render();
    return this;
  }

  /**
   * Carbon's `ISimTimeRebaseNotify` half (`TriDevice.cpp:848-851`): the
   * simulation clock was MOVED, so carry the device's copy with it.
   *
   * @param {number} oldTime The simulation time before the move.
   * @param {number} newTime The simulation time after it.
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.implemented
  OnSimClockRebase(oldTime, newTime)
  {
    this.simTime += newTime - oldTime;
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

  /**
   * Whether the adapter supports a variable refresh rate (G-Sync, FreeSync).
   *
   * @returns {boolean} False.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon asks the adapter through DXGI. A browser is never told whether the display has a variable refresh rate - requestAnimationFrame reports no such thing - so the only truthful answer is no. Constant rather than a refusal because CreateSimpleDevice records it in the present parameters on every creation, and a device that cannot be created is worse than one that reports a capability it does not have.")
  IsVariableRefreshRateSupported()
  {
    return false;
  }

  /** Carbon method SupportsRaytracing (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SupportsRaytracing(...args)
  {
    throw new Error("TriDevice.SupportsRaytracing is not implemented in CarbonEngineJS.");
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

  /**
   * Refreshes the list of upscaling techniques this adapter offers
   * (`TriDevice.cpp:1330` and the DX12 backends).
   *
   * @returns {TriDevice} This device.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon enumerates DLSS, FSR and XeSS through vendor SDKs. No backend here offers any of them, so the list is empty - which is the truthful answer, not a stub. SetUpscaling still REFUSES, because that is the verb where a caller asks for upscaling and would otherwise be silently given none. CreateSimpleDevice calls this on every creation, so a refusal here would break device creation to report a capability nobody asked for.")
  UpdateAvailableUpscalingTechniques()
  {
    this.supportedUpscalingTechniques = [];
    return this;
  }

  /** One hour - the animation-clock recenter period. */
  static ANIMATION_TIME_MAX = 3600;

  static PresentInterval = PresentInterval;

  static SwapEffect = SwapEffect;

  static UpscalingSetting = UpscalingSetting;

  static UpscalingTechnique = UpscalingTechnique;

}

// Registered as Carbon registers it (trinity/trinity/TriDevice_Blue.cpp:164).
blue.enums.RegisterEnum("trinity.TriDevice.DeviceType", TriDevice.DeviceType, {
  source: "trinity/trinity/TriDevice.h", family: "trinityCore", line: 110,
  exposedName: "TriDeviceType", exposure: EnumRegistrationType.ENUM_REG_ENUM_OBJECT_ON_MODULE,
  chooserSource: "trinity/trinity/TriDevice_Blue.cpp:151",
  chooser: [
    { name: "HARDWARE", value: TriDevice.DeviceType.DEVICE_TYPE_HARDWARE, description: "Hardware device" },
    { name: "SOFTWARE", value: TriDevice.DeviceType.DEVICE_TYPE_SOFTWARE, description: "Software device" }
  ]
});
