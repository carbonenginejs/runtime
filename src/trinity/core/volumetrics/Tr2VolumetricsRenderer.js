// Source: trinity/trinity/Tr2VolumetricsRenderer.h
// Source: trinity/trinity/Tr2VolumetricsRenderer.cpp
// Source: trinity/trinity/Tr2VolumetricsRenderer_Blue.cpp
import { meta } from "#schema";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureReference } from "../Tr2TextureReference.js";
import { AccumulatePriorityAttribute } from "../PriorityBlend.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2VolumetricsRendererFogViewDependentResources } from "./Tr2VolumetricsRendererFogViewDependentResources.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriRenderBatchAccumulator } from "../batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { EveComponentType } from "../../eve/EveComponentTypes.js";
import { PixelFormat, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { RenderingMode } from "#consts/graphics";
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/Tr2TextureAL.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
import { ShadowQuality, TriVariableContentType } from "../../generated/trinityCore/enums.js";


const FROXEL_FOG_COMPONENT = "FroxelFogSettings";
const FOG_COLOR_SCRATCH = vec3.create();
const EMPTY_VOLUME_TEXEL = Uint8Array.of(0, 0, 0, 0);




/**
 * Renders cloud slices and shadows, blends scene fog settings and keeps the fog's Mie environment map. The froxel fog
 * passes themselves wait on WGSL translation of their compute effects (see _RenderFog_Resources).
 */
@meta.define({ className: "Tr2VolumetricsRenderer", family: "trinityCore" })
export class Tr2VolumetricsRenderer
{
  @meta.blue.readwrite
  @meta.type.int32
  @meta.type.enum("trinity.Tr2VolumerticQuality")
  quality = Tr2VolumerticQuality.High;

  @meta.blue.read
  @meta.type.objectRef("Tr2TextureReference")
  mieEnvironmentMap = new Tr2TextureReference();

  @meta.blue.readwrite
  @meta.type.boolean
  blur = true;

  @meta.blue.readwrite
  @meta.type.boolean
  logBlending = true;

  @meta.blue.readwrite
  @meta.type.float32
  gameBackClip = 1e6;

  @meta.blue.read
  @meta.type.float32
  backgroundVisibility = 0;

  @meta.blue.read
  @meta.type.float32
  thickness = 0;

  @meta.blue.read
  @meta.type.float32
  environmentDirectionality = 0;

  @meta.blue.read
  @meta.type.float32
  lightDirectionality = 0;

  @meta.blue.read
  @meta.type.float32
  godRayNoiseAnimationSpeed = 0;

  @meta.blue.read
  @meta.type.vec3
  fogNoiseMovementSpeed = vec3.create();

  @meta.blue.read
  @meta.type.color
  fogColor = vec4.create();

  @meta.blue.read
  @meta.type.float32
  godRayNoiseFrequency = 0;

  @meta.blue.read
  @meta.type.float32
  fogNoiseFrequency = 0;

  @meta.blue.read
  @meta.type.float32
  godRayNoiseIntensity = 0;

  @meta.blue.read
  @meta.type.float32
  fogNoiseIntensity = 0;

  @meta.blue.readwrite
  @meta.type.float64
  logBlendingSmoothness = 4;

  @meta.blue.read
  @meta.type.float32
  environmentIntensity = 0;

  /** The blended reflection intensity (m_froxelFogSettings.reflectionIntensity, Blue read-only). */
  @meta.blue.read
  @meta.type.float32
  reflectionIntensity = 1;

  @meta.blue.readwrite
  @meta.type.boolean
  castShadows = false;

  @meta.blue.readwrite
  @meta.type.boolean
  receiveShadows = false;

  @meta.blue.readwrite
  @meta.type.float32
  scaleFactor = 0.7;

  _godRayNoiseAnimation = 0;

  _fogNoiseMovement = new Float64Array(3); // alloc: Carbon Vector3d; no double-precision math type

  _planets = [ vec4.fromValues(0, 0, 0, -1), vec4.fromValues(0, 0, 0, -1) ];

  _sunAngle = 0;

  /** m_fogResources / m_fogReflectionResources (cpp:51-52): the scene view's froxels filter temporally. */
  _fogResources = new Tr2VolumetricsRendererFogViewDependentResources(true);
  _fogReflectionResources = new Tr2VolumetricsRendererFogViewDependentResources(false);

  /** m_froxel3DNoise (cpp:80-98): 64³ signed random noise, created in the constructor. */
  _froxel3DNoise = new Tr2TextureReference();

  /** m_godRayNoiseMatrix (cpp:100-102): a double-precision matrix kept aligned with the sun. */
  _godRayNoiseMatrix = new Float64Array([ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]); // alloc: Carbon double[16]; no double-precision math type

  /** m_updateMieEnvironmentMap and the environment map's update state (cpp:104-122). */
  _updateMieEnvironmentMap = new Tr2Effect();
  _environmentJitter = vec2.create();
  _environmentRandom = 0;
  _previousEnvironmentG = 0;
  _environmentBlendCounter = 0;

  /** m_isReflectionProbe (h:112-115): scales the fog by reflectionIntensity while a probe renders. */
  _isReflectionProbe = false;

  /** Native cloud pass effects (cpp:51-66). */
  @meta.type.objectRef("Tr2Effect")
  volumeBlit = new Tr2Effect();
  @meta.type.objectRef("Tr2Effect")
  downsampleDepth = new Tr2Effect();
  @meta.type.objectRef("Tr2Effect")
  hBlur = new Tr2Effect();
  @meta.type.objectRef("Tr2Effect")
  vBlur = new Tr2Effect();
  /** Native unsorted cloud accumulator. */
  batches = new TriRenderBatchAccumulator();
  /** Last dimensions requested, for the native empty-scene cache keepalive. */
  lastRequestedWidth = 0;
  lastRequestedHeight = 0;

  /**
   * Reserves the fog and volume texture globals, sets the cloud and fog effect paths, and creates the 64³ froxel
   * noise texture on the main-thread render context (cpp:47-123).
   *
   * Adapted: Carbon fills the noise with TriRandInt( -127, +128 ), its own LCG (TriMath.cpp:998-1004); the browser
   * has no such generator, so Math.random draws the same [-127, 127] range, as the behaviors' TriRandInt ports do.
   */
  constructor()
  {
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariable_TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
    store.RegisterVariable_TextureAL("VolumetricDepthMap", new Tr2TextureAL());
    store.RegisterVariableInternal("EveSceneMieEnvironmentMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.mieEnvironmentMap);
    store.RegisterVariable_TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
    const path = "res:/Graphics/Effect/Managed/Space/SpecialFX/Volumetric/";
    this.volumeBlit.SetEffectPathName(path + "VolumeBlit.fx");
    this.downsampleDepth.SetEffectPathName(path + "DownsampleDepth.fx");
    this.hBlur.SetOption("SOURCE_TYPE", "SOURCE_TYPE_ARRAY");
    this.hBlur.SetEffectPathName(path + "BlurVolumetric.fx");
    this.vBlur.SetOption("SOURCE_TYPE", "SOURCE_TYPE_TEXTURE");
    this.vBlur.SetEffectPathName(path + "BlurVolumetric.fx");

    const noiseResolution = 64;
    const noiseData = new Int8Array(noiseResolution * noiseResolution * noiseResolution); // alloc: one-time noise upload
    for (let index = 0; index < noiseData.length; index++) noiseData[index] = Math.floor(Math.random() * 255) - 127;
    this._froxel3DNoise.GetTexture().Create(new Tr2BitmapDimensions({
      type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8_SNORM,
      width: noiseResolution, height: noiseResolution, depth: noiseResolution, mipCount: 1, arraySize: 1
    }), {
      gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, cpuUsage: Tr2CpuUsage.NONE,
      initialData: [ new Tr2SubresourceData(new Uint8Array(noiseData.buffer), noiseResolution, noiseResolution * noiseResolution) ] // alloc: byte view of the one-time noise upload
    }, Tr2RenderContext_GetMainThreadRenderContext());

    this._updateMieEnvironmentMap.SetEffectPathName("res:/Graphics/Effect/Managed/Space/SpecialFX/Volumetric/Fog/UpdateMieEnvironmentMap.fx");
  }

  /**
   * Updates all fog attributes from the scene's nominal component registry.
   *
   * Calls `GetFroxelFogSettings` directly on every registered component (the
   * registry validated each as an `ITr2FroxelFogSettings` when it was added),
   * sorts the records by descending priority and blends each attribute through
   * `AccumulatePriorityAttribute`. With `logBlending`, thickness is blended in
   * log space and converted back (cpp:341-395).
   *
   * Adapted: each attribute is selected by an accessor function where Carbon's
   * FROXEL_ACCUMULATE macro passes a member pointer.
   */
  @meta.blue.method
  @meta.adapted
  UpdateFogSettings(registry, updateContext)
  {
    const settings = Array.from(registry.GetComponents(FROXEL_FOG_COMPONENT), component =>
      component.GetFroxelFogSettings());

    const smoothness = this.logBlendingSmoothness;
    for (const value of settings)
    {
      value.logThickness.value = Math.log1p(Number(value.thickness.value) * smoothness);
      value.logThickness.enabled = value.thickness.enabled;
    }
    settings.sort((a, b) => b.priority - a.priority);

    this.thickness = AccumulatePriorityAttribute(settings, value => value.thickness);
    this.lightDirectionality = AccumulatePriorityAttribute(settings, value => value.lightDirectionality);
    this.environmentIntensity = AccumulatePriorityAttribute(settings, value => value.environmentIntensity);
    this.environmentDirectionality = AccumulatePriorityAttribute(settings, value => value.environmentDirectionality);
    AccumulatePriorityAttribute(settings, value => value.fogColor, this.fogColor);
    this.backgroundVisibility = AccumulatePriorityAttribute(settings, value => value.backgroundVisibility);
    this.godRayNoiseIntensity = AccumulatePriorityAttribute(settings, value => value.godRayNoiseIntensity);
    this.godRayNoiseFrequency = AccumulatePriorityAttribute(settings, value => value.godRayNoiseFrequency);
    this.godRayNoiseAnimationSpeed = AccumulatePriorityAttribute(settings, value => value.godRayNoiseAnimationSpeed);
    this.fogNoiseIntensity = AccumulatePriorityAttribute(settings, value => value.fogNoiseIntensity);
    this.fogNoiseFrequency = AccumulatePriorityAttribute(settings, value => value.fogNoiseFrequency);
    AccumulatePriorityAttribute(settings, value => value.fogNoiseMovementSpeed, this.fogNoiseMovementSpeed);
    this.reflectionIntensity = AccumulatePriorityAttribute(settings, value => value.reflectionIntensity);

    if (this.logBlending)
    {
      const logThickness = AccumulatePriorityAttribute(settings, value => value.logThickness);
      this.thickness = Math.expm1(logThickness) / smoothness;
    }

    const delta = updateContext.GetDeltaT();
    this._godRayNoiseAnimation += this.godRayNoiseAnimationSpeed * (delta / this._froxel3DNoise.GetDepth());
    this._godRayNoiseAnimation -= Math.floor(this._godRayNoiseAnimation);
    for (let lane = 0; lane < 3; lane++)
    {
      this._fogNoiseMovement[lane] += this.fogNoiseMovementSpeed[lane] * delta;
    }
  }

  /** Reports whether the blended fog thickness is strictly positive. */
  @meta.blue.method
  @meta.implemented
  HasFog()
  {
    return this.thickness > 0;
  }

  /**
   * Writes the FroxelPerFrameData fields (cpp:1044-1069). A reflection probe's fog is scaled by the blended
   * reflectionIntensity, clamped to 0..1; every other view's by 1.
   *
   * Adapted: Carbon fills an inline constant struct; this writes the same fields through the per-frame RawData layout.
   * @param {RawData} out The per-frame record.
   * @returns {RawData} out
   */
  @meta.blue.method
  @meta.adapted
  PopulatePerFrameData(out)
  {
    FOG_COLOR_SCRATCH[0] = this.fogColor[0];
    FOG_COLOR_SCRATCH[1] = this.fogColor[1];
    FOG_COLOR_SCRATCH[2] = this.fogColor[2];
    out.Set("FroxelFogColor", FOG_COLOR_SCRATCH);
    out.Set("FroxelBackgroundVisibility", Math.min(Math.max(this.backgroundVisibility, 0), 1));
    out.Set("FroxelBaseDensity", this.thickness / this.gameBackClip);
    out.Set("FroxelMaxDistance", this.gameBackClip);
    out.Set("FroxelMaxDistanceVisibility", Math.exp(-this.thickness));
    out.Set("FroxelEnvironmentIntensity", this.environmentIntensity);
    out.Set("FroxelEnvironmentG", -Math.min(Math.max(this.environmentDirectionality, 0.001), 0.999));
    out.Set("FroxelFogMultiplier", this._isReflectionProbe ? Math.min(Math.max(this.reflectionIntensity, 0), 1) : 1);
    out.SetIndex("FroxelPlanets", 0, this._planets[0]);
    out.SetIndex("FroxelPlanets", 1, this._planets[1]);
    return out;
  }

  /**
   * Marks whether the fog is being rendered for a reflection probe (h:112-115); PopulatePerFrameData then scales it
   * by the blended reflectionIntensity.
   * @param {boolean} isReflectionProbe Whether a reflection probe is rendering.
   */
  @meta.implemented
  SetIsReflectionProbe(isReflectionProbe)
  {
    this._isReflectionProbe = isReflectionProbe;
  }

  /** Applies Carbon's four quality presets. */
  @meta.blue.method
  @meta.implemented
  SetQuality(quality)
  {
    this.quality = quality;
    switch (quality)
    {
      case Tr2VolumerticQuality.Ultra:
        this.scaleFactor = 1;
        this.castShadows = true;
        this.receiveShadows = true;
        break;
      case Tr2VolumerticQuality.High:
        this.scaleFactor = 0.7;
        this.castShadows = true;
        this.receiveShadows = false;
        break;
      case Tr2VolumerticQuality.Medium:
        this.scaleFactor = 0.5;
        this.castShadows = false;
        this.receiveShadows = false;
        break;
      default:
        this.scaleFactor = 0.3;
        this.castShadows = false;
        this.receiveShadows = false;
        break;
    }
  }

  /**
   * Copies the two planet spheres used by the fog shader (cpp:1099-1106).
   *
   * Adapted: Carbon asserts a two-sphere span and copies it whole; this throws a RangeError for any other count and
   * copies the two vec4 records.
   */
  @meta.blue.method
  @meta.adapted
  SetPlanets(planets)
  {
    if (!planets || planets.length !== 2)
    {
      throw new RangeError("Tr2VolumetricsRenderer.SetPlanets requires exactly two spheres.");
    }
    vec4.copy(this._planets[0], planets[0]);
    vec4.copy(this._planets[1], planets[1]);
  }

  /** Stores the sun angle consumed by later fog constant production. */
  @meta.blue.method
  @meta.implemented
  SetSunAngle(angle)
  {
    this._sunAngle = angle;
  }

  /**
   * Carbon Tr2VolumetricsRenderer.cpp:152-340: update one cloud lightmap, render
   * four depth slices, optionally blur and composite over the saved target.
   * Adapted: pool descriptions combine the native overload arguments, and
   * explicit Free calls replace scope-bound pool handles. JS shader failures
   * throw, so finally also restores native target stacks and borrowed bindings.
   */
  @meta.blue.method
  @meta.adapted
  RenderVolumetrics(registry, frustum, sceneDepth, froxelFog, sunDirection,
    depthSlices, raytracingEnabled, gpuResourcePool, renderContext)
  {
    const originalWidth = sceneDepth.GetWidth(), originalHeight = sceneDepth.GetHeight();
    const width = Math.min(originalWidth, Math.max(1, Math.floor(originalWidth * this.scaleFactor)));
    const height = Math.min(originalHeight, Math.max(1, Math.floor(originalHeight * this.scaleFactor)));
    const description = { type: TextureType.TEX_TYPE_2D,
      format: PixelFormat.PIXEL_FORMAT_R16G16B16A16_FLOAT,
      width, height, depth: 1, mipCount: 1, arraySize: 4,
      gpuUsage: Tr2GpuUsage.RENDER_TARGET | Tr2GpuUsage.SHADER_RESOURCE };
    const componentType = EveComponentType.VolumetricRenderable;
    const count = registry.ComponentCount(componentType);
    if (count === 0)
    {
      if (width === this.lastRequestedWidth && height === this.lastRequestedHeight)
        gpuResourcePool.Free(gpuResourcePool.GetTempTexture("VolumetricSlices", description));
      return Tr2VolumetricsRenderer.getEmptyVolumetricTexture(gpuResourcePool);
    }
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariable_TextureAL("EveSceneFroxelFogMap", froxelFog);
    const sceneInformation = { quality: this.quality, depthSlices, targetWidth: width,
      targetHeight: height, sunDirection, receiveShadows: this.receiveShadows,
      castShadows: this.castShadows, raytracedShadows: raytracingEnabled };
    const esm = renderContext.GetEffectStateManager();
    const batches = this.batches;
    batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
    let volumetricDepth = null, blurScratch = null, volumeSlices = null;
    let pushedTargets = 0, pushedDepth = false, returned = false;
    try
    {
      registry.ProcessComponents(componentType, cloud => cloud.SetSceneInformation(sceneInformation));
      registry.ProcessComponentsUntil(componentType, cloud => cloud.UpdateVolumetricLightmap(renderContext));
      volumeSlices = gpuResourcePool.GetTempTexture("VolumetricSlices", description);
      this.lastRequestedWidth = width;
      this.lastRequestedHeight = height;
      for (let slot = 0; slot < 4; slot++)
      {
        esm.PushRenderTarget_Current(slot);
        pushedTargets++;
      }
      esm.PushDepthStencilBuffer_TextureAL(null);
      pushedDepth = true;
      if (originalWidth === width && originalHeight === height)
        this.volumeBlit.SetOption("CLOUD_UPSAMPLING", "CLOUD_UPSAMPLING_NONE");
      else
      {
        volumetricDepth = gpuResourcePool.GetTempTexture("VolumetricDepth", {
          ...description, arraySize: 1, format: PixelFormat.PIXEL_FORMAT_R32_FLOAT });
        this.volumeBlit.SetOption("CLOUD_UPSAMPLING", "CLOUD_UPSAMPLING_BILINEAR");
        esm.SetRenderTarget(0, volumetricDepth.Get());
        esm.SetRenderTarget(1, null);
        this.downsampleDepth.SetParameter_Vector4("DepthSizes", [width, height, originalWidth, originalHeight]);
        this.downsampleDepth.SetParameter_TextureAL("DepthMap", sceneDepth);
        Tr2Renderer.drawScreenQuad(renderContext, this.downsampleDepth);
        this.downsampleDepth.SetParameter_TextureAL("DepthMap", null);
      }
      store.RegisterVariable_TextureAL("VolumetricDepthMap", volumetricDepth && volumetricDepth.IsValid() ? volumetricDepth.Get() : sceneDepth);
      for (let slot = 0; slot < 4; slot++) esm.SetRenderTarget(slot, volumeSlices.Get(), true, slot);
      for (let slot = 0; slot < 4; slot++) renderContext.Clear({ clearColor: true, clearDepth: false, color: 0, slot });
      const renderables = [];
      registry.ProcessComponents(componentType, cloud => renderables.push([cloud, cloud.GetSortValue_Frustum(frustum)]));
      renderables.sort((left, right) => right[1] - left[1]);
      for (const [cloud] of renderables) cloud.GetVolumetricBatches(frustum, batches);
      if (batches.GetBatchCount())
      {
        batches.Finalize();
        esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
        renderContext.RenderBatches(batches);
        batches.Clear();
      }
      if (this.blur)
      {
        blurScratch = gpuResourcePool.GetTempTexture("VolumetricBlurScratch", { ...description, arraySize: 1 });
        esm.ApplyStandardStates(RenderingMode.RM_FULLSCREEN);
        esm.SetRenderTarget(0, blurScratch.Get());
        for (let slot = 1; slot < 4; slot++) esm.SetRenderTarget(slot, null);
        this.hBlur.SetParameter_TextureAL("EveSceneFogVolumeMap", volumeSlices.Get());
        this.hBlur.SetParameter_Vector4("DepthSizes", [width, height, 1 / width, 0]);
        Tr2Renderer.drawScreenQuad(renderContext, this.hBlur);
        this.hBlur.SetParameter_TextureAL("EveSceneFogVolumeMap", null);
        esm.SetRenderTarget(0, volumeSlices.Get(), true, 3);
        this.vBlur.SetParameter_Vector4("DepthSizes", [width, height, 0, 1 / height]);
        this.vBlur.SetParameter_TextureAL("SourceMap", blurScratch.Get());
        Tr2Renderer.drawScreenQuad(renderContext, this.vBlur);
        this.vBlur.SetParameter_TextureAL("SourceMap", null);
        gpuResourcePool.Free(blurScratch);
        blurScratch = null;
      }
      while (pushedTargets) esm.PopRenderTarget(--pushedTargets);
      esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
      this.volumeBlit.SetParameter_Vector4("DepthSizes", [width, height, originalWidth, originalHeight]);
      this.volumeBlit.SetParameter_TextureAL("EveSceneFogVolumeMap", volumeSlices.Get());
      Tr2Renderer.drawScreenQuad(renderContext, this.volumeBlit);
      this.volumeBlit.SetParameter_TextureAL("EveSceneFogVolumeMap", null);
      esm.PopDepthStencilBuffer();
      pushedDepth = false;
      returned = true;
      return volumeSlices;
    }
    finally
    {
      // JS shader failures throw; restore the native stacks and explicit handle
      // ownership before propagating them to the caller.
      while (pushedTargets) esm.PopRenderTarget(--pushedTargets);
      if (pushedDepth) esm.PopDepthStencilBuffer();
      batches.Clear();
      this.downsampleDepth.SetParameter_TextureAL("DepthMap", new Tr2TextureAL());
      this.hBlur.SetParameter_TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
      this.vBlur.SetParameter_TextureAL("SourceMap", new Tr2TextureAL());
      this.volumeBlit.SetParameter_TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
      store.RegisterVariable_TextureAL("VolumetricDepthMap", new Tr2TextureAL());
      if (!returned && volumeSlices) gpuResourcePool.Free(volumeSlices);
      if (volumetricDepth) gpuResourcePool.Free(volumetricDepth);
      if (blurScratch) gpuResourcePool.Free(blurScratch);
      store.RegisterVariable_TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
    }
  }

  /** Native four transparent slices (cpp:125-150); options combine the pool overloads. */
  @meta.adapted
  static getEmptyVolumetricTexture(gpuResourcePool)
  {
    const initialData = Array.from({ length: 4 }, () => new Tr2SubresourceData(EMPTY_VOLUME_TEXEL, 4, 4));
    return gpuResourcePool.GetPersistentTexture("EmptyEmptyVolumetricSlices", {
      type: TextureType.TEX_TYPE_2D, format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
      width: 1, height: 1, depth: 1, mipCount: 1, arraySize: 4,
      gpuUsage: Tr2GpuUsage.SHADER_RESOURCE, initialData
    });
  }

  /**
   * Renders the scene view's froxel fog into a 3D froxel texture and composites it over the current target, returning
   * the froxels; with the fog off it returns the empty fog texture (cpp:491-514). The scene view's resources filter
   * temporally.
   * @returns {object} The froxel texture, or the empty fog texture.
   */
  @meta.blue.method
  @meta.implemented
  RenderFog(renderContext, gpuResourcePool, width, height, cascadedShadowMap, raytracingGeometry, shadowQuality,
    sunDirection, sunColor, origin, originShift, view, projection, viewLast, projectionLast)
  {
    const fog = this._RenderFog_Resources(this._fogResources, renderContext, gpuResourcePool, width, height,
      cascadedShadowMap, raytracingGeometry, shadowQuality, sunDirection, sunColor, origin, originShift, view, projection,
      viewLast, projectionLast);
    if (!fog) return Tr2VolumetricsRenderer.getEmptyFogTexture(gpuResourcePool);
    return fog;
  }

  /**
   * Renders the fog into a reflection map (cpp:516-533): the same froxel passes with the reflection resources, which
   * do not filter temporally, no shadows, no origin shift, and this frame's view and projection standing in for last
   * frame's. With the fog off it returns the empty fog texture.
   * @returns {object} The froxel texture, or the empty fog texture.
   */
  @meta.blue.method
  @meta.implemented
  RenderFogIntoReflectionMap(renderContext, gpuResourcePool, width, height, sunDirection, sunColor, origin, view, projection)
  {
    const fog = this._RenderFog_Resources(this._fogReflectionResources, renderContext, gpuResourcePool, width, height,
      null, null, ShadowQuality.SHADOW_DISABLED, sunDirection, sunColor, origin, Tr2VolumetricsRenderer._zeroOrigin, view,
      projection, view, projection);
    if (!fog) return Tr2VolumetricsRenderer.getEmptyFogTexture(gpuResourcePool);
    return fog;
  }

  /** Native transparent 3D fog texel (cpp:536-553); options combine the pool overloads. */
  @meta.adapted
  static getEmptyFogTexture(gpuResourcePool)
  {
    return gpuResourcePool.GetPersistentTexture("EmptyFroxelFog", {
      type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
      width: 1, height: 1, depth: 1, mipCount: 1, arraySize: 1,
      gpuUsage: Tr2GpuUsage.SHADER_RESOURCE,
      initialData: [new Tr2SubresourceData(EMPTY_VOLUME_TEXEL, 4, 4)]
    });
  }

  /**
   * Carbon's private RenderFog worker (h:171-187, cpp:552-806), named by the view resources it takes first: sizes the
   * froxel volume from the quality preset, then calculates, temporally filters and raymarches the froxels and applies
   * them to the scene. With the fog off it returns nothing, Carbon's empty texture, and its callers substitute the
   * empty fog texture.
   *
   * NOT IMPLEMENTED with the fog on: three of its four compute effects do not translate to WGSL yet.
   * CalculateFroxels fails on a control-flow merge without a selection plan, FilterFroxels on offset samples of a 3D
   * texture, and RaymarchFroxels on loads from a 3D texture. It throws rather than drawing no fog, which would look
   * plausible.
   * @param {Tr2VolumetricsRendererFogViewDependentResources} resources The view's froxel effects and temporal state.
   * @returns {object|null} The froxel texture; null where Carbon returns an empty texture.
   */
  @meta.notImplemented
  _RenderFog_Resources(resources, renderContext, gpuResourcePool, originalWidth, originalHeight, cascadedShadowMap,
    raytracingGeometry, shadowQuality, sunDirection, sunColor, origin, originShift, view, projection, viewLast,
    projectionLast)
  {
    const froxelsEnabled = this.thickness > 0;
    if (!froxelsEnabled) return null;
    throw new Error("Tr2VolumetricsRenderer.RenderFog: the froxel compute effects do not translate to WGSL yet.");
  }

  /**
   * Rebuilds the Mie environment map the froxel fog lights itself with (cpp:403-489). With environment lighting on
   * (fog on and environmentIntensity above 0) the map is a 128² RGBA32F cube, which one compute dispatch of
   * UpdateMieEnvironmentMap blends towards the environment each frame, with golden-ratio jitter and a blend weight
   * that settles as the directionality holds steady. Otherwise it is a black 1² cube. A size change recreates the map
   * and restarts the blend.
   * @param {object} renderContext The frame's Tr2RenderContext.
   */
  @meta.blue.method
  @meta.implemented
  UpdateFogEnvironmentMap(renderContext)
  {
    const froxelsEnabled = this.thickness > 0;
    const environmentLightingEnabled = froxelsEnabled && this.environmentIntensity > 0;
    const environmentMapResolution = environmentLightingEnabled ? 128 : 1;

    const mieEnvironmentMap = this.mieEnvironmentMap.GetTexture();
    if (!mieEnvironmentMap.IsValid() || this.mieEnvironmentMap.GetWidth() !== environmentMapResolution)
    {
      const mainThreadRenderContext = Tr2RenderContext_GetMainThreadRenderContext();
      // Restart the blend from zero the next time environment lighting is enabled.
      this._environmentBlendCounter = 0;
      if (environmentLightingEnabled)
      {
        // Full 32-bit precision: the map is blended into with a low weight.
        mieEnvironmentMap.Create(new Tr2BitmapDimensions({
          type: TextureType.TEX_TYPE_CUBE, format: PixelFormat.PIXEL_FORMAT_R32G32B32A32_FLOAT,
          width: environmentMapResolution, height: environmentMapResolution, depth: 1, mipCount: 1, arraySize: 6
        }), { gpuUsage: Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE }, mainThreadRenderContext);
      }
      else
      {
        const initialData = Array.from({ length: 6 }, () => new Tr2SubresourceData(EMPTY_VOLUME_TEXEL, 4, 4));
        mieEnvironmentMap.Create(new Tr2BitmapDimensions({
          type: TextureType.TEX_TYPE_CUBE, format: PixelFormat.PIXEL_FORMAT_R8G8B8A8_UNORM,
          width: 1, height: 1, depth: 1, mipCount: 1, arraySize: 6
        }), { gpuUsage: Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE, initialData }, mainThreadRenderContext);
      }
      if (!mieEnvironmentMap.IsValid())
      {
        console.error(`Tr2VolumetricsRenderer failed to create environment cubemap with size ${environmentMapResolution}x`);
        return;
      }
      this.mieEnvironmentMap.OnTextureChange().Broadcast();
    }

    if (environmentLightingEnabled)
    {
      const g = 1.61803398874989484820;
      const g2 = 1.32471795724474602596;

      const jitter = this._environmentJitter;
      jitter[0] += 1 / (g2 * g2);
      jitter[1] += 1 / g2;
      jitter[0] -= Math.floor(jitter[0]);
      jitter[1] -= Math.floor(jitter[1]);

      this._environmentRandom += g;
      this._environmentRandom -= Math.floor(this._environmentRandom);

      const environmentG = -Math.min(Math.max(this.environmentDirectionality, 0.001), 0.999);

      this._environmentBlendCounter++;
      const delta = Math.abs(this._previousEnvironmentG - environmentG);
      this._environmentBlendCounter = Math.min(this._environmentBlendCounter, 1 / delta);
      const blendWeight = Math.max(1 / this._environmentBlendCounter, 0.005);
      this._previousEnvironmentG = environmentG;

      const effect = this._updateMieEnvironmentMap;
      effect.SetParameter_UInt32("Resolution", environmentMapResolution);
      effect.SetParameter_Vector2("Jitter", jitter);
      effect.SetParameter("EnvironmentG", environmentG);
      effect.SetParameter("BlendWeight", blendWeight);
      effect.SetParameter("Random", this._environmentRandom);
      effect.SetParameter_TextureProvider("PrecomputedMieEnvironmentMap", this.mieEnvironmentMap);
      Tr2Renderer.runComputeShader(effect, environmentMapResolution / 8, environmentMapResolution / 8, 6, renderContext);
    }
  }

  /**
   * Publishes the Mie environment map under the name effects sample it by.
   *
   * Carbon takes no arguments here and registers on the global store
   * (`Tr2VolumetricsRenderer.cpp`, one line). The port had grown a
   * `renderContext` parameter that existed only to reach an executor.
   */
  @meta.blue.method
  @meta.implemented
  UpdateVariableStore()
  {
    Tr2VariableStore.globalStore().RegisterVariableInternal("EveSceneMieEnvironmentMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.mieEnvironmentMap);
  }

  /**
   * Carbon shadow batches and target stack (Tr2VolumetricsRenderer.cpp:1115-1145).
   * Adapted: finally restores native stacks when a JavaScript shader draw throws.
   */
  @meta.blue.method
  @meta.adapted
  RenderShadows(registry, shadowMap, renderContext)
  {
    if (!shadowMap.IsValid() || !this.castShadows) return;
    const batches = this.batches;
    batches.SetTriPoolAllocator(renderContext.GetTriPoolAllocator());
    registry.ProcessComponents(EveComponentType.VolumetricRenderable,
      cloud => cloud.GetVolumetricShadowBatches(batches));
    if (!batches.GetBatchCount()) return;
    batches.Finalize();
    const esm = renderContext.GetEffectStateManager();
    esm.PushRenderTarget_TextureAL(shadowMap);
    esm.PushDepthStencilBuffer_TextureAL(null);
    esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
    try { renderContext.RenderBatches(batches, "Shadow"); }
    finally
    {
      batches.Clear();
      esm.PopRenderTarget();
      esm.PopDepthStencilBuffer();
    }
  }

  static Tr2VolumerticQuality = Tr2VolumerticQuality;
  static FogViewDependentResources = Tr2VolumetricsRendererFogViewDependentResources;
  /** Vector3d( 0, 0, 0 ): the reflection map's origin shift (cpp:527). */
  static _zeroOrigin = new Float64Array(3); // alloc: Carbon Vector3d; no double-precision math type
}
