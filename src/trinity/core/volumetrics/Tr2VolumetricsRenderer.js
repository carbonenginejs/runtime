// Source: trinity/trinity/Tr2VolumetricsRenderer.h
// Source: trinity/trinity/Tr2VolumetricsRenderer.cpp
// Source: trinity/trinity/Tr2VolumetricsRenderer_Blue.cpp
import { meta } from "#schema";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureReference } from "../Tr2TextureReference.js";
import { AccumulatePriorityAttribute } from "../PriorityBlend.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";
import { Tr2Effect } from "../../shader/Tr2Effect.js";
import { Tr2Renderer } from "../Tr2Renderer.js";
import { TriRenderBatchAccumulator } from "../batch/TriRenderBatch/TriRenderBatchAccumulator.js";
import { EveComponentType } from "../../eve/EveComponentTypes.js";
import { PixelFormat, TextureType, Tr2GpuUsage } from "#consts/render-context";
import { RenderingMode } from "#consts/graphics";
import { Tr2TextureAL } from "../../../trinityal/Tr2TextureAL/Tr2TextureAL.js";
import { Tr2SubresourceData } from "../../../trinityal/Tr2HalHelperStructures/Tr2SubresourceData.js";


const FROXEL_FOG_COMPONENT = "FroxelFogSettings";
const FROXEL_NOISE_DEPTH = 64;
const FOG_COLOR_SCRATCH = vec3.create();
const EMPTY_VOLUME_TEXEL = Uint8Array.of(0, 0, 0, 0);


/**
 * Renders cloud slices and shadows, and blends scene fog settings.
 * Positive-density froxel fog and its environment-map passes remain unported.
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

  @meta.blue.readwrite
  @meta.type.boolean
  castShadows = false;

  @meta.blue.readwrite
  @meta.type.boolean
  receiveShadows = false;

  @meta.blue.readwrite
  @meta.type.float32
  scaleFactor = 0.7;

  #godRayNoiseAnimation = 0;

  #fogNoiseMovement = new Float64Array(3);

  #planets = [ vec4.fromValues(0, 0, 0, -1), vec4.fromValues(0, 0, 0, -1) ];

  #sunAngle = 0;

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

  /** Creates Carbon's logical Mie reference and reserves its texture globals. */
  constructor()
  {
    const store = Tr2VariableStore.globalStore();
    store.RegisterVariable("EveSceneFogVolumeMap", new Tr2TextureAL());
    store.RegisterVariable("VolumetricDepthMap", new Tr2TextureAL());
    store.RegisterVariable("EveSceneMieEnvironmentMap", this.mieEnvironmentMap);
    store.RegisterVariable("EveSceneFroxelFogMap", new Tr2TextureAL());
    const path = "res:/Graphics/Effect/Managed/Space/SpecialFX/Volumetric/";
    this.volumeBlit.SetEffectPathName(path + "VolumeBlit.fx");
    this.downsampleDepth.SetEffectPathName(path + "DownsampleDepth.fx");
    this.hBlur.SetOption("SOURCE_TYPE", "SOURCE_TYPE_ARRAY");
    this.hBlur.SetEffectPathName(path + "BlurVolumetric.fx");
    this.vBlur.SetOption("SOURCE_TYPE", "SOURCE_TYPE_TEXTURE");
    this.vBlur.SetEffectPathName(path + "BlurVolumetric.fx");
  }

  /**
   * Updates all fog attributes from the scene's nominal component registry.
   *
   * Calls `GetFroxelFogSettings` directly on every registered component (the
   * registry validated each as an `ITr2FroxelFogSettings` when it was added),
   * sorts the records by descending priority and blends each attribute through
   * `AccumulatePriorityAttribute`. With `logBlending`, thickness is blended in
   * log space and converted back.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Eve component registry is supplied directly; Carbon's realized 64-deep noise texture becomes its fixed animation-depth constant while physical noise storage is not ported yet.")
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

    if (this.logBlending)
    {
      const logThickness = AccumulatePriorityAttribute(settings, value => value.logThickness);
      this.thickness = Math.expm1(logThickness) / smoothness;
    }

    const delta = updateContext.GetDeltaT();
    this.#godRayNoiseAnimation += this.godRayNoiseAnimationSpeed * (delta / FROXEL_NOISE_DEPTH);
    this.#godRayNoiseAnimation -= Math.floor(this.#godRayNoiseAnimation);
    for (let lane = 0; lane < 3; lane++)
    {
      this.#fogNoiseMovement[lane] += this.fogNoiseMovementSpeed[lane] * delta;
    }
  }

  /** Reports whether the blended fog thickness is strictly positive. */
  @meta.blue.method
  @meta.implemented
  HasFog()
  {
    return this.thickness > 0;
  }

  /** Writes the inline FroxelPerFrameData fields into canonical RawData. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon writes an inline constant struct; Trinity writes the same terminal scalar/vector bytes through the canonical RawData layout.")
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
    out.SetIndex("FroxelPlanets", 0, this.#planets[0]);
    out.SetIndex("FroxelPlanets", 1, this.#planets[1]);
    return out;
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

  /** Copies the two planet spheres used by the fog shader. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Carbon asserts a two-sphere span and memcpy-copies it; JavaScript throws RangeError and copies the two vec4 records.")
  SetPlanets(planets)
  {
    if (!planets || planets.length !== 2)
    {
      throw new RangeError("Tr2VolumetricsRenderer.SetPlanets requires exactly two spheres.");
    }
    vec4.copy(this.#planets[0], planets[0]);
    vec4.copy(this.#planets[1], planets[1]);
  }

  /** Stores the sun angle consumed by later fog constant production. */
  @meta.blue.method
  @meta.implemented
  SetSunAngle(angle)
  {
    this.#sunAngle = angle;
  }

  /** Returns the wrapped 0..1 god-ray noise phase and the upload is not ported yet. */
  @meta.ours
  @meta.reason("Engines need Carbon's private CPU-produced phase without owning or recomputing its update policy.")
  GetGodRayNoiseAnimation()
  {
    return this.#godRayNoiseAnimation;
  }

  /** Copies Carbon's accumulated double-precision fog-noise movement. */
  @meta.ours
  @meta.reason("Engines consume the CPU-produced movement but do not advance it independently.")
  GetFogNoiseMovement(out)
  {
    out[0] = this.#fogNoiseMovement[0];
    out[1] = this.#fogNoiseMovement[1];
    out[2] = this.#fogNoiseMovement[2];
    return out;
  }

  /** Returns the scene-produced sun angle used by fog realization. */
  @meta.ours
  @meta.reason("Carbon stores this as private renderer state; the split needs an explicit read boundary.")
  GetSunAngle()
  {
    return this.#sunAngle;
  }

  /** Copies one of the two scene-selected planet spheres. */
  @meta.ours
  @meta.reason("Carbon's physical fog pass reads private planet state; the engine executor receives it through this checked copy boundary.")
  GetPlanet(index, out)
  {
    if (index !== 0 && index !== 1)
    {
      throw new RangeError("Tr2VolumetricsRenderer.GetPlanet index must be 0 or 1.");
    }
    return vec4.copy(out, this.#planets[index]);
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
    store.RegisterVariable("EveSceneFroxelFogMap", froxelFog);
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
        esm.PushRenderTarget(undefined, slot);
        pushedTargets++;
      }
      esm.PushDepthStencilBuffer(null);
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
        this.downsampleDepth.SetParameter("DepthSizes", [width, height, originalWidth, originalHeight]);
        this.downsampleDepth.SetParameter("DepthMap", sceneDepth);
        Tr2Renderer.drawScreenQuad(renderContext, this.downsampleDepth);
        this.downsampleDepth.SetParameter("DepthMap", null);
      }
      store.RegisterVariable("VolumetricDepthMap", volumetricDepth && volumetricDepth.IsValid() ? volumetricDepth.Get() : sceneDepth);
      for (let slot = 0; slot < 4; slot++) esm.SetRenderTarget(slot, volumeSlices.Get(), true, slot);
      for (let slot = 0; slot < 4; slot++) renderContext.Clear({ clearColor: true, clearDepth: false, color: 0, slot });
      const renderables = [];
      registry.ProcessComponents(componentType, cloud => renderables.push([cloud, cloud.GetSortValue(frustum)]));
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
        this.hBlur.SetParameter("EveSceneFogVolumeMap", volumeSlices.Get());
        this.hBlur.SetParameter("DepthSizes", [width, height, 1 / width, 0]);
        Tr2Renderer.drawScreenQuad(renderContext, this.hBlur);
        this.hBlur.SetParameter("EveSceneFogVolumeMap", null);
        esm.SetRenderTarget(0, volumeSlices.Get(), true, 3);
        this.vBlur.SetParameter("DepthSizes", [width, height, 0, 1 / height]);
        this.vBlur.SetParameter("SourceMap", blurScratch.Get());
        Tr2Renderer.drawScreenQuad(renderContext, this.vBlur);
        this.vBlur.SetParameter("SourceMap", null);
        gpuResourcePool.Free(blurScratch);
        blurScratch = null;
      }
      while (pushedTargets) esm.PopRenderTarget(--pushedTargets);
      esm.ApplyStandardStates(RenderingMode.RM_ALPHA);
      this.volumeBlit.SetParameter("DepthSizes", [width, height, originalWidth, originalHeight]);
      this.volumeBlit.SetParameter("EveSceneFogVolumeMap", volumeSlices.Get());
      Tr2Renderer.drawScreenQuad(renderContext, this.volumeBlit);
      this.volumeBlit.SetParameter("EveSceneFogVolumeMap", null);
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
      this.downsampleDepth.SetParameter("DepthMap", new Tr2TextureAL());
      this.hBlur.SetParameter("EveSceneFogVolumeMap", new Tr2TextureAL());
      this.vBlur.SetParameter("SourceMap", new Tr2TextureAL());
      this.volumeBlit.SetParameter("EveSceneFogVolumeMap", new Tr2TextureAL());
      store.RegisterVariable("VolumetricDepthMap", new Tr2TextureAL());
      if (!returned && volumeSlices) gpuResourcePool.Free(volumeSlices);
      if (volumetricDepth) gpuResourcePool.Free(volumetricDepth);
      if (blurScratch) gpuResourcePool.Free(blurScratch);
      store.RegisterVariable("EveSceneFroxelFogMap", new Tr2TextureAL());
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
   * Carbon's disabled-fog return (cpp:511-516, 611-615).
   * Positive-density froxel compute and temporal resources are still unported.
   */
  @meta.blue.method
  @meta.notImplemented
  RenderFog(_renderContext, gpuResourcePool)
  {
    if (!this.HasFog()) return Tr2VolumetricsRenderer.getEmptyFogTexture(gpuResourcePool);
    throw new Error("Tr2VolumetricsRenderer.RenderFog: positive-density fog passes are unported.");
  }

  /**
   * Renders the fog volume into a reflection map.
   *
   * UNPORTED. Carbon's body is the bulk of a 1,150-line file and drives the
   * froxel volume: it sizes the target from the scene depth and a scale factor,
   * counts `ITr2VolumetricRenderable` components off the registry, then runs the
   * compute and raymarch passes. None of that has a JS counterpart yet.
   *
   * It throws rather than returning nothing: a caller that silently got no
   * volumetric texture renders a scene with no fog and looks plausible.
   *
   * @returns {object} Never; see above.
   */
  @meta.blue.method
  @meta.notImplemented
  @meta.reason("Carbon's reflection-map fog pass (Tr2VolumetricsRenderer.cpp:519-554) has no JS counterpart.")
  RenderFogIntoReflectionMap()
  {
    throw new Error("Tr2VolumetricsRenderer.RenderFogIntoReflectionMap: the fog passes are unported.");
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
   * Rebuilds the Mie environment map.
   *
   * UNPORTED. Carbon's 86-line body renders each cube face through the fog
   * effect (`Tr2VolumetricsRenderer.cpp`), which needs the same unported pass
   * machinery as the fog methods above.
   *
   * @returns {void} Never returns; see above.
   */
  @meta.blue.method
  @meta.notImplemented
  @meta.reason("Needs the fog pass machinery, which is unported.")
  UpdateFogEnvironmentMap()
  {
    throw new Error("Tr2VolumetricsRenderer.UpdateFogEnvironmentMap: the fog passes are unported.");
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
    Tr2VariableStore.globalStore().RegisterVariable("EveSceneMieEnvironmentMap", this.mieEnvironmentMap);
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
    esm.PushRenderTarget(shadowMap);
    esm.PushDepthStencilBuffer(null);
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
}
