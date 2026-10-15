// Source: trinity/trinity/Tr2VolumetricsRenderer.h
// Source: trinity/trinity/Tr2VolumetricsRenderer.cpp
// Source: trinity/trinity/Tr2VolumetricsRenderer_Blue.cpp
import { meta, type, blue } from "#schema";
import { mat4 } from "#math/mat4";
import { vec2 } from "#math/vec2";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureReference } from "../Tr2TextureReference.js";
import { PriorityBlend } from "../PriorityBlend.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2VolumetricsRendererFogViewDependentResources } from "./Tr2VolumetricsRendererFogViewDependentResources.js";
import { PER_OBJECT_VS, Tr2Renderer } from "../Tr2Renderer.js";
import { TriRenderBatchAccumulator } from "../batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { EveComponentType } from "../../eve/EntityComponents.js";
import { Tr2LightManager } from "../lighting/Tr2LightManager.js";
import { CjsTr2VolumetricsRendererLayout } from "../rawData/layouts/CjsTr2VolumetricsRendererLayout.js";
import { PixelFormat, ShaderType, TextureType, Tr2CpuUsage, Tr2GpuUsage } from "#consts/render-context";
import { Failed, Tr2ConstantUsageAL } from "#trinityal";
import { RawData } from "../rawData/RawData.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../context/Tr2RenderContext.js";
import { BitmapDimensions as Tr2BitmapDimensions } from "#imageio";
import { RenderingMode } from "#consts/graphics";
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/Tr2TextureAL.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";
import { ShadowQuality, TriVariableContentType } from "../../generated/trinityCore/enums.js";


const FROXEL_FOG_COMPONENT = "FroxelFogSettings";
const FOG_COLOR_SCRATCH = vec3.create();
const EMPTY_VOLUME_TEXEL = Uint8Array.of(0, 0, 0, 0);

/** ScalingMatrix( 0.5, -0.5, 1 ) * TranslationMatrix( 0.5, 0.5, 0 ): clip space to shadow-map UV, y flipped (cpp:1004). */
const SHADOW_CLIP_TO_UV = mat4.fromValues(0.5, 0, 0, 0, 0, -0.5, 0, 0, 0, 0, 1, 0, 0.5, 0.5, 0, 1);

/** The fog's DynamicLights staging: PerLightData copied as bytes, then written as uint32 lanes, so bit fields survive. */
const { PER_LIGHT_DATA_LANES, MAX_FOG_DYNAMIC_LIGHTS } = CjsTr2VolumetricsRendererLayout;
const FOG_LIGHTS = new Float32Array(MAX_FOG_DYNAMIC_LIGHTS * PER_LIGHT_DATA_LANES); // alloc: module staging for DynamicLights
const FOG_LIGHT_BITS = new Uint32Array(FOG_LIGHTS.buffer); // alloc: uint32 view of the same staging bytes




/**
 * Renders cloud slices and shadows, blends scene fog settings and keeps the fog's Mie environment map. The froxel fog
 * passes themselves wait on WGSL translation of their compute effects (see _RenderFog_Resources).
 */
@blue.define("Tr2VolumetricsRenderer")
export class Tr2VolumetricsRenderer
{
  @blue.readwrite
  @type.int32
  @type.enum("trinity.Tr2VolumerticQuality")
  quality = Tr2VolumerticQuality.High;

  @blue.read
  @type.rootRef("Tr2TextureReference")
  mieEnvironmentMap = new Tr2TextureReference();

  @blue.readwrite
  @type.boolean
  blur = true;

  @blue.readwrite
  @type.boolean
  logBlending = true;

  @blue.readwrite
  @type.float32
  gameBackClip = 1e6;

  @blue.read
  @type.float32
  backgroundVisibility = 0;

  @blue.read
  @type.float32
  thickness = 0;

  @blue.read
  @type.float32
  environmentDirectionality = 0;

  @blue.read
  @type.float32
  lightDirectionality = 0;

  @blue.read
  @type.float32
  godRayNoiseAnimationSpeed = 0;

  @blue.read
  @type.vec3
  fogNoiseMovementSpeed = vec3.create();

  @blue.read
  @type.color
  fogColor = vec4.create();

  @blue.read
  @type.float32
  godRayNoiseFrequency = 0;

  @blue.read
  @type.float32
  fogNoiseFrequency = 0;

  @blue.read
  @type.float32
  godRayNoiseIntensity = 0;

  @blue.read
  @type.float32
  fogNoiseIntensity = 0;

  @blue.readwrite
  @type.float64
  logBlendingSmoothness = 4;

  @blue.read
  @type.float32
  environmentIntensity = 0;

  /** The blended reflection intensity (m_froxelFogSettings.reflectionIntensity, Blue read-only). */
  @blue.read
  @type.float32
  reflectionIntensity = 1;

  @blue.readwrite
  @type.boolean
  castShadows = false;

  @blue.readwrite
  @type.boolean
  receiveShadows = false;

  @blue.readwrite
  @type.float32
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

  /** m_fogConstantBuffer (cpp:658-661), created on first use, and the record its bytes are filled from. */
  _fogConstantBuffer = null;
  _fogPerObjectData = RawData.create("FogPerObjectData");

  /** Native cloud pass effects (cpp:51-66). */
  @type.rootRef("Tr2Effect")
  volumeBlit = new Tr2Effect();
  @type.rootRef("Tr2Effect")
  downsampleDepth = new Tr2Effect();
  @type.rootRef("Tr2Effect")
  hBlur = new Tr2Effect();
  @type.rootRef("Tr2Effect")
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
    store.RegisterVariable__TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
    store.RegisterVariable__TextureAL("VolumetricDepthMap", new Tr2TextureAL());
    store.RegisterVariableInternal("EveSceneMieEnvironmentMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.mieEnvironmentMap);
    store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
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
   * `PriorityBlend.accumulate`. With `logBlending`, thickness is blended in
   * log space and converted back (cpp:341-395).
   *
   * Adapted: each attribute is selected by an accessor function where Carbon's
   * FROXEL_ACCUMULATE macro passes a member pointer.
   */
  @blue.method
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

    this.thickness = PriorityBlend.accumulate(settings, value => value.thickness);
    this.lightDirectionality = PriorityBlend.accumulate(settings, value => value.lightDirectionality);
    this.environmentIntensity = PriorityBlend.accumulate(settings, value => value.environmentIntensity);
    this.environmentDirectionality = PriorityBlend.accumulate(settings, value => value.environmentDirectionality);
    PriorityBlend.accumulate(settings, value => value.fogColor, this.fogColor);
    this.backgroundVisibility = PriorityBlend.accumulate(settings, value => value.backgroundVisibility);
    this.godRayNoiseIntensity = PriorityBlend.accumulate(settings, value => value.godRayNoiseIntensity);
    this.godRayNoiseFrequency = PriorityBlend.accumulate(settings, value => value.godRayNoiseFrequency);
    this.godRayNoiseAnimationSpeed = PriorityBlend.accumulate(settings, value => value.godRayNoiseAnimationSpeed);
    this.fogNoiseIntensity = PriorityBlend.accumulate(settings, value => value.fogNoiseIntensity);
    this.fogNoiseFrequency = PriorityBlend.accumulate(settings, value => value.fogNoiseFrequency);
    PriorityBlend.accumulate(settings, value => value.fogNoiseMovementSpeed, this.fogNoiseMovementSpeed);
    this.reflectionIntensity = PriorityBlend.accumulate(settings, value => value.reflectionIntensity);

    if (this.logBlending)
    {
      const logThickness = PriorityBlend.accumulate(settings, value => value.logThickness);
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
  @blue.method
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
  @blue.method
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
  @blue.method
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
  @blue.method
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
  @blue.method
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
  @blue.method
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
    store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", froxelFog);
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
        esm.PushRenderTarget__Current(slot);
        pushedTargets++;
      }
      esm.PushDepthStencilBuffer__TextureAL(null);
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
        this.downsampleDepth.SetParameter__Vector4("DepthSizes", [width, height, originalWidth, originalHeight]);
        this.downsampleDepth.SetParameter__TextureAL("DepthMap", sceneDepth);
        Tr2Renderer.drawScreenQuad(renderContext, this.downsampleDepth);
        this.downsampleDepth.SetParameter__TextureAL("DepthMap", null);
      }
      store.RegisterVariable__TextureAL("VolumetricDepthMap", volumetricDepth && volumetricDepth.IsValid() ? volumetricDepth.Get() : sceneDepth);
      for (let slot = 0; slot < 4; slot++) esm.SetRenderTarget(slot, volumeSlices.Get(), true, slot);
      for (let slot = 0; slot < 4; slot++) renderContext.Clear({ clearColor: true, clearDepth: false, color: 0, slot });
      const renderables = [];
      registry.ProcessComponents(componentType, cloud => renderables.push([cloud, cloud.GetSortValue__Frustum(frustum)]));
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
        this.hBlur.SetParameter__TextureAL("EveSceneFogVolumeMap", volumeSlices.Get());
        this.hBlur.SetParameter__Vector4("DepthSizes", [width, height, 1 / width, 0]);
        Tr2Renderer.drawScreenQuad(renderContext, this.hBlur);
        this.hBlur.SetParameter__TextureAL("EveSceneFogVolumeMap", null);
        esm.SetRenderTarget(0, volumeSlices.Get(), true, 3);
        this.vBlur.SetParameter__Vector4("DepthSizes", [width, height, 0, 1 / height]);
        this.vBlur.SetParameter__TextureAL("SourceMap", blurScratch.Get());
        Tr2Renderer.drawScreenQuad(renderContext, this.vBlur);
        this.vBlur.SetParameter__TextureAL("SourceMap", null);
        gpuResourcePool.Free(blurScratch);
        blurScratch = null;
      }
      while (pushedTargets) esm.PopRenderTarget(--pushedTargets);
      esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
      this.volumeBlit.SetParameter__Vector4("DepthSizes", [width, height, originalWidth, originalHeight]);
      this.volumeBlit.SetParameter__TextureAL("EveSceneFogVolumeMap", volumeSlices.Get());
      Tr2Renderer.drawScreenQuad(renderContext, this.volumeBlit);
      this.volumeBlit.SetParameter__TextureAL("EveSceneFogVolumeMap", null);
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
      this.downsampleDepth.SetParameter__TextureAL("DepthMap", new Tr2TextureAL());
      this.hBlur.SetParameter__TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
      this.vBlur.SetParameter__TextureAL("SourceMap", new Tr2TextureAL());
      this.volumeBlit.SetParameter__TextureAL("EveSceneFogVolumeMap", new Tr2TextureAL());
      store.RegisterVariable__TextureAL("VolumetricDepthMap", new Tr2TextureAL());
      if (!returned && volumeSlices) gpuResourcePool.Free(volumeSlices);
      if (volumetricDepth) gpuResourcePool.Free(volumetricDepth);
      if (blurScratch) gpuResourcePool.Free(blurScratch);
      store.RegisterVariable__TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
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
  @blue.method
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
  @blue.method
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
   * Carbon's private RenderFog worker (h:171-187, cpp:552-806), named by the view resources it takes first.
   *
   * Sizes the froxel volume from the quality preset: a sixth to a sixteenth of the view, at 64 to 128 depth layers.
   * With the fog off it returns nothing, Carbon's empty texture, and its callers substitute the empty fog texture.
   * Otherwise it:
   * - picks the shadow source: raytraced, the cascades, or none;
   * - advances a temporal view's golden-ratio jitter;
   * - uploads the fog constants (_UpdatePerObjectData) to the compute stage's per-object register (PER_OBJECT_VS, the
   *   value of Carbon's static GetPerObjectVSStartRegister);
   * - calculates the froxels into an R11G11B10 3D volume;
   * - for a temporal view, filters them against last frame's, ping-ponging two persistent volumes cleared to
   *   (0, 0, 0, 1);
   * - raymarches them front to back;
   * - applies them over the scene with one alpha-blended screen quad.
   *
   * Adapted:
   * - **Raytraced shadows.** The raytraced-shadow branch needs DispatchRays, which no JavaScript backend provides;
   *   no scene passes raytracing geometry to it, and choosing that branch throws.
   * - **Constants.** They are filled into a FogPerObjectData record and copied into the locked buffer as bytes, so
   *   the bit-field light words arrive intact.
   * - **Pool handles.** They are released explicitly; the froxel handle is returned to the caller, who releases it.
   * - **GPU regions.** Carbon's GPU regions are not ported.
   * @param {Tr2VolumetricsRendererFogViewDependentResources} resources The view's froxel effects and temporal state.
   * @returns {GpuResourceHandle|null} The froxel texture; null where Carbon returns an empty texture.
   */
  @meta.adapted
  _RenderFog_Resources(resources, renderContext, gpuResourcePool, originalWidth, originalHeight, cascadedShadowMap,
    raytracingGeometry, shadowQuality, sunDirection, sunColor, origin, originShift, view, projection, viewLast,
    projectionLast)
  {
    let width = 1;
    let height = 1;
    let depth = 1;

    const froxelsEnabled = this.thickness > 0;
    if (froxelsEnabled)
    {
      let scale;
      let numLayers;
      switch (this.quality)
      {
        case Tr2VolumerticQuality.Ultra:
          scale = 1 / 6;
          numLayers = 128;
          break;
        case Tr2VolumerticQuality.High:
          scale = 1 / 8;
          numLayers = 128;
          break;
        case Tr2VolumerticQuality.Medium:
          scale = 1 / 12;
          numLayers = 96;
          break;
        case Tr2VolumerticQuality.Low:
        default:
          scale = 1 / 16;
          numLayers = 64;
          break;
      }
      width = Math.max(4, Math.floor(originalWidth * Math.fround(scale)));
      height = Math.max(4, Math.floor(originalHeight * Math.fround(scale)));
      depth = Math.max(1, numLayers);
    }

    const temporalFog = resources.useTemporalFroxels;

    if (!froxelsEnabled) return null;

    let shadowType;
    if (raytracingGeometry !== null && raytracingGeometry.HasGeometry() && shadowQuality === ShadowQuality.SHADOW_RAYTRACED
      && resources.rtCalculateFroxels && resources.rtCalculateFroxels.GetShaderStateInterface())
    {
      shadowType = Tr2VolumetricsRenderer._shadowType.SHADOWS_RAYTRACED;
    }
    else if (cascadedShadowMap !== null && (shadowQuality === ShadowQuality.SHADOW_LOW || shadowQuality === ShadowQuality.SHADOW_HIGH))
    {
      shadowType = Tr2VolumetricsRenderer._shadowType.SHADOWS_CASCADED;
    }
    else
    {
      shadowType = Tr2VolumetricsRenderer._shadowType.SHADOWS_DISABLED;
    }

    if (temporalFog)
    {
      // The per-frame jitter offset.
      const g = 1.61803398874989484820;
      const g2 = 1.32471795724474602596;
      const jitter = resources.froxelJitter;
      jitter[0] += 1 / (g2 * g2);
      jitter[1] += 1 / g2;
      jitter[2] += 1 / g;
      jitter[0] -= Math.floor(jitter[0]);
      jitter[1] -= Math.floor(jitter[1]);
      jitter[2] -= Math.floor(jitter[2]);
    }

    if (!this._fogConstantBuffer || !this._fogConstantBuffer.IsValid())
    {
      this._fogConstantBuffer = renderContext.CreateConstantBuffer();
      if (Failed(this._fogConstantBuffer.Create(this._fogPerObjectData.GetData().byteLength, Tr2ConstantUsageAL.REUSABLE, null, renderContext))) return null;
    }

    const data = this._fogPerObjectData;
    this._UpdatePerObjectData(data, view, projection, viewLast, projectionLast, origin, originShift, sunDirection, sunColor,
      width, height, depth, resources.froxelJitter,
      shadowType === Tr2VolumetricsRenderer._shadowType.SHADOWS_CASCADED ? cascadedShadowMap : null);
    const locked = this._fogConstantBuffer.Lock(renderContext);
    if (Failed(locked.result) || !locked.data) return null;
    const bytes = data.GetData();
    locked.data.set(new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength)); // alloc: byte view of the record for the upload
    if (Failed(this._fogConstantBuffer.Unlock(renderContext))) return null;
    if (Failed(renderContext.SetConstants(this._fogConstantBuffer, ShaderType.COMPUTE_SHADER, PER_OBJECT_VS))) return null;

    const dimensions = {
      type: TextureType.TEX_TYPE_3D, format: PixelFormat.PIXEL_FORMAT_R11G11B10_FLOAT,
      width, height, depth, mipCount: 1, arraySize: 1,
      gpuUsage: Tr2GpuUsage.UNORDERED_ACCESS | Tr2GpuUsage.SHADER_RESOURCE
    };
    const fogFroxels = gpuResourcePool.GetTempTexture("FogFroxels", dimensions);

    const workgroupSize = 4;
    const wgX = Math.floor((width + workgroupSize - 1) / workgroupSize);
    const wgY = Math.floor((height + workgroupSize - 1) / workgroupSize);
    const wgZ = Math.floor((depth + workgroupSize - 1) / workgroupSize);

    let temporalFroxels0 = null;
    let temporalFroxels1 = null;
    try
    {
      if (shadowType === Tr2VolumetricsRenderer._shadowType.SHADOWS_RAYTRACED)
      {
        throw new Error("Tr2VolumetricsRenderer.RenderFog: raytraced froxel shadows need DispatchRays, which no JavaScript backend provides.");
      }
      else
      {
        // Otherwise, just a plain compute shader.
        const calculateFroxels = resources.calculateFroxels;
        calculateFroxels.SetOption("SHADOWS", shadowType === Tr2VolumetricsRenderer._shadowType.SHADOWS_CASCADED ? "SHADOWS_ENABLED" : "SHADOWS_DISABLED");
        calculateFroxels.SetOption("GOD_RAY_NOISE", this.godRayNoiseIntensity > 0 ? "GOD_RAY_NOISE_ENABLED" : "GOD_RAY_NOISE_DISABLED");
        calculateFroxels.SetOption("FOG_NOISE", this.fogNoiseIntensity > 0 ? "FOG_NOISE_ENABLED" : "FOG_NOISE_DISABLED");
        calculateFroxels.SetParameter__TextureProvider("Noise3DTexture", this._froxel3DNoise);
        calculateFroxels.SetParameter__TextureAL("RtFroxelOutputTexture", fogFroxels.Get());
        Tr2Renderer.runComputeShader(calculateFroxels, wgX, wgY, wgZ, renderContext);
      }

      if (temporalFog)
      {
        const clear = texture => { renderContext.ClearUav(texture, Tr2VolumetricsRenderer._temporalClearValue, true); };
        temporalFroxels0 = gpuResourcePool.GetPersistentTexture("TemporalFroxelFog0", dimensions, clear);
        temporalFroxels1 = gpuResourcePool.GetPersistentTexture("TemporalFroxelFog1", dimensions, clear);

        const temporalInput = resources.currentTemporalFroxels ? temporalFroxels0 : temporalFroxels1;
        const temporalOutput = resources.currentTemporalFroxels ? temporalFroxels1 : temporalFroxels0;
        resources.currentTemporalFroxels = !resources.currentTemporalFroxels;

        resources.filterFroxels.SetParameter__TextureAL("InputTexture", fogFroxels.Get());
        resources.filterFroxels.SetParameter__TextureAL("PreviousTexture", temporalInput.Get());
        resources.filterFroxels.SetParameter__TextureAL("OutputTexture", temporalOutput.Get());
        Tr2Renderer.runComputeShader(resources.filterFroxels, wgX, wgY, wgZ, renderContext);

        resources.raymarchFroxels.SetParameter__TextureAL("InputTexture", temporalOutput.Get());
      }

      resources.raymarchFroxels.SetParameter__TextureAL("OutputTexture", fogFroxels.Get());
      // An 8x4 workgroup is faster here.
      Tr2Renderer.runComputeShader(resources.raymarchFroxels, Math.floor((width + 7) / 8), Math.floor((height + 3) / 4), 1, renderContext);

      renderContext.GetEffectStateManager().ApplyStandardStates(RenderingMode.RM_ALPHA);
      resources.applyFroxels.SetOption("ENVIRONMENT_LIGHTING", this.environmentIntensity > 0 ? "ENVIRONMENT_LIGHTING_ENABLED" : "ENVIRONMENT_LIGHTING_DISABLED");
      resources.applyFroxels.SetParameter__TextureAL("EveSceneFroxelFogMap", fogFroxels.Get());
      Tr2Renderer.drawScreenQuad(renderContext, resources.applyFroxels);
      resources.applyFroxels.SetParameter__TextureAL("EveSceneFroxelFogMap", new Tr2TextureAL());
    }
    catch (error)
    {
      gpuResourcePool.Free(fogFroxels);
      throw error;
    }
    finally
    {
      if (temporalFroxels0) gpuResourcePool.Free(temporalFroxels0);
      if (temporalFroxels1) gpuResourcePool.Free(temporalFroxels1);
    }
    return fogFroxels;
  }

  /**
   * Rebuilds the Mie environment map the froxel fog lights itself with (cpp:403-489). With environment lighting on
   * (fog on and environmentIntensity above 0) the map is a 128² RGBA32F cube, which one compute dispatch of
   * UpdateMieEnvironmentMap blends towards the environment each frame, with golden-ratio jitter and a blend weight
   * that settles as the directionality holds steady. Otherwise it is a black 1² cube. A size change recreates the map
   * and restarts the blend.
   * @param {object} renderContext The frame's Tr2RenderContext.
   */
  @blue.method
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
      effect.SetParameter__UInt32("Resolution", environmentMapResolution);
      effect.SetParameter__Vector2("Jitter", jitter);
      effect.SetParameter("EnvironmentG", environmentG);
      effect.SetParameter("BlendWeight", blendWeight);
      effect.SetParameter("Random", this._environmentRandom);
      effect.SetParameter__TextureProvider("PrecomputedMieEnvironmentMap", this.mieEnvironmentMap);
      Tr2Renderer.runComputeShader(effect, environmentMapResolution / 8, environmentMapResolution / 8, 6, renderContext);
    }
  }

  /**
   * Fills the froxel fog's compute constants (cpp:808-1043): the froxel resolution and jitter; the fog's density,
   * colour and scattering directionality; the 3D fog noise's frequency and its origin offset; and the god-ray noise.
   *
   * The god-ray noise is a 2D texture laid along the sun, through a double-precision matrix kept in step with the
   * sun's direction. When the sun has turned by more than 0.001 radians, the matrix takes the smallest rotation that
   * realigns it, then shifts so the camera's position in noise space does not jump. The uploaded matrix is relative to
   * the origin, its translation wrapped by the noise period to keep float precision.
   *
   * Then the camera: the inverse view, unprojection and previous-projection parameters, and the reprojection from
   * this frame's view space into last frame's across the origin shift. Then the sun, the planets, the cascaded
   * shadow matrices composed into the 8x2 shadow atlas when a cascaded shadow map is given, and up to 16 volumetric
   * dynamic lights from the light manager.
   *
   * Carbon (row-vector) compositions are written in gl-matrix order: `A * B` becomes `multiply(out, B, A)`, and
   * Matrix4dMultiply( r, m0, m1 ) is m0 * m1 (TriMath.cpp:825-835). Matrices are logical; the record transposes them.
   * The cascade matrices are kept logical by Tr2ShadowMap, where Carbon stores them transposed and transposes back.
   *
   * Adapted: Carbon's GetLightData( index ) returns one light's PerLightData; this copies the light's 12 words from
   * the light manager's packed buffer, whose index is the record index.
   * @param {RawData} data The FogPerObjectData record.
   * @param {Tr2ShadowMap|null} cascadedShadowMap The scene's cascades, or null for no shadows.
   */
  @meta.adapted
  _UpdatePerObjectData(data, view, projection, viewLast, projectionLast, origin, originShift, sunDirection, sunColor,
    width, height, depth, jitter, cascadedShadowMap)
  {
    const { vec3_0, vec4_0, vec4_1, mat4_0, mat4_1, mat4_2, mat4_3, mat4d_0, mat4d_1, mat4d_2, mat4d_3, vec4d_0, vec4d_1 } =
      Tr2VolumetricsRenderer.scratch;

    const maxDistance = this.gameBackClip;
    const maxDistanceVisibility = Math.exp(-this.thickness);
    const baseDensity = this.thickness / maxDistance;
    const environmentIntensity = this.environmentIntensity;
    const fogColor = this.fogColor;

    // G is negative when light scatters onwards in the direction it was going. Exactly 0 and 1 break the shader's
    // maths, so the exposed positive value is clamped to a slightly smaller range, then negated.
    const lightG = -Math.min(Math.max(this.lightDirectionality, 0.001), 0.999);

    const inverseView = mat4.invert(mat4_0, view);
    const inverseProjection = mat4.invert(mat4_1, projection);

    data.Set("ResolutionX", width);
    data.Set("ResolutionY", height);
    data.Set("ResolutionZ", depth);

    data.Set("Jitter", jitter);
    data.Set("Far", maxDistance);

    data.Set("Scattering", vec3.set(vec3_0, fogColor[0], fogColor[1], fogColor[2]));
    data.Set("BaseDensity", baseDensity);

    data.Set("MaxDistanceVisibility", maxDistanceVisibility);
    data.Set("LightG", lightG);
    data.Set("EnvironmentIntensity", environmentIntensity);

    {
      const exactFrequency = Math.pow(2, -this.fogNoiseFrequency);
      const baseFrequency = Math.pow(2, Math.floor(-this.fogNoiseFrequency));
      const nextFrequency = baseFrequency * 2;

      let offsetX = origin[0] * baseFrequency;
      let offsetY = origin[1] * baseFrequency;
      let offsetZ = origin[2] * baseFrequency;
      offsetX -= Math.floor(offsetX);
      offsetY -= Math.floor(offsetY);
      offsetZ -= Math.floor(offsetZ);

      data.Set("FogNoiseOffset", vec3.set(vec3_0, offsetX, offsetY, offsetZ));
      data.Set("FogNoiseFrequency", baseFrequency);
      data.Set("FogNoiseLerp", (exactFrequency - baseFrequency) / (nextFrequency - baseFrequency));
      data.Set("FogNoiseIntensity", this.fogNoiseIntensity);
    }

    {
      const godRayNoiseMatrix = this._godRayNoiseMatrix;
      const noiseDirection = vec3.normalize(vec3_0, vec3.set(vec3_0, godRayNoiseMatrix[2], godRayNoiseMatrix[6], godRayNoiseMatrix[10]));
      // Clamped: rounding can take the dot product outside acos's domain.
      const angle = Math.acos(Math.min(Math.max(vec3.dot(sunDirection, noiseDirection), -1), 1));
      if (angle > 0.001)
      {
        const axis = vec3.normalize(vec3_0, vec3.cross(vec3_0, sunDirection, noiseDirection));
        const rotationMatrix = Tr2VolumetricsRenderer._RotationMatrix(mat4d_0, axis, angle);
        // Carbon Matrix4dMultiply( newMatrix, rotationMatrix, m_godRayNoiseMatrix ): the rotation first.
        const newMatrix = mat4.multiply(mat4d_1, godRayNoiseMatrix, rotationMatrix);

        // Where the camera was in noise space, and where it is now; the difference cancels the rotation's motion.
        vec4.set(vec4d_0, origin[0] + inverseView[12], origin[1] + inverseView[13], origin[2] + inverseView[14], 1);
        const previousNoiseCoords = vec4.transformMat4(vec4d_1, vec4d_0, godRayNoiseMatrix);
        const noiseCoords = vec4.transformMat4(vec4d_0, vec4d_0, newMatrix);
        newMatrix[12] += previousNoiseCoords[0] - noiseCoords[0];
        newMatrix[13] += previousNoiseCoords[1] - noiseCoords[1];
        newMatrix[14] += previousNoiseCoords[2] - noiseCoords[2];

        mat4.copy(godRayNoiseMatrix, newMatrix);
      }

      // The shader works relative to the origin, so the origin goes into the noise matrix's translation.
      const originTranslation = mat4.identity(mat4d_2);
      originTranslation[12] = origin[0];
      originTranslation[13] = origin[1];
      originTranslation[14] = origin[2];
      // Carbon Matrix4dMultiply( relativeNoiseMatrix, originTranslation, m_godRayNoiseMatrix ).
      const relativeNoiseMatrix = mat4.multiply(mat4d_3, godRayNoiseMatrix, originTranslation);

      // Wrap the translation by the noise period, so the float matrix keeps its precision.
      const baseFrequency = Math.pow(2, Math.floor(-this.godRayNoiseFrequency));
      const previousFrequency = baseFrequency * 2;
      relativeNoiseMatrix[12] %= 1 / baseFrequency;
      relativeNoiseMatrix[13] %= 1 / baseFrequency;
      relativeNoiseMatrix[14] %= 1 / baseFrequency;

      data.SetAndTranspose("GodRayNoiseMatrix", relativeNoiseMatrix);

      data.Set("GodRayNoiseFrequency", baseFrequency);
      data.Set("GodRayNoiseLerp", (Math.pow(2, -this.godRayNoiseFrequency) - baseFrequency) / (previousFrequency - baseFrequency));
      data.Set("GodRayNoiseIntensity", this.godRayNoiseIntensity);
      data.Set("GodRayNoiseAnimation", this._godRayNoiseAnimation);
    }

    data.SetAndTranspose("InverseViewMatrix", inverseView);

    {
      // Flipped Y. No w divide: it cancels when x and y are divided by -z.
      const topLeft = vec4.transformMat4(vec4_0, vec4.set(vec4_0, -1, +1, 0, 1), inverseProjection);
      const botRight = vec4.transformMat4(vec4_1, vec4.set(vec4_1, +1, -1, 0, 1), inverseProjection);

      // Both share a depth, so either z serves.
      const invZ = 1 / -topLeft[2];

      const addX = topLeft[0] * invZ;
      const addY = topLeft[1] * invZ;
      const mulX = botRight[0] * invZ - addX;
      const mulY = botRight[1] * invZ - addY;

      data.Set("UnprojectParams", vec4.set(vec4_0, mulX, mulY, addX, addY));
    }

    {
      // Flipped Y; view-space z of -1 makes w 1, so no w divide.
      const offset = vec4.transformMat4(vec4_0, vec4.set(vec4_0, +1, -1, -1, 1), projectionLast);
      data.Set("PreviousProjectParams", vec4.set(vec4_0, offset[0] * 0.5, offset[1] * 0.5, 0.5, 0.5));
    }

    // Carbon inverseView * originShiftMatrix * viewLast.
    const originShiftMatrix = mat4.fromTranslation(mat4_3, vec3.set(vec3_0, -originShift[0], -originShift[1], -originShift[2]));
    const reprojectionMatrix = mat4.multiply(mat4_2, originShiftMatrix, inverseView);
    mat4.multiply(reprojectionMatrix, viewLast, reprojectionMatrix);
    data.SetAndTranspose("ReprojectionMatrix", reprojectionMatrix);

    // Carbon Vector4( -sunDirection, 0 ) * view.
    const tempSunDir = vec4.transformMat4(vec4_0, vec4.set(vec4_0, -sunDirection[0], -sunDirection[1], -sunDirection[2], 0), view);
    data.Set("SunViewDirection", vec3.set(vec3_0, tempSunDir[0], tempSunDir[1], tempSunDir[2]));
    data.Set("SunAngle", this._sunAngle);
    data.Set("SunWorldDirection", vec3.set(vec3_0, -sunDirection[0], -sunDirection[1], -sunDirection[2]));

    data.Set("SunColor", vec3.set(vec3_0, sunColor[0], sunColor[1], sunColor[2]));

    data.SetIndex("planets", 0, this._planets[0]);
    data.SetIndex("planets", 1, this._planets[1]);

    if (cascadedShadowMap !== null)
    {
      const split = cascadedShadowMap.perSplitData;
      for (let index = 0; index < 4; index++) data.SetIndex("ShadowMapValues", index, split.ShadowMapValues[index]);

      const cellsX = 8;
      const cellsY = 2;
      for (let index = 0; index < CjsTr2VolumetricsRendererLayout.SHADOW_FRUSTUM_COUNT; index++)
      {
        // Carbon inverseView * Transpose( ShadowMatrixVal ); ours is already logical.
        const matrix = mat4.multiply(mat4_2, split.ShadowMatrixVal[index], inverseView);

        // Flip y and change the range from (-1, +1) to (0, 1).
        mat4.multiply(matrix, SHADOW_CLIP_TO_UV, matrix);

        // Carbon ScalingMatrix( 1 / cells_x, 1 / cells_y, 1 ) * TranslationMatrix( x / cells_x, y / cells_y, 0 ).
        const x = index % cellsX;
        const y = Math.floor(index / cellsX);
        const cell = mat4.fromTranslation(mat4_3, vec3.set(vec3_0, x / cellsX, y / cellsY, 0));
        mat4.scale(cell, cell, vec3.set(vec3_0, 1 / cellsX, 1 / cellsY, 1));
        mat4.multiply(matrix, cell, matrix);

        data.SetAndTransposeIndex("ShadowMatrix", index, matrix);
      }
      data.Set("SplitInfo", split.SplitInfo);
    }

    const lightManager = Tr2LightManager.getInstance();
    if (lightManager)
    {
      const volumetricLights = lightManager.GetVolumetricLights();
      if (volumetricLights.length > MAX_FOG_DYNAMIC_LIGHTS)
      {
        throw new RangeError("LightManager does not meet expectation of VolumetricsRenderer!");
      }

      const atlasSettings = lightManager.GetShadowMapAtlasSettings();
      data.Set("NumDynamicLights", volumetricLights.length);
      data.Set("InverseShadowMapAtlasSize", atlasSettings.actualTextureSize > 0 ? 1 / atlasSettings.actualTextureSize : 0);
      data.Set("ShadowMapAtlasEntryMinSizeLog2", atlasSettings.entryMinSizeLog2);

      // Same-type set copies bytes, so the packed bit fields arrive intact.
      const packed = lightManager.GetLightBufferData();
      for (let index = 0; index < volumetricLights.length; index++)
      {
        const lightIndex = volumetricLights[index];
        FOG_LIGHTS.set(packed.subarray(lightIndex * PER_LIGHT_DATA_LANES, (lightIndex + 1) * PER_LIGHT_DATA_LANES), index * PER_LIGHT_DATA_LANES);
      }
      data.Set("DynamicLights", FOG_LIGHT_BITS);

      data.Set("LightProfileTextureWidth", Tr2LightManager.getLightProfileArray().GetWidth());
    }
    else
    {
      data.Set("NumDynamicLights", 0);
      data.Set("InverseShadowMapAtlasSize", 0);
      data.Set("ShadowMapAtlasEntryMinSizeLog2", 0);
    }
  }

  /**
   * Publishes the Mie environment map under the name effects sample it by.
   *
   * Carbon takes no arguments here and registers on the global store
   * (`Tr2VolumetricsRenderer.cpp`, one line). The port had grown a
   * `renderContext` parameter that existed only to reach an executor.
   */
  @blue.method
  @meta.implemented
  UpdateVariableStore()
  {
    Tr2VariableStore.globalStore().RegisterVariableInternal("EveSceneMieEnvironmentMap", TriVariableContentType.TRIVARIABLE_TEXTURE_RES, this.mieEnvironmentMap);
  }

  /**
   * Carbon shadow batches and target stack (Tr2VolumetricsRenderer.cpp:1115-1145).
   * Adapted: finally restores native stacks when a JavaScript shader draw throws.
   */
  @blue.method
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
    esm.PushRenderTarget__TextureAL(shadowMap);
    esm.PushDepthStencilBuffer__TextureAL(null);
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

  static scratch = {
    vec3_0: vec3.create(),
    vec4_0: vec4.create(),
    vec4_1: vec4.create(),
    mat4_0: mat4.create(),
    mat4_1: mat4.create(),
    mat4_2: mat4.create(),
    mat4_3: mat4.create(),
    mat4d_0: new Float64Array(16),
    mat4d_1: new Float64Array(16),
    mat4d_2: new Float64Array(16),
    mat4d_3: new Float64Array(16),
    vec4d_0: new Float64Array(4),
    vec4d_1: new Float64Array(4)
  };
  static FogViewDependentResources = Tr2VolumetricsRendererFogViewDependentResources;
  /**
   * Carbon's RotationMatrix( axis, angle ) (math/include/Matrix_inline.h:388-413), whose bytes match gl-matrix's
   * fromRotation for a usable axis. Unlike fromRotation, which returns null for a zero axis, Carbon normalizes it to
   * zero and still builds a matrix: diag( cos( angle ) ). The god-ray realignment reaches that case when the sun turns
   * exactly opposite the noise direction (angle pi), and the resulting point reflection maps the noise onto the sun.
   * @param {Float64Array} out The matrix to write.
   * @param {vec3} axis The rotation axis.
   * @param {number} angle The angle in radians.
   * @returns {Float64Array} out
   */
  static _RotationMatrix(out, axis, angle)
  {
    const length = Math.hypot(axis[0], axis[1], axis[2]);
    const x = length > 0 ? axis[0] / length : 0;
    const y = length > 0 ? axis[1] / length : 0;
    const z = length > 0 ? axis[2] / length : 0;
    const sinAngle = Math.sin(angle), cosAngle = Math.cos(angle), t = 1 - cosAngle;
    out[0] = t * x * x + cosAngle;
    out[1] = t * y * x + sinAngle * z;
    out[2] = t * z * x - sinAngle * y;
    out[3] = 0;
    out[4] = t * x * y - sinAngle * z;
    out[5] = t * y * y + cosAngle;
    out[6] = t * z * y + sinAngle * x;
    out[7] = 0;
    out[8] = t * x * z + sinAngle * y;
    out[9] = t * y * z - sinAngle * x;
    out[10] = t * z * z + cosAngle;
    out[11] = 0;
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
    return out;
  }

  /** The worker's shadow source (cpp:618-623). */
  static _shadowType = Object.freeze({ SHADOWS_DISABLED: 0, SHADOWS_CASCADED: 1, SHADOWS_RAYTRACED: 2 });

  /** The temporal volumes' initial value (cpp:692, 701). */
  static _temporalClearValue = Object.freeze([ 0, 0, 0, 1 ]);

  /** Vector3d( 0, 0, 0 ): the reflection map's origin shift (cpp:527). */
  static _zeroOrigin = new Float64Array(3); // alloc: Carbon Vector3d; no double-precision math type
}
