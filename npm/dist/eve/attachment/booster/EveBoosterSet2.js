import { applyDecs2311 as _applyDecs2311, identity as _identity } from '../../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { CjsModel } from '@carbonenginejs/runtime-utils/model';
import { io, type, carbon, impl } from '@carbonenginejs/runtime-utils/schema';
import { EveEntity as _EveEntity } from '../../EveEntity.js';
import { EveBoosterSet2Renderable as _EveBoosterSet2Render } from './EveBoosterSet2Renderable.js';
import { EveComponentType } from '../../EveComponentTypes.js';

let _initClass, _init_transform, _init_extra_transform, _init_functionality, _init_extra_functionality, _init_hasTrail, _init_extra_hasTrail, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_lightScale, _init_extra_lightScale, _initProto, _initClass2, _init_flareLodEnabled, _init_extra_flareLodEnabled, _init_staticTrailLength, _init_extra_staticTrailLength, _init_trailsStaticOffsets, _init_extra_trailsStaticOffsets, _init_trailsStaticOffsets2, _init_extra_trailsStaticOffsets2, _init_trailsStaticOffsets3, _init_extra_trailsStaticOffsets3, _init_trailsStaticOffsets4, _init_extra_trailsStaticOffsets4, _init_trailsStaticOffsets5, _init_extra_trailsStaticOffsets5, _init_lightOffset, _init_extra_lightOffset, _init_lightFlickerAmplitude, _init_extra_lightFlickerAmplitude, _init_lightFlickerFrequency, _init_extra_lightFlickerFrequency, _init_lightRadius, _init_extra_lightRadius, _init_lightColor, _init_extra_lightColor, _init_lightWarpRadius, _init_extra_lightWarpRadius, _init_lightWarpColor, _init_extra_lightWarpColor, _init_display, _init_extra_display, _init_alwaysOnIntensity, _init_extra_alwaysOnIntensity, _init_warpGlowColor, _init_extra_warpGlowColor, _init_glowColor, _init_extra_glowColor, _init_haloColor, _init_extra_haloColor, _init_warpHaloColor, _init_extra_warpHaloColor, _init_effectFar, _init_extra_effectFar, _init_effect, _init_extra_effect, _init_instances, _init_extra_instances, _init_maxVel, _init_extra_maxVel, _init_glowScale, _init_extra_glowScale, _init_symHaloScale, _init_extra_symHaloScale, _init_haloScaleX, _init_extra_haloScaleX, _init_haloScaleY, _init_extra_haloScaleY, _init_trailsSmoothing, _init_extra_trailsSmoothing, _init_glows, _init_extra_glows, _init_maxSize, _init_extra_maxSize, _init_boosterBoundingSphereCenter, _init_extra_boosterBoundingSphereCenter, _init_boosterBoundingSphereRadius, _init_extra_boosterBoundingSphereRadius, _init_warpIntensity, _init_extra_warpIntensity, _init_physicsUpdate, _init_extra_physicsUpdate, _init_destinyUpdate, _init_extra_destinyUpdate, _init_alwaysOn, _init_extra_alwaysOn, _init_trails, _init_extra_trails, _init_items, _init_extra_items, _ClearRuntimeItems, _AddRuntimeItem;

/** Carbon's process-global booster light-noise table (EveBoosterSet2.cpp:
 * 44-46, lazily filled with rand()/RAND_MAX in the ctor path cpp:700-707). */
const LIGHT_NOISE_SIZE = 128;
const LIGHT_NOISE = new Float32Array(LIGHT_NOISE_SIZE);
let LIGHT_NOISE_INITIALIZED = false;
let _EveBoosterSet2Item;
class EveBoosterSet2Item extends CjsModel {
  static {
    ({
      e: [_init_transform, _init_extra_transform, _init_functionality, _init_extra_functionality, _init_hasTrail, _init_extra_hasTrail, _init_atlasIndex, _init_extra_atlasIndex, _init_atlasIndex2, _init_extra_atlasIndex2, _init_lightScale, _init_extra_lightScale],
      c: [_EveBoosterSet2Item, _initClass]
    } = _applyDecs2311(this, [type.define({
      className: "EveBoosterSet2Item",
      family: "eve/attachment/boosters"
    })], [[[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.mat4], 16, "transform"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.vec4], 16, "functionality"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.boolean], 16, "hasTrail"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.uint32], 16, "atlasIndex0"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.uint32], 16, "atlasIndex1"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, type, type.float32], 16, "lightScale"]], 0, void 0, CjsModel));
  }
  constructor(...args) {
    super(...args);
    _init_extra_lightScale(this);
  }
  transform = _init_transform(this, mat4.create());
  functionality = (_init_extra_transform(this), _init_functionality(this, vec4.fromValues(0, 1, 1, 1)));
  hasTrail = (_init_extra_functionality(this), _init_hasTrail(this, true));
  atlasIndex0 = (_init_extra_hasTrail(this), _init_atlasIndex(this, 0));
  atlasIndex1 = (_init_extra_atlasIndex(this), _init_atlasIndex2(this, 0));
  lightScale = (_init_extra_atlasIndex2(this), _init_lightScale(this, 1));
  static {
    _initClass();
  }
}
let _EveBoosterSet;
new class extends _identity {
  static [class EveBoosterSet2 extends _EveEntity {
    static {
      ({
        e: [_init_flareLodEnabled, _init_extra_flareLodEnabled, _init_staticTrailLength, _init_extra_staticTrailLength, _init_trailsStaticOffsets, _init_extra_trailsStaticOffsets, _init_trailsStaticOffsets2, _init_extra_trailsStaticOffsets2, _init_trailsStaticOffsets3, _init_extra_trailsStaticOffsets3, _init_trailsStaticOffsets4, _init_extra_trailsStaticOffsets4, _init_trailsStaticOffsets5, _init_extra_trailsStaticOffsets5, _init_lightOffset, _init_extra_lightOffset, _init_lightFlickerAmplitude, _init_extra_lightFlickerAmplitude, _init_lightFlickerFrequency, _init_extra_lightFlickerFrequency, _init_lightRadius, _init_extra_lightRadius, _init_lightColor, _init_extra_lightColor, _init_lightWarpRadius, _init_extra_lightWarpRadius, _init_lightWarpColor, _init_extra_lightWarpColor, _init_display, _init_extra_display, _init_alwaysOnIntensity, _init_extra_alwaysOnIntensity, _init_warpGlowColor, _init_extra_warpGlowColor, _init_glowColor, _init_extra_glowColor, _init_haloColor, _init_extra_haloColor, _init_warpHaloColor, _init_extra_warpHaloColor, _init_effectFar, _init_extra_effectFar, _init_effect, _init_extra_effect, _init_instances, _init_extra_instances, _init_maxVel, _init_extra_maxVel, _init_glowScale, _init_extra_glowScale, _init_symHaloScale, _init_extra_symHaloScale, _init_haloScaleX, _init_extra_haloScaleX, _init_haloScaleY, _init_extra_haloScaleY, _init_trailsSmoothing, _init_extra_trailsSmoothing, _init_glows, _init_extra_glows, _init_maxSize, _init_extra_maxSize, _init_boosterBoundingSphereCenter, _init_extra_boosterBoundingSphereCenter, _init_boosterBoundingSphereRadius, _init_extra_boosterBoundingSphereRadius, _init_warpIntensity, _init_extra_warpIntensity, _init_physicsUpdate, _init_extra_physicsUpdate, _init_destinyUpdate, _init_extra_destinyUpdate, _init_alwaysOn, _init_extra_alwaysOn, _init_trails, _init_extra_trails, _init_items, _init_extra_items, _initProto],
        c: [_EveBoosterSet, _initClass2]
      } = _applyDecs2311(this, [type.define({
        className: "EveBoosterSet2",
        family: "eve/attachment/boosters"
      })], [[[io, io.notify, io, io.readwrite, type, type.boolean], 16, "flareLodEnabled"], [[void 0, io.flag("staticTrailOffsets"), io, io.notify, io, io.persist, type, type.float32], 16, "staticTrailLength"], [[io, io.persist, type, type.vec3], 16, "trailsStaticOffsets0"], [[io, io.persist, type, type.vec3], 16, "trailsStaticOffsets1"], [[io, io.persist, type, type.vec3], 16, "trailsStaticOffsets2"], [[io, io.persist, type, type.vec3], 16, "trailsStaticOffsets3"], [[io, io.persist, type, type.vec3], 16, "trailsStaticOffsets4"], [[io, io.persist, type, type.float32], 16, "lightOffset"], [[io, io.persist, type, type.float32], 16, "lightFlickerAmplitude"], [[io, io.persist, type, type.float32], 16, "lightFlickerFrequency"], [[io, io.persist, type, type.float32], 16, "lightRadius"], [[io, io.persist, type, type.color], 16, "lightColor"], [[io, io.persist, type, type.float32], 16, "lightWarpRadius"], [[io, io.persist, type, type.color], 16, "lightWarpColor"], [[io, io.persist, type, type.boolean], 16, "display"], [[io, io.persist, type, type.float32], 16, "alwaysOnIntensity"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.color], 16, "warpGlowColor"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.color], 16, "glowColor"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.color], 16, "haloColor"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.color], 16, "warpHaloColor"], [[io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effectFar"], [[void 0, io.rebuild("packedGeometry"), io, io.persist, void 0, type.objectRef("Tr2Effect")], 16, "effect"], [[io, io.read, void 0, type.list("EveBoosterSet2Renderable")], 16, "instances"], [[io, io.readwrite, type, type.float32], 16, "maxVel"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.float32], 16, "glowScale"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.float32], 16, "symHaloScale"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.float32], 16, "haloScaleX"], [[void 0, io.flag("flares"), io, io.notify, io, io.persist, type, type.float32], 16, "haloScaleY"], [[io, io.persist, type, type.float32], 16, "trailsSmoothing"], [[io, io.persist, void 0, type.objectRef("EveSpriteSet")], 16, "glows"], [[io, io.read, type, type.float32], 16, "maxSize"], [[io, io.read, type, type.vec3], 16, "boosterBoundingSphereCenter"], [[io, io.read, type, type.float32], 16, "boosterBoundingSphereRadius"], [[io, io.readwrite, type, type.float32], 16, "warpIntensity"], [[io, io.persist, type, type.boolean], 16, "physicsUpdate"], [[io, io.persist, type, type.boolean], 16, "destinyUpdate"], [[io, io.persist, type, type.boolean], 16, "alwaysOn"], [[io, io.persist, void 0, type.objectRef("EveTrailsSet")], 16, "trails"], [[void 0, io.flag("items"), void 0, io.rebuild("packedGeometry"), io, io.notify, io, io.persist, void 0, type.list("EveBoosterSet2Item")], 16, "items"], [[carbon, carbon.method, impl, impl.adapted], 18, "Initialize"], [[carbon, carbon.method, impl, impl.adapted], 18, "OnModified"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetCount"], [[carbon, carbon.method, impl, impl.adapted], 18, "Update"], [[carbon, carbon.method, impl, impl.adapted], 18, "UpdateTrails"], [[carbon, carbon.method, impl, impl.adapted], 18, "Clear"], [[carbon, carbon.method, impl, impl.adapted], 18, "Add"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetData"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetLightData"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetEffect"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetGlow"], [[carbon, carbon.method, impl, impl.implemented], 18, "SetTrail"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoosterIntensity"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoundingSphere"], [[carbon, carbon.method, impl, impl.adapted], 18, "GetBoosterData"], [[carbon, carbon.method, impl, impl.implemented], 18, "GetRevision"], [[carbon, carbon.method, impl, impl.implemented], 18, "RegisterComponents"], [[carbon, carbon.method, impl, impl.adapted, void 0, impl.reason("Tr2Renderer::GetAnimationTime relocates onto the light-manager duck (GetAnimationTime, default 0); the g_lightNoise table is module state filled with Math.random (Carbon fills it with rand()/RAND_MAX - random either way).")], 18, "GetLights"]], 0, void 0, _EveEntity));
      _ClearRuntimeItems = function (owner) {
        owner.#singleBoosters.length = 0;
        owner.glows?.Clear?.();
        owner.trails?.Clear?.();
        vec3.set(owner.boosterBoundingSphereCenter, 0, 0, 0);
        owner.boosterBoundingSphereRadius = 0;
        owner.maxSize = 0;
      };
      _AddRuntimeItem = function (owner, item) {
        const transform = mat4.clone(item.transform);
        const scale = Math.max(Math.hypot(transform[0], transform[1], transform[2]), Math.hypot(transform[4], transform[5], transform[6]));
        const lightPosition = vec3.transformMat4(vec3.create(), [0, 0, -owner.lightOffset], transform);
        const booster = {
          transform,
          functionality: vec4.clone(item.functionality),
          lightPosition,
          lightRadius: scale * item.lightScale,
          lightPhase: 128 * Math.random(),
          atlasIndex0: item.atlasIndex0,
          atlasIndex1: item.atlasIndex1,
          hasTrail: item.hasTrail
        };
        owner.#singleBoosters.push(booster);
        if (owner.glows) {
          _EveBoosterSet.#CreateFlares(owner, booster);
        }
        if (owner.trails && item.hasTrail) {
          const trailTransform = mat4.clone(transform);
          trailTransform[12] -= trailTransform[8] * 0.5;
          trailTransform[13] -= trailTransform[9] * 0.5;
          trailTransform[14] -= trailTransform[10] * 0.5;
          owner.trails.Add?.(trailTransform, scale);
        }
        _EveBoosterSet.#UpdateBoundingSphere(owner, transform.subarray(12, 15));
        owner.maxSize = Math.max(owner.maxSize, scale);
      };
    }
    /** m_flareLodEnabled (bool) [READWRITE, NOTIFY] */
    flareLodEnabled = (_initProto(this), _init_flareLodEnabled(this, true));

    /** m_staticTrailLength (float) [READWRITE, PERSIST, NOTIFY] */
    staticTrailLength = (_init_extra_flareLodEnabled(this), _init_staticTrailLength(this, 0));

    /** m_trailsStaticOffsets[0] (Vector3) [READWRITE, PERSIST] */
    trailsStaticOffsets0 = (_init_extra_staticTrailLength(this), _init_trailsStaticOffsets(this, vec3.create()));

    /** m_trailsStaticOffsets[1] (Vector3) [READWRITE, PERSIST] */
    trailsStaticOffsets1 = (_init_extra_trailsStaticOffsets(this), _init_trailsStaticOffsets2(this, vec3.create()));

    /** m_trailsStaticOffsets[2] (Vector3) [READWRITE, PERSIST] */
    trailsStaticOffsets2 = (_init_extra_trailsStaticOffsets2(this), _init_trailsStaticOffsets3(this, vec3.create()));

    /** m_trailsStaticOffsets[3] (Vector3) [READWRITE, PERSIST] */
    trailsStaticOffsets3 = (_init_extra_trailsStaticOffsets3(this), _init_trailsStaticOffsets4(this, vec3.create()));

    /** m_trailsStaticOffsets[4] (Vector3) [READWRITE, PERSIST] */
    trailsStaticOffsets4 = (_init_extra_trailsStaticOffsets4(this), _init_trailsStaticOffsets5(this, vec3.create()));

    /** m_lightOffset (float) [READWRITE, PERSIST] */
    lightOffset = (_init_extra_trailsStaticOffsets5(this), _init_lightOffset(this, 0));

    /** m_lightFlickerAmplitude (float) [READWRITE, PERSIST] */
    lightFlickerAmplitude = (_init_extra_lightOffset(this), _init_lightFlickerAmplitude(this, 0));

    /** m_lightFlickerFrequency (float) [READWRITE, PERSIST] */
    lightFlickerFrequency = (_init_extra_lightFlickerAmplitude(this), _init_lightFlickerFrequency(this, 0));

    /** m_lightRadius (float) [READWRITE, PERSIST] */
    lightRadius = (_init_extra_lightFlickerFrequency(this), _init_lightRadius(this, 0));

    /** m_lightColor (Color) [READWRITE, PERSIST] */
    lightColor = (_init_extra_lightRadius(this), _init_lightColor(this, vec4.create()));

    /** m_lightWarpRadius (float) [READWRITE, PERSIST] */
    lightWarpRadius = (_init_extra_lightColor(this), _init_lightWarpRadius(this, 0));

    /** m_lightWarpColor (Color) [READWRITE, PERSIST] */
    lightWarpColor = (_init_extra_lightWarpRadius(this), _init_lightWarpColor(this, vec4.create()));

    /** m_display (bool) [READWRITE, PERSIST] */
    display = (_init_extra_lightWarpColor(this), _init_display(this, true));

    /** m_alwaysOnIntensity (float) [READWRITE, PERSIST] */
    alwaysOnIntensity = (_init_extra_display(this), _init_alwaysOnIntensity(this, 1));

    /** m_warpGlowColor (Color) [READWRITE, PERSIST, NOTIFY] */
    warpGlowColor = (_init_extra_alwaysOnIntensity(this), _init_warpGlowColor(this, vec4.create()));

    /** m_glowColor (Color) [READWRITE, PERSIST, NOTIFY] */
    glowColor = (_init_extra_warpGlowColor(this), _init_glowColor(this, vec4.create()));

    /** m_haloColor (Color) [READWRITE, PERSIST, NOTIFY] */
    haloColor = (_init_extra_glowColor(this), _init_haloColor(this, vec4.create()));

    /** m_warpHaloColor (Color) [READWRITE, PERSIST, NOTIFY] */
    warpHaloColor = (_init_extra_haloColor(this), _init_warpHaloColor(this, vec4.create()));

    /** m_effectFar (Tr2EffectPtr) [READWRITE, PERSIST] */
    effectFar = (_init_extra_warpHaloColor(this), _init_effectFar(this, null));

    /** m_effect (Tr2EffectPtr) [READWRITE, PERSIST] */
    effect = (_init_extra_effectFar(this), _init_effect(this, null));

    /** m_boosterRenderables (PEveBoosterSet2RenderableVector) [READ] */
    instances = (_init_extra_effect(this), _init_instances(this, []));

    /** m_maxVel (float) [READWRITE] */
    maxVel = (_init_extra_instances(this), _init_maxVel(this, 250));

    /** m_glowScale (float) [READWRITE, PERSIST, NOTIFY] */
    glowScale = (_init_extra_maxVel(this), _init_glowScale(this, 1));

    /** m_symHaloScale (float) [READWRITE, PERSIST, NOTIFY] */
    symHaloScale = (_init_extra_glowScale(this), _init_symHaloScale(this, 1));

    /** m_haloScaleX (float) [READWRITE, PERSIST, NOTIFY] */
    haloScaleX = (_init_extra_symHaloScale(this), _init_haloScaleX(this, 1));

    /** m_haloScaleY (float) [READWRITE, PERSIST, NOTIFY] */
    haloScaleY = (_init_extra_haloScaleX(this), _init_haloScaleY(this, 1));

    /** m_trailsSmoothing (float) [READWRITE, PERSIST] */
    trailsSmoothing = (_init_extra_haloScaleY(this), _init_trailsSmoothing(this, 10));

    /** m_glows (EveSpriteSetPtr) [READWRITE, PERSIST] */
    glows = (_init_extra_trailsSmoothing(this), _init_glows(this, null));

    /** m_maxSize (float) [READ] */
    maxSize = (_init_extra_glows(this), _init_maxSize(this, 0));

    /** m_boosterBoundingSphere.xyz (Vector4) [READ] */
    boosterBoundingSphereCenter = (_init_extra_maxSize(this), _init_boosterBoundingSphereCenter(this, vec3.create()));

    /** m_boosterBoundingSphere.w (float) [READ] */
    boosterBoundingSphereRadius = (_init_extra_boosterBoundingSphereCenter(this), _init_boosterBoundingSphereRadius(this, 0));

    /** m_warpIntensity (float) [READWRITE] */
    warpIntensity = (_init_extra_boosterBoundingSphereRadius(this), _init_warpIntensity(this, 0));

    /** m_physicsUpdate (bool) [READWRITE, PERSIST] */
    physicsUpdate = (_init_extra_warpIntensity(this), _init_physicsUpdate(this, true));

    /** m_destinyUpdate (bool) [READWRITE, PERSIST] */
    destinyUpdate = (_init_extra_physicsUpdate(this), _init_destinyUpdate(this, true));

    /** m_alwaysOn (bool) [READWRITE, PERSIST] */
    alwaysOn = (_init_extra_destinyUpdate(this), _init_alwaysOn(this, false));

    /** m_trails (EveTrailsSetPtr) [READWRITE, PERSIST] */
    trails = (_init_extra_alwaysOn(this), _init_trails(this, null));
    items = (_init_extra_trails(this), _init_items(this, []));
    #singleBoosters = (_init_extra_items(this), []);
    #revision = 0;
    Initialize() {
      _EveBoosterSet.#RebuildItems(this);
      for (const renderable of this.instances) {
        renderable?.SetBoosterSet?.(this);
      }
      this.#revision++;
      return true;
    }
    OnModified(_options = {}) {
      const flags = this.__state.flags;
      if (flags.has("items")) {
        _EveBoosterSet.#RebuildItems(this);
      }
      if (flags.has("staticTrailOffsets")) {
        _EveBoosterSet.#UpdateStaticTrailOffsets(this);
      }
      if (flags.delete("flares") && this.glows) {
        this.glows.Clear?.();
        for (const booster of this.#singleBoosters) {
          _EveBoosterSet.#CreateFlares(this, booster);
        }
        this.glows.Rebuild?.();
      }
      this.#revision++;
      return true;
    }
    SetCount(count) {
      const requested = Math.trunc(Number(count));
      const target = Number.isFinite(requested) ? Math.max(1, requested) : 1;
      if (this.instances.length > target) {
        this.instances.length = target;
      }
      while (this.instances.length < target) {
        const renderable = new _EveBoosterSet2Render();
        renderable.SetBoosterSet(this);
        this.instances.push(renderable);
      }
      for (const renderable of this.instances) {
        renderable?.SetBoosterSet?.(this);
      }
      this.#revision++;
      return this.instances.length;
    }
    Update(deltaTime, time, parentMatrix = mat4.create(), parentSpeed = 0, parentAcceleration = _EveBoosterSet.#zero, parentRotation = _EveBoosterSet.#identityRotation, boosterInstance = 0) {
      if (!this.instances.length) {
        this.SetCount(1);
      }
      const index = Number(boosterInstance) >>> 0;
      if (index >= this.instances.length) {
        return false;
      }
      this.instances[index]?.Update?.(deltaTime, time, parentMatrix, parentSpeed, parentAcceleration, parentRotation);
      return true;
    }
    UpdateTrails(deltaTime, time) {
      if (!this.trails) {
        return false;
      }
      let updated = false;
      for (const renderable of this.instances) {
        updated = renderable?.UpdateTrails?.(deltaTime, time) || updated;
      }
      this.trails.Update?.(time);
      return updated;
    }
    Clear() {
      this.items.length = 0;
      _EveBoosterSet.#ClearRuntimeItems(this);
      this.#revision++;
    }
    Add(localMatrix, functionality, hasTrail, atlasIndex0, atlasIndex1, lightScale = 1) {
      if (!localMatrix || localMatrix.length !== 16) {
        throw new TypeError("EveBoosterSet2 transforms must contain 16 values");
      }
      const item = new _EveBoosterSet2Item();
      mat4.copy(item.transform, localMatrix);
      vec4.copy(item.functionality, functionality ?? _EveBoosterSet.#defaultFunctionality);
      item.hasTrail = !!hasTrail;
      item.atlasIndex0 = Number(atlasIndex0) >>> 0;
      item.atlasIndex1 = Number(atlasIndex1) >>> 0;
      item.lightScale = Number(lightScale) || 0;
      this.items.push(item);
      _EveBoosterSet.#AddRuntimeItem(this, item);
      this.#revision++;
      return this.items.length - 1;
    }
    SetData(glowScale, glowColor, warpGlowColor, symHaloScale, haloScaleX, haloScaleY, haloColor, warpHaloColor, alwaysOn) {
      this.glowScale = Number(glowScale);
      vec4.copy(this.glowColor, glowColor);
      vec4.copy(this.warpGlowColor, warpGlowColor);
      this.symHaloScale = Number(symHaloScale);
      this.haloScaleX = Number(haloScaleX);
      this.haloScaleY = Number(haloScaleY);
      vec4.copy(this.haloColor, haloColor);
      vec4.copy(this.warpHaloColor, warpHaloColor);
      this.alwaysOn = !!alwaysOn;
    }
    SetLightData(offset, flickerAmplitude, flickerFrequency, radius, color, warpRadius, warpColor) {
      this.lightOffset = Number(offset);
      this.lightFlickerAmplitude = Number(flickerAmplitude);
      this.lightFlickerFrequency = Number(flickerFrequency);
      this.lightRadius = Number(radius);
      vec4.copy(this.lightColor, color);
      this.lightWarpRadius = Number(warpRadius);
      vec4.copy(this.lightWarpColor, warpColor);
    }
    SetEffect(effect, effectFar) {
      this.effect = effect ?? null;
      this.effectFar = effectFar ?? null;
    }
    SetGlow(glow) {
      this.glows = glow ?? null;
    }
    SetTrail(trail) {
      this.trails = trail ?? null;
    }
    GetBoosterIntensity(index = null) {
      if (index !== null && index !== undefined) {
        return this.instances[Number(index) >>> 0]?.GetIntensity?.() ?? 0;
      }
      if (!this.instances.length) {
        return 0;
      }
      let intensity = 0;
      for (const renderable of this.instances) {
        intensity += renderable?.GetIntensity?.() ?? 0;
      }
      return intensity / this.instances.length;
    }
    GetBoundingSphere() {
      const result = vec4.create();
      for (const renderable of this.instances) {
        _EveBoosterSet.#MergeSphere(result, renderable?.GetBoundingSphere?.());
      }
      return result;
    }
    GetBoosterData() {
      return this.#singleBoosters.map(booster => ({
        transform: mat4.clone(booster.transform),
        functionality: vec4.clone(booster.functionality),
        lightPosition: vec3.clone(booster.lightPosition),
        lightRadius: booster.lightRadius,
        lightPhase: booster.lightPhase,
        atlasIndex0: booster.atlasIndex0,
        atlasIndex1: booster.atlasIndex1,
        hasTrail: booster.hasTrail
      }));
    }
    GetRevision() {
      return this.#revision;
    }

    /** Carbon EveBoosterSet2::RegisterComponents (cpp:1272-1279): unconditional
     * LightOwner leaf self-registration. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.LightOwner, this);
      }
    }

    /** Carbon EveBoosterSet2::GetLights (cpp:1287-1319): NO display gate
     * (registration is unconditional too) - the effective gates are both light
     * radii <= 0 (cpp:1289) and per-renderable overallIntensity <= 0
     * (cpp:1296). Per renderable: warp blend of radius factor and color
     * (clamped warpIntensity, cpp:1301-1304 - the COLOR blend itself is
     * unclamped 4-component lerp); per single booster: the shared 128-entry
     * random noise table drives a flicker of 1 +/- amplitude around the
     * interpolated noise (cpp:1308-1312), and AddPointLight submits the
     * booster light position under the renderable's parent transform
     * (TransformCoord - single matrix, no composition) with radius *
     * radiusFactor and color * flicker (the 3-arg overload: innerRadius 0,
     * FLAG_DEFAULT - manager-side). */
    GetLights(lightManager) {
      if (this.lightRadius <= 0 && this.lightWarpRadius <= 0) {
        return;
      }
      if (!LIGHT_NOISE_INITIALIZED) {
        LIGHT_NOISE_INITIALIZED = true;
        for (let index = 0; index < LIGHT_NOISE_SIZE; index++) {
          LIGHT_NOISE[index] = Math.random();
        }
      }
      const time = lightManager?.GetAnimationTime?.() ?? 0;
      const position = _EveBoosterSet.#lightPositionScratch;
      const color = _EveBoosterSet.#lightColorScratch;
      for (const renderable of this.instances) {
        if (!renderable || renderable.overallIntensity <= 0) {
          continue;
        }
        const warpIntensity = Math.min(Math.max(this.warpIntensity, 0), 1);
        let radiusFactor = this.lightRadius * (1 - warpIntensity) + this.lightWarpRadius * warpIntensity;
        radiusFactor *= renderable.overallIntensity;
        for (let channel = 0; channel < 4; channel++) {
          color[channel] = this.lightColor[channel] * (1 - warpIntensity) + this.lightWarpColor[channel] * warpIntensity;
        }
        const transform = renderable.GetParentTransform?.();
        if (!transform) {
          continue;
        }
        for (const booster of this.#singleBoosters) {
          const phase = (booster.lightPhase + time) * this.lightFlickerFrequency;
          const p0 = LIGHT_NOISE[Math.trunc(phase) % LIGHT_NOISE_SIZE];
          const p1 = LIGHT_NOISE[(Math.trunc(phase) + 1) % LIGHT_NOISE_SIZE];
          const t = phase - Math.floor(phase);
          const flicker = 1 + this.lightFlickerAmplitude * 2 * (p0 * (1 - t) + p1 * t) - this.lightFlickerAmplitude;
          vec3.transformMat4(position, booster.lightPosition, transform);
          lightManager?.AddPointLight?.(position, booster.lightRadius * radiusFactor, vec4.set(_EveBoosterSet.#flickerColorScratch, color[0] * flicker, color[1] * flicker, color[2] * flicker, color[3] * flicker));
        }
      }
    }
  }];
  #ClearRuntimeItems(_0) {
    return _ClearRuntimeItems.apply(this, arguments);
  }
  #RebuildItems(owner) {
    _EveBoosterSet.#ClearRuntimeItems(owner);
    for (const item of owner.items) {
      _EveBoosterSet.#AddRuntimeItem(owner, item);
    }
    owner.__state.flags.delete("items");
    owner.__state.flags.delete("flares");
  }
  #AddRuntimeItem(_0, _1) {
    return _AddRuntimeItem.apply(this, arguments);
  }
  #lightPositionScratch = vec3.create();
  #lightColorScratch = vec4.create();
  #flickerColorScratch = vec4.create();
  #CreateFlares(owner, booster) {
    const transform = booster.transform;
    const position = vec3.fromValues(transform[12], transform[13], transform[14]);
    const direction = vec3.fromValues(transform[8], transform[9], transform[10]);
    const scale = Math.max(Math.hypot(transform[0], transform[1], transform[2]), Math.hypot(transform[4], transform[5], transform[6]));
    if (vec3.squaredLength(direction)) {
      vec3.normalize(direction, direction);
    }
    if (scale < 3) {
      vec3.scale(direction, direction, scale / 3);
    }
    const seed = Math.random() * 0.7;
    _EveBoosterSet.#AddFlare(owner, position, direction, 2.5, seed, seed, scale * owner.glowScale, scale * owner.glowScale, owner.glowColor, owner.warpGlowColor);
    _EveBoosterSet.#AddFlare(owner, position, direction, 3, seed, 1 + seed, scale * owner.symHaloScale, scale * owner.symHaloScale, owner.haloColor, owner.warpHaloColor);
    _EveBoosterSet.#AddFlare(owner, position, direction, 3.01, seed, 1 + seed, scale * owner.haloScaleX, scale * owner.haloScaleY, owner.haloColor, owner.warpHaloColor);
  }
  #AddFlare(owner, position, direction, distance, blinkRate, blinkPhase, minScale, maxScale, color, warpColor) {
    const spritePosition = vec3.scaleAndAdd(vec3.create(), position, direction, -distance);
    owner.glows.Add?.(spritePosition, blinkRate, blinkPhase, minScale, maxScale, 0, color, warpColor);
  }
  #UpdateBoundingSphere(owner, position) {
    const delta = vec3.subtract(vec3.create(), position, owner.boosterBoundingSphereCenter);
    const distance = vec3.length(delta);
    const radius = owner.boosterBoundingSphereRadius;
    if (distance * distance <= radius * radius + 1e-4 || !distance) {
      return;
    }
    vec3.scaleAndAdd(owner.boosterBoundingSphereCenter, owner.boosterBoundingSphereCenter, delta, 0.5 * (1 - radius / distance));
    owner.boosterBoundingSphereRadius = 0.5 * (radius + distance);
  }
  #UpdateStaticTrailOffsets(owner) {
    owner.__state.flags.delete("staticTrailOffsets");
    const step = owner.staticTrailLength / 4;
    const offsets = [owner.trailsStaticOffsets0, owner.trailsStaticOffsets1, owner.trailsStaticOffsets2, owner.trailsStaticOffsets3, owner.trailsStaticOffsets4];
    for (let index = 0; index < offsets.length; index++) {
      vec3.set(offsets[index], 0, 0, -step * index);
    }
  }
  #MergeSphere(target, source) {
    if (!source || source.length !== 4) {
      return target;
    }
    const targetRadius = target[3];
    const sourceRadius = source[3];
    const delta = vec3.fromValues(source[0] - target[0], source[1] - target[1], source[2] - target[2]);
    const distance = vec3.length(delta);
    if (targetRadius >= distance + sourceRadius) {
      return target;
    }
    if (sourceRadius >= distance + targetRadius) {
      vec4.copy(target, source);
      return target;
    }
    if (!distance) {
      target[3] = Math.max(targetRadius, sourceRadius);
      return target;
    }
    const radius = 0.5 * (distance + targetRadius + sourceRadius);
    const factor = (radius - targetRadius) / distance;
    target[0] += delta[0] * factor;
    target[1] += delta[1] * factor;
    target[2] += delta[2] * factor;
    target[3] = radius;
    return target;
  }
  #zero = Object.freeze([0, 0, 0]);
  #identityRotation = Object.freeze([0, 0, 0, 1]);
  #defaultFunctionality = Object.freeze([0, 1, 1, 1]);
  Shape = Object.freeze({
    STAR: 0,
    BOX: 1,
    SHAPE_COUNT: 2
  });
  constructor() {
    super(_EveBoosterSet), _initClass2();
  }
}();

export { _EveBoosterSet as EveBoosterSet2, _EveBoosterSet2Item as EveBoosterSet2Item };
//# sourceMappingURL=EveBoosterSet2.js.map
