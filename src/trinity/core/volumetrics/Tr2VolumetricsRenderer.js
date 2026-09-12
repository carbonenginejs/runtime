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

  /**
   * Renders the froxel volume for every volumetric component in the registry.
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
  @carbon.method
  @impl.notImplemented
  @impl.reason("Carbon's froxel compute and raymarch passes (Tr2VolumetricsRenderer.cpp:152-493) have no JS counterpart.")
  RenderVolumetrics()
  {
    throw new Error("Tr2VolumetricsRenderer.RenderVolumetrics: the froxel passes are unported.");
  }

  /**
   * The neutral volumetric texture, used when nothing volumetric is in view.
   *
   * UNPORTED, AND THE BLOCKER IS THE POOL'S DESCRIPTION. Carbon borrows a 1x1
   * black texture seeded with `Tr2SubresourceData` and described by a
   * `Tr2BitmapDimensions` carrying a texture TYPE and a slice count - a 2D array
   * of four slices here, a 3D texture for fog. Our pool takes only
   * `{ width, height, format, gpuUsage }`, which can express neither, and its
   * `initialize` callback has no way to supply initial subresource bytes.
   *
   * Carbon's signature is restored (static, taking the pool) so the shape is
   * right when the pool grows a full description.
   *
   * @param {object} _gpuResourcePool The pool to borrow from.
   * @returns {object} Never; see above.
   */
  @carbon.method
  @impl.notImplemented
  @impl.reason("Tr2GpuResourcePool's description carries no texture type or slice count, and no initial subresource data, so a 2D array of four slices cannot be asked for.")
  static GetEmptyVolumetricTexture(_gpuResourcePool)
  {
    throw new Error(
      "Tr2VolumetricsRenderer.GetEmptyVolumetricTexture: needs a pool description "
      + "carrying texture type, slice count and initial data."
    );
  }

  /**
   * Renders the fog volume.
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
  @carbon.method
  @impl.notImplemented
  @impl.reason("Carbon's fog passes (Tr2VolumetricsRenderer.cpp:494-554) have no JS counterpart.")
  RenderFog()
  {
    throw new Error("Tr2VolumetricsRenderer.RenderFog: the fog passes are unported.");
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
  @carbon.method
  @impl.notImplemented
  @impl.reason("Carbon's reflection-map fog pass (Tr2VolumetricsRenderer.cpp:519-554) has no JS counterpart.")
  RenderFogIntoReflectionMap()
  {
    throw new Error("Tr2VolumetricsRenderer.RenderFogIntoReflectionMap: the fog passes are unported.");
  }

  /**
   * The neutral froxel-fog texture, used when there is no fog.
   *
   * UNPORTED, AND THE BLOCKER IS THE POOL'S DESCRIPTION. Carbon borrows a 1x1
   * black texture seeded with `Tr2SubresourceData` and described by a
   * `Tr2BitmapDimensions` carrying a texture TYPE and a slice count - a 2D array
   * of four slices here, a 3D texture for fog. Our pool takes only
   * `{ width, height, format, gpuUsage }`, which can express neither, and its
   * `initialize` callback has no way to supply initial subresource bytes.
   *
   * Carbon's signature is restored (static, taking the pool) so the shape is
   * right when the pool grows a full description.
   *
   * @param {object} _gpuResourcePool The pool to borrow from.
   * @returns {object} Never; see above.
   */
  @carbon.method
  @impl.notImplemented
  @impl.reason("Tr2GpuResourcePool's description carries no texture type or initial subresource data, so a 3D texture cannot be asked for.")
  static GetEmptyFogTexture(_gpuResourcePool)
  {
    throw new Error(
      "Tr2VolumetricsRenderer.GetEmptyFogTexture: needs a pool description "
      + "carrying texture type and initial data."
    );
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
  @carbon.method
  @impl.notImplemented
  @impl.reason("Needs the fog pass machinery, which is unported.")
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
  @carbon.method
  @impl.implemented
  UpdateVariableStore()
  {
    Tr2VariableStore.GlobalStore().RegisterVariable("EveSceneMieEnvironmentMap", this.mieEnvironmentMap);
  }

  /**
   * Renders volumetric shadows for the registry's components.
   *
   * UNPORTED. Carbon's 31-line body walks the volumetric components and issues a
   * shadow pass per one, which needs the same unported pass machinery.
   *
   * @returns {void} Never returns; see above.
   */
  @carbon.method
  @impl.notImplemented
  @impl.reason("Needs the volumetric pass machinery, which is unported.")
  RenderShadows()
  {
    throw new Error("Tr2VolumetricsRenderer.RenderShadows: the volumetric passes are unported.");
  }

  static Tr2VolumerticQuality = Tr2VolumerticQuality;
}
