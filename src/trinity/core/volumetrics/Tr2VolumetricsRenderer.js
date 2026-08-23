// Source: trinity/trinity/Tr2VolumetricsRenderer.h
// Source: trinity/trinity/Tr2VolumetricsRenderer.cpp
// Source: trinity/trinity/Tr2VolumetricsRenderer_Blue.cpp
import { carbon, impl, io, type } from "#schema";
import { CjsModel } from "#model";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2VolumerticQuality } from "../../generated/trinityCore/enums.js";
import { Tr2TextureReference } from "../../generated/trinityCore/Tr2TextureReference.js";
import { AccumulatePriorityAttribute } from "../PriorityBlend.js";
import { CjsVolumetricsExecutor } from "../context/CjsVolumetricsExecutor.js";
import { Tr2VariableStore } from "../variable/Tr2VariableStore.js";


const FROXEL_FOG_COMPONENT = "FroxelFogSettings";
const FROXEL_NOISE_DEPTH = 64;
const FOG_COLOR_SCRATCH = vec3.create();


/**
 * Owns portable froxel-fog blending and terminal per-frame constant writes.
 * Physical fog/volumetric textures, passes and environment-map realization
 * remain explicit engine obligations.
 */
@type.define({ className: "Tr2VolumetricsRenderer", family: "trinityCore" })
export class Tr2VolumetricsRenderer extends CjsModel
{
  @io.readwrite
  @type.int32
  @type.enum("Tr2VolumerticQuality")
  quality = Tr2VolumerticQuality.High;

  @io.read
  @type.objectRef("Tr2TextureReference")
  mieEnvironmentMap = new Tr2TextureReference();

  @io.readwrite
  @type.boolean
  blur = true;

  @io.readwrite
  @type.boolean
  logBlending = true;

  @io.readwrite
  @type.float32
  gameBackClip = 1e6;

  @io.read
  @type.float32
  backgroundVisibility = 0;

  @io.read
  @type.float32
  thickness = 0;

  @io.read
  @type.float32
  environmentDirectionality = 0;

  @io.read
  @type.float32
  lightDirectionality = 0;

  @io.read
  @type.float32
  godRayNoiseAnimationSpeed = 0;

  @io.read
  @type.vec3
  fogNoiseMovementSpeed = vec3.create();

  @io.read
  @type.color
  fogColor = vec4.create();

  @io.read
  @type.float32
  godRayNoiseFrequency = 0;

  @io.read
  @type.float32
  fogNoiseFrequency = 0;

  @io.read
  @type.float32
  godRayNoiseIntensity = 0;

  @io.read
  @type.float32
  fogNoiseIntensity = 0;

  @io.readwrite
  @type.float64
  logBlendingSmoothness = 4;

  @io.read
  @type.float32
  environmentIntensity = 0;

  @io.readwrite
  @type.boolean
  castShadows = false;

  @io.readwrite
  @type.boolean
  receiveShadows = false;

  @io.readwrite
  @type.float32
  scaleFactor = 0.7;

  #godRayNoiseAnimation = 0;

  #fogNoiseMovement = new Float64Array(3);

  #planets = [ vec4.fromValues(0, 0, 0, -1), vec4.fromValues(0, 0, 0, -1) ];

  #sunAngle = 0;

  /** Creates Carbon's logical Mie reference and reserves its texture globals. */
  constructor()
  {
    super();
    const store = Tr2VariableStore.GlobalStore();
    store.RegisterVariable("EveSceneFogVolumeMap");
    store.RegisterVariable("VolumetricDepthMap");
    store.RegisterVariable("EveSceneMieEnvironmentMap");
    store.RegisterVariable("EveSceneFroxelFogMap");
  }

  /** Updates all fog attributes from the scene's nominal component registry. */
  @carbon.method
  @impl.adapted
  @impl.reason("The Eve component registry is supplied directly; Carbon's realized 64-deep noise texture becomes its fixed animation-depth constant while physical noise storage stays engine-owned.")
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
  @carbon.method
  @impl.implemented
  HasFog()
  {
    return this.thickness > 0;
  }

  /** Writes the inline FroxelPerFrameData fields into canonical RawData. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon writes an inline constant struct; Trinity writes the same terminal scalar/vector bytes through the canonical RawData layout.")
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
  @carbon.method
  @impl.implemented
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
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon asserts a two-sphere span and memcpy-copies it; JavaScript throws RangeError and copies the two vec4 records.")
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
  @carbon.method
  @impl.implemented
  SetSunAngle(angle)
  {
    this.#sunAngle = angle;
  }

  /** Returns the wrapped 0..1 god-ray noise phase for engine realization. */
  @impl.custom
  @impl.reason("Engines need Carbon's private CPU-produced phase without owning or recomputing its update policy.")
  GetGodRayNoiseAnimation()
  {
    return this.#godRayNoiseAnimation;
  }

  /** Copies Carbon's accumulated double-precision fog-noise movement. */
  @impl.custom
  @impl.reason("Engines consume the CPU-produced movement but do not advance it independently.")
  GetFogNoiseMovement(out)
  {
    out[0] = this.#fogNoiseMovement[0];
    out[1] = this.#fogNoiseMovement[1];
    out[2] = this.#fogNoiseMovement[2];
    return out;
  }

  /** Returns the scene-produced sun angle used by fog realization. */
  @impl.custom
  @impl.reason("Carbon stores this as private renderer state; the split engine realization needs an explicit read boundary.")
  GetSunAngle()
  {
    return this.#sunAngle;
  }

  /** Copies one of the two scene-selected planet spheres. */
  @impl.custom
  @impl.reason("Carbon's physical fog pass reads private planet state; the engine executor receives it through this checked copy boundary.")
  GetPlanet(index, out)
  {
    if (index !== 0 && index !== 1)
    {
      throw new RangeError("Tr2VolumetricsRenderer.GetPlanet index must be 0 or 1.");
    }
    return vec4.copy(out, this.#planets[index]);
  }

  /** Delegates physical volumetric rendering to the context's nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Physical resource/pass realization is delegated to the nominal context executor while Trinity retains the graph identity and CPU state.")
  RenderVolumetrics(
    registry,
    frustum,
    sceneDepth,
    froxelFog,
    sunDirection,
    depthSlices,
    raytracingEnabled,
    gpuResourcePool,
    renderContext
  )
  {
    return renderContext.GetVolumetricsExecutor().RenderVolumetrics(
      this,
      registry,
      frustum,
      sceneDepth,
      froxelFog,
      sunDirection,
      depthSlices,
      raytracingEnabled,
      gpuResourcePool,
      renderContext
    );
  }

  /** Delegates empty-volumetric-texture selection to an explicit nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reaches a process-global backend; JavaScript receives the composed executor explicitly because the resource pool has no backend-dispatch role.")
  static GetEmptyVolumetricTexture(gpuResourcePool, executor)
  {
    if (!(executor instanceof CjsVolumetricsExecutor))
    {
      throw new TypeError("Tr2VolumetricsRenderer.GetEmptyVolumetricTexture requires a CjsVolumetricsExecutor.");
    }
    return executor.GetEmptyVolumetricTexture(gpuResourcePool);
  }

  /** Delegates primary-view froxel fog rendering to the nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity keeps Carbon's call contract and CPU state while the context executor realizes GPU resources and passes.")
  RenderFog(
    renderContext,
    gpuResourcePool,
    width,
    height,
    cascadedShadowMap,
    raytracingGeometry,
    shadowQuality,
    sunDirection,
    sunColor,
    origin,
    originShift,
    view,
    projection,
    viewLast,
    projectionLast
  )
  {
    return renderContext.GetVolumetricsExecutor().RenderFog(
      this,
      renderContext,
      gpuResourcePool,
      width,
      height,
      cascadedShadowMap,
      raytracingGeometry,
      shadowQuality,
      sunDirection,
      sunColor,
      origin,
      originShift,
      view,
      projection,
      viewLast,
      projectionLast
    );
  }

  /** Delegates reflection-view fog rendering to the nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity preserves the portable call order; the context executor realizes physical reflection fog resources.")
  RenderFogIntoReflectionMap(
    renderContext,
    gpuResourcePool,
    width,
    height,
    sunDirection,
    sunColor,
    origin,
    view,
    projection
  )
  {
    return renderContext.GetVolumetricsExecutor().RenderFogIntoReflectionMap(
      this,
      renderContext,
      gpuResourcePool,
      width,
      height,
      sunDirection,
      sunColor,
      origin,
      view,
      projection
    );
  }

  /** Delegates empty-fog-texture selection to an explicit nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon reaches a process-global backend; JavaScript receives the composed executor explicitly because the resource pool has no backend-dispatch role.")
  static GetEmptyFogTexture(gpuResourcePool, executor)
  {
    if (!(executor instanceof CjsVolumetricsExecutor))
    {
      throw new TypeError("Tr2VolumetricsRenderer.GetEmptyFogTexture requires a CjsVolumetricsExecutor.");
    }
    return executor.GetEmptyFogTexture(gpuResourcePool);
  }

  /** Delegates Mie environment-map realization to the nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon updates GPU state directly; JavaScript delegates only that physical work through the active render context.")
  UpdateFogEnvironmentMap(renderContext)
  {
    return renderContext.GetVolumetricsExecutor().UpdateFogEnvironmentMap(this, renderContext);
  }

  /** Delegates publication of realized fog textures to the nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Carbon uses a process-global render backend; JavaScript threads the active context so the installed engine publishes its own physical textures.")
  UpdateVariableStore(renderContext)
  {
    return renderContext.GetVolumetricsExecutor().UpdateVariableStore(this, renderContext);
  }

  /** Delegates volumetric-shadow realization to the nominal engine. */
  @carbon.method
  @impl.adapted
  @impl.reason("Trinity retains registry and renderer state; the active context's engine owns the physical shadow pass.")
  RenderShadows(registry, shadowMap, renderContext)
  {
    return renderContext.GetVolumetricsExecutor().RenderShadows(this, registry, shadowMap, renderContext);
  }

  static Tr2VolumerticQuality = Tr2VolumerticQuality;
}
