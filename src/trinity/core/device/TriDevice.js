// Source: trinity/trinity/TriDevice.h
// Hand-maintained from Carbon source; Trinity owns the graph class and engines realize live state.
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { PresentInterval, SwapEffect, UpscalingSetting, UpscalingTechnique } from "#consts/render-context";
import {
  convertProjectionCoordToWorldPickRay,
  screenToProjection
} from "../view/pickRay.js";

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

  /** Carbon method Render -> PyRender (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  Render(...args)
  {
    throw new Error("TriDevice.Render is not implemented in CarbonEngineJS.");
  }

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

  /** Carbon method SetRenderJobs (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.notImplemented
  SetRenderJobs(...args)
  {
    throw new Error("TriDevice.SetRenderJobs is not implemented in CarbonEngineJS.");
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
