import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { Tr2VolumerticQuality } from '../../generated/trinityCore/enums.js';
import { Tr2TextureReference as _Tr2TextureReference } from '../../generated/trinityCore/Tr2TextureReference.js';
import { AccumulatePriorityAttribute } from '../PriorityBlend.js';
import { CjsVolumetricsExecutor } from '../context/CjsVolumetricsExecutor.js';
import { Tr2VariableStore as _Tr2VariableStore } from '../variable/Tr2VariableStore.js';

let _initProto, _initStatic, _initClass, _init_quality, _init_extra_quality, _init_mieEnvironmentMap, _init_extra_mieEnvironmentMap, _init_blur, _init_extra_blur, _init_logBlending, _init_extra_logBlending, _init_gameBackClip, _init_extra_gameBackClip, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_thickness, _init_extra_thickness, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_lightDirectionality, _init_extra_lightDirectionality, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseMovementSpeed, _init_extra_fogNoiseMovementSpeed, _init_fogColor, _init_extra_fogColor, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_logBlendingSmoothness, _init_extra_logBlendingSmoothness, _init_environmentIntensity, _init_extra_environmentIntensity, _init_castShadows, _init_extra_castShadows, _init_receiveShadows, _init_extra_receiveShadows, _init_scaleFactor, _init_extra_scaleFactor;
const FROXEL_FOG_COMPONENT = "FroxelFogSettings";
const FROXEL_NOISE_DEPTH = 64;
const FOG_COLOR_SCRATCH = vec3.create();

/**
 * Owns portable froxel-fog blending and terminal per-frame constant writes.
 * Physical fog/volumetric textures, passes and environment-map realization
 * remain explicit engine obligations.
 */
let _Tr2VolumetricsRender;
new class extends _identity {
  static [class Tr2VolumetricsRenderer extends CjsModel {
    static {
      ({
        e: [_init_quality, _init_extra_quality, _init_mieEnvironmentMap, _init_extra_mieEnvironmentMap, _init_blur, _init_extra_blur, _init_logBlending, _init_extra_logBlending, _init_gameBackClip, _init_extra_gameBackClip, _init_backgroundVisibility, _init_extra_backgroundVisibility, _init_thickness, _init_extra_thickness, _init_environmentDirectionality, _init_extra_environmentDirectionality, _init_lightDirectionality, _init_extra_lightDirectionality, _init_godRayNoiseAnimationSpeed, _init_extra_godRayNoiseAnimationSpeed, _init_fogNoiseMovementSpeed, _init_extra_fogNoiseMovementSpeed, _init_fogColor, _init_extra_fogColor, _init_godRayNoiseFrequency, _init_extra_godRayNoiseFrequency, _init_fogNoiseFrequency, _init_extra_fogNoiseFrequency, _init_godRayNoiseIntensity, _init_extra_godRayNoiseIntensity, _init_fogNoiseIntensity, _init_extra_fogNoiseIntensity, _init_logBlendingSmoothness, _init_extra_logBlendingSmoothness, _init_environmentIntensity, _init_extra_environmentIntensity, _init_castShadows, _init_extra_castShadows, _init_receiveShadows, _init_extra_receiveShadows, _init_scaleFactor, _init_extra_scaleFactor, _initProto, _initStatic],
        c: [_Tr2VolumetricsRender, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "Tr2VolumetricsRenderer",
        family: "trinityCore"
      })], [[[io, io.readwrite, type, type.int32, void 0, type.enum("Tr2VolumerticQuality")], 16, "quality"], [[io, io.read, void 0, type.objectRef("Tr2TextureReference")], 16, "mieEnvironmentMap"], [[io, io.readwrite, type, type.boolean], 16, "blur"], [[io, io.readwrite, type, type.boolean], 16, "logBlending"], [[io, io.readwrite, type, type.float32], 16, "gameBackClip"], [[io, io.read, type, type.float32], 16, "backgroundVisibility"], [[io, io.read, type, type.float32], 16, "thickness"], [[io, io.read, type, type.float32], 16, "environmentDirectionality"], [[io, io.read, type, type.float32], 16, "lightDirectionality"], [[io, io.read, type, type.float32], 16, "godRayNoiseAnimationSpeed"], [[io, io.read, type, type.vec3], 16, "fogNoiseMovementSpeed"], [[io, io.read, type, type.color], 16, "fogColor"], [[io, io.read, type, type.float32], 16, "godRayNoiseFrequency"], [[io, io.read, type, type.float32], 16, "fogNoiseFrequency"], [[io, io.read, type, type.float32], 16, "godRayNoiseIntensity"], [[io, io.read, type, type.float32], 16, "fogNoiseIntensity"], [[io, io.readwrite, type, type.float64], 16, "logBlendingSmoothness"], [[io, io.read, type, type.float32], 16, "environmentIntensity"], [[io, io.readwrite, type, type.boolean], 16, "castShadows"], [[io, io.readwrite, type, type.boolean], 16, "receiveShadows"], [[io, io.readwrite, type, type.float32], 16, "scaleFactor"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("The Eve component registry is supplied directly; Carbon's realized 64-deep noise texture becomes its fixed animation-depth constant while physical noise storage stays engine-owned.")], 18, "UpdateFogSettings"], [[carbon, carbon.method, impl, impl.implemented], 18, "HasFog"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon writes an inline constant struct; Trinity writes the same terminal scalar/vector bytes through the canonical RawData layout.")], 18, "PopulatePerFrameData"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetQuality"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon asserts a two-sphere span and memcpy-copies it; JavaScript throws RangeError and copies the two vec4 records.")], 18, "SetPlanets"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetSunAngle"], [[impl, impl.custom, void 0, impl.reason("Engines need Carbon's private CPU-produced phase without owning or recomputing its update policy.")], 18, "GetGodRayNoiseAnimation"], [[impl, impl.custom, void 0, impl.reason("Engines consume the CPU-produced movement but do not advance it independently.")], 18, "GetFogNoiseMovement"], [[impl, impl.custom, void 0, impl.reason("Carbon stores this as private renderer state; the split engine realization needs an explicit read boundary.")], 18, "GetSunAngle"], [[impl, impl.custom, void 0, impl.reason("Carbon's physical fog pass reads private planet state; the engine executor receives it through this checked copy boundary.")], 18, "GetPlanet"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Physical resource/pass realization is delegated to the nominal context executor while Trinity retains the graph identity and CPU state.")], 18, "RenderVolumetrics"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reaches a process-global backend; JavaScript receives the composed executor explicitly because the resource pool has no backend-dispatch role.")], 26, "GetEmptyVolumetricTexture"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Trinity keeps Carbon's call contract and CPU state while the context executor realizes GPU resources and passes.")], 18, "RenderFog"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Trinity preserves the portable call order; the context executor realizes physical reflection fog resources.")], 18, "RenderFogIntoReflectionMap"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon reaches a process-global backend; JavaScript receives the composed executor explicitly because the resource pool has no backend-dispatch role.")], 26, "GetEmptyFogTexture"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon updates GPU state directly; JavaScript delegates only that physical work through the active render context.")], 18, "UpdateFogEnvironmentMap"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Carbon uses a process-global render backend; JavaScript threads the active context so the installed engine publishes its own physical textures.")], 18, "UpdateVariableStore"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Trinity retains registry and renderer state; the active context's engine owns the physical shadow pass.")], 18, "RenderShadows"]], 0, void 0, CjsModel));
      _initStatic(this);
    }
    quality = (_initProto(this), _init_quality(this, Tr2VolumerticQuality.High));
    mieEnvironmentMap = (_init_extra_quality(this), _init_mieEnvironmentMap(this, new _Tr2TextureReference()));
    blur = (_init_extra_mieEnvironmentMap(this), _init_blur(this, true));
    logBlending = (_init_extra_blur(this), _init_logBlending(this, true));
    gameBackClip = (_init_extra_logBlending(this), _init_gameBackClip(this, 1e6));
    backgroundVisibility = (_init_extra_gameBackClip(this), _init_backgroundVisibility(this, 0));
    thickness = (_init_extra_backgroundVisibility(this), _init_thickness(this, 0));
    environmentDirectionality = (_init_extra_thickness(this), _init_environmentDirectionality(this, 0));
    lightDirectionality = (_init_extra_environmentDirectionality(this), _init_lightDirectionality(this, 0));
    godRayNoiseAnimationSpeed = (_init_extra_lightDirectionality(this), _init_godRayNoiseAnimationSpeed(this, 0));
    fogNoiseMovementSpeed = (_init_extra_godRayNoiseAnimationSpeed(this), _init_fogNoiseMovementSpeed(this, vec3.create()));
    fogColor = (_init_extra_fogNoiseMovementSpeed(this), _init_fogColor(this, vec4.create()));
    godRayNoiseFrequency = (_init_extra_fogColor(this), _init_godRayNoiseFrequency(this, 0));
    fogNoiseFrequency = (_init_extra_godRayNoiseFrequency(this), _init_fogNoiseFrequency(this, 0));
    godRayNoiseIntensity = (_init_extra_fogNoiseFrequency(this), _init_godRayNoiseIntensity(this, 0));
    fogNoiseIntensity = (_init_extra_godRayNoiseIntensity(this), _init_fogNoiseIntensity(this, 0));
    logBlendingSmoothness = (_init_extra_fogNoiseIntensity(this), _init_logBlendingSmoothness(this, 4));
    environmentIntensity = (_init_extra_logBlendingSmoothness(this), _init_environmentIntensity(this, 0));
    castShadows = (_init_extra_environmentIntensity(this), _init_castShadows(this, false));
    receiveShadows = (_init_extra_castShadows(this), _init_receiveShadows(this, false));
    scaleFactor = (_init_extra_receiveShadows(this), _init_scaleFactor(this, 0.7));
    #godRayNoiseAnimation = (_init_extra_scaleFactor(this), 0);
    #fogNoiseMovement = new Float64Array(3);
    #planets = [vec4.fromValues(0, 0, 0, -1), vec4.fromValues(0, 0, 0, -1)];
    #sunAngle = 0;

    /** Creates Carbon's logical Mie reference and reserves its texture globals. */
    constructor() {
      super();
      const store = _Tr2VariableStore.GlobalStore();
      store.RegisterVariable("EveSceneFogVolumeMap");
      store.RegisterVariable("VolumetricDepthMap");
      store.RegisterVariable("EveSceneMieEnvironmentMap");
      store.RegisterVariable("EveSceneFroxelFogMap");
    }

    /** Updates all fog attributes from the scene's nominal component registry. */
    UpdateFogSettings(registry, updateContext) {
      const settings = Array.from(registry.GetComponents(FROXEL_FOG_COMPONENT), component => component.GetFroxelFogSettings());
      const smoothness = this.logBlendingSmoothness;
      for (const value of settings) {
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
      if (this.logBlending) {
        const logThickness = AccumulatePriorityAttribute(settings, value => value.logThickness);
        this.thickness = Math.expm1(logThickness) / smoothness;
      }
      const delta = updateContext.GetDeltaT();
      this.#godRayNoiseAnimation += this.godRayNoiseAnimationSpeed * (delta / FROXEL_NOISE_DEPTH);
      this.#godRayNoiseAnimation -= Math.floor(this.#godRayNoiseAnimation);
      for (let lane = 0; lane < 3; lane++) {
        this.#fogNoiseMovement[lane] += this.fogNoiseMovementSpeed[lane] * delta;
      }
    }

    /** Reports whether the blended fog thickness is strictly positive. */
    HasFog() {
      return this.thickness > 0;
    }

    /** Writes the inline FroxelPerFrameData fields into canonical RawData. */
    PopulatePerFrameData(out) {
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
    SetQuality(quality) {
      this.quality = quality;
      switch (quality) {
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
    SetPlanets(planets) {
      if (!planets || planets.length !== 2) {
        throw new RangeError("Tr2VolumetricsRenderer.SetPlanets requires exactly two spheres.");
      }
      vec4.copy(this.#planets[0], planets[0]);
      vec4.copy(this.#planets[1], planets[1]);
    }

    /** Stores the sun angle consumed by later fog constant production. */
    SetSunAngle(angle) {
      this.#sunAngle = angle;
    }

    /** Returns the wrapped 0..1 god-ray noise phase for engine realization. */
    GetGodRayNoiseAnimation() {
      return this.#godRayNoiseAnimation;
    }

    /** Copies Carbon's accumulated double-precision fog-noise movement. */
    GetFogNoiseMovement(out) {
      out[0] = this.#fogNoiseMovement[0];
      out[1] = this.#fogNoiseMovement[1];
      out[2] = this.#fogNoiseMovement[2];
      return out;
    }

    /** Returns the scene-produced sun angle used by fog realization. */
    GetSunAngle() {
      return this.#sunAngle;
    }

    /** Copies one of the two scene-selected planet spheres. */
    GetPlanet(index, out) {
      if (index !== 0 && index !== 1) {
        throw new RangeError("Tr2VolumetricsRenderer.GetPlanet index must be 0 or 1.");
      }
      return vec4.copy(out, this.#planets[index]);
    }

    /** Delegates physical volumetric rendering to the context's nominal engine. */
    RenderVolumetrics(registry, frustum, sceneDepth, froxelFog, sunDirection, depthSlices, raytracingEnabled, gpuResourcePool, renderContext) {
      return renderContext.GetVolumetricsExecutor().RenderVolumetrics(this, registry, frustum, sceneDepth, froxelFog, sunDirection, depthSlices, raytracingEnabled, gpuResourcePool, renderContext);
    }

    /** Delegates empty-volumetric-texture selection to an explicit nominal engine. */
    static GetEmptyVolumetricTexture(gpuResourcePool, executor) {
      if (!(executor instanceof CjsVolumetricsExecutor)) {
        throw new TypeError("Tr2VolumetricsRenderer.GetEmptyVolumetricTexture requires a CjsVolumetricsExecutor.");
      }
      return executor.GetEmptyVolumetricTexture(gpuResourcePool);
    }

    /** Delegates primary-view froxel fog rendering to the nominal engine. */
    RenderFog(renderContext, gpuResourcePool, width, height, cascadedShadowMap, raytracingGeometry, shadowQuality, sunDirection, sunColor, origin, originShift, view, projection, viewLast, projectionLast) {
      return renderContext.GetVolumetricsExecutor().RenderFog(this, renderContext, gpuResourcePool, width, height, cascadedShadowMap, raytracingGeometry, shadowQuality, sunDirection, sunColor, origin, originShift, view, projection, viewLast, projectionLast);
    }

    /** Delegates reflection-view fog rendering to the nominal engine. */
    RenderFogIntoReflectionMap(renderContext, gpuResourcePool, width, height, sunDirection, sunColor, origin, view, projection) {
      return renderContext.GetVolumetricsExecutor().RenderFogIntoReflectionMap(this, renderContext, gpuResourcePool, width, height, sunDirection, sunColor, origin, view, projection);
    }

    /** Delegates empty-fog-texture selection to an explicit nominal engine. */
    static GetEmptyFogTexture(gpuResourcePool, executor) {
      if (!(executor instanceof CjsVolumetricsExecutor)) {
        throw new TypeError("Tr2VolumetricsRenderer.GetEmptyFogTexture requires a CjsVolumetricsExecutor.");
      }
      return executor.GetEmptyFogTexture(gpuResourcePool);
    }

    /** Delegates Mie environment-map realization to the nominal engine. */
    UpdateFogEnvironmentMap(renderContext) {
      return renderContext.GetVolumetricsExecutor().UpdateFogEnvironmentMap(this, renderContext);
    }

    /** Delegates publication of realized fog textures to the nominal engine. */
    UpdateVariableStore(renderContext) {
      return renderContext.GetVolumetricsExecutor().UpdateVariableStore(this, renderContext);
    }

    /** Delegates volumetric-shadow realization to the nominal engine. */
    RenderShadows(registry, shadowMap, renderContext) {
      return renderContext.GetVolumetricsExecutor().RenderShadows(this, registry, shadowMap, renderContext);
    }
  }];
  Tr2VolumerticQuality = Tr2VolumerticQuality;
  constructor() {
    super(_Tr2VolumetricsRender), _initClass();
  }
}();

export { _Tr2VolumetricsRender as Tr2VolumetricsRenderer };
//# sourceMappingURL=Tr2VolumetricsRenderer.js.map
