import { identity as _identity, applyDecs2311 as _applyDecs2311 } from '../../_virtual/_rollupPluginBabelHelpers.js';
import { mat4 } from '@carbonenginejs/runtime-utils/mat4';
import { vec3 } from '@carbonenginejs/runtime-utils/vec3';
import { vec4 } from '@carbonenginejs/runtime-utils/vec4';
import { io, type, impl, schema } from '@carbonenginejs/runtime-utils/schema';
import { EveChildTransform as _EveChildTransform } from './EveChildTransform.js';
import { EveComponentType } from '../EveComponentTypes.js';

let _initProto, _initClass, _init_priority, _init_extra_priority, _init_name, _init_extra_name, _init_backgroundIntensity, _init_extra_backgroundIntensity, _init_intensity, _init_extra_intensity, _init_reflectionIntensity, _init_extra_reflectionIntensity, _init_sunIntensity, _init_extra_sunIntensity, _init_sunColor, _init_extra_sunColor, _init_volumes, _init_extra_volumes;

/**
 * Space-object child that overrides scene sun, background and reflection
 * lighting, its blend strength driven by how deeply the camera sits inside the
 * volumes it owns.
 */
let _EveChildLightingOver;
new class extends _identity {
  static [class EveChildLightingOverride extends _EveChildTransform {
    static {
      ({
        e: [_init_priority, _init_extra_priority, _init_name, _init_extra_name, _init_backgroundIntensity, _init_extra_backgroundIntensity, _init_intensity, _init_extra_intensity, _init_reflectionIntensity, _init_extra_reflectionIntensity, _init_sunIntensity, _init_extra_sunIntensity, _init_sunColor, _init_extra_sunColor, _init_volumes, _init_extra_volumes, _initProto],
        c: [_EveChildLightingOver, _initClass]
      } = _applyDecs2311(this, [type.define({
        className: "EveChildLightingOverride",
        family: "eve/child"
      })], [[[io, io.persist, type, type.int32, void 0, schema.enum("Priority")], 16, "priority"], [[io, io.persist, type, type.string], 16, "name"], [[io, io.persist, type, type.float32], 16, "backgroundIntensity"], [[io, io.persist, type, type.float32], 16, "intensity"], [[io, io.persist, type, type.float32], 16, "reflectionIntensity"], [[io, io.persist, type, type.float32], 16, "sunIntensity"], [[io, io.persist, type, type.color], 16, "sunColor"], [[io, io.persist, void 0, type.list("IEveVolume")], 16, "volumes"], [[impl, impl.implemented], 18, "RegisterComponents"], [[impl, impl.implemented], 18, "GetOverrides"], [[impl, impl.adapted], 18, "GetBoundingSphere"], [[impl, impl.adapted], 18, "UpdateAsyncronous"]], 0, void 0, _EveChildTransform));
    }
    constructor(...args) {
      super(...args);
      _init_extra_volumes(this);
    }
    #overrideIntensity = (_initProto(this), 0);
    #boundingSphere = {
      center: vec3.create(),
      radius: 0,
      initialized: false
    };
    priority = _init_priority(this, 2);
    name = (_init_extra_priority(this), _init_name(this, ""));
    backgroundIntensity = (_init_extra_name(this), _init_backgroundIntensity(this, 1));
    intensity = (_init_extra_backgroundIntensity(this), _init_intensity(this, 1));
    reflectionIntensity = (_init_extra_intensity(this), _init_reflectionIntensity(this, 1));
    sunIntensity = (_init_extra_reflectionIntensity(this), _init_sunIntensity(this, 1));
    sunColor = (_init_extra_sunIntensity(this), _init_sunColor(this, vec4.fromValues(1, 1, 1, 1)));
    volumes = (_init_extra_sunColor(this), _init_volumes(this, []));

    /** Carbon EveChildLightingOverride::RegisterComponents (cpp:47-50):
     * unconditional EveLightingOverride leaf self-registration. Carbon's
     * UnRegisterComponents (cpp:52-55) only removes this same component, which
     * EveEntity::UnRegister already did via UnRegisterAllComponents
     * (EveEntity.cpp:90), so the JS un-side keeps the base no-op. */
    RegisterComponents() {
      const registry = this.GetComponentRegistry();
      if (registry) {
        registry.RegisterComponent(EveComponentType.EveLightingOverride, this);
      }
    }

    /**
     * Returns this child's contribution to the lighting system: its priority, the
     * blend intensity resolved by the last async update, and the sun
     * colour/intensity plus background and reflection intensities to blend toward.
     */
    GetOverrides() {
      return {
        priority: this.priority,
        intensity: this.#overrideIntensity,
        value: {
          sunColor: vec4.clone(this.sunColor),
          sunIntensity: this.sunIntensity,
          backgroundIntensity: this.backgroundIntensity,
          reflectionIntensity: this.reflectionIntensity
        }
      };
    }

    /**
     * The authored name, persisted with the override and used to identify it in
     * the parent graph.
     */
    GetName() {
      return this.name;
    }

    /** Sets the authored override name, coercing nullish to the empty string. */
    SetName(name) {
      this.name = String(name ?? "");
    }

    /**
     * Copies the cached local-space bounding sphere into out and always reports success, even before any volume has contributed.
     * @param {Float32Array} [out] - caller-owned; receives (x, y, z, radius)
     * @returns {Boolean} always true
     */
    GetBoundingSphere(out = vec4.create()) {
      vec4.set(out, this.#boundingSphere.center[0], this.#boundingSphere.center[1], this.#boundingSphere.center[2], this.#boundingSphere.radius);
      return true;
    }

    /** No-op: a lighting override carries no sync-side frame work. */
    UpdateSyncronous(_updateContext, _params) {}

    /**
     * Rebuilds the world transform and bounding sphere, then resolves the override
     * strength for the frame: with no volumes the authored intensity applies
     * directly; otherwise the camera is moved into local space and, only while it
     * is inside the bounding sphere, the strongest volume intensity there
     * (short-circuiting at 1) is scaled by the authored intensity - a camera
     * outside leaves the strength at zero.
     */
    UpdateAsyncronous(updateContext, params = {}) {
      this.UpdateTransform(params.localToWorldTransform ?? mat4.create());
      this.#RebuildBoundingSphere();
      if (this.volumes.length === 0) {
        this.#overrideIntensity = this.intensity;
        return;
      }
      this.#overrideIntensity = 0;
      const viewPosition = updateContext?.renderContext?.GetViewPosition?.();
      const inverse = mat4.invert(mat4.create(), this.worldTransform);
      if (!viewPosition || !inverse || !this.#boundingSphere.initialized) return;
      const localView = vec3.transformMat4(vec3.create(), viewPosition, inverse);
      if (vec3.distance(localView, this.#boundingSphere.center) > this.#boundingSphere.radius) return;
      for (const volume of this.volumes) {
        this.#overrideIntensity = Math.max(this.#overrideIntensity, Number(volume?.GetIntensity?.(localView)) || 0);
        if (this.#overrideIntensity >= 1) break;
      }
      this.#overrideIntensity *= this.intensity;
    }

    /**
     * Copies the child's world transform, as rebuilt by the last async update.
     * @param {Float32Array} [out] - caller-owned; allocated when omitted
     * @returns {Float32Array} out
     */
    GetLocalToWorldTransform(out = mat4.create()) {
      return mat4.copy(out, this.worldTransform);
    }

    /**
     * Applies the authored scale/rotation/translation through the shared child
     * transform setup.
     */
    Setup(scale, rotation, translation, lowestLodVisible) {
      return super.Setup(scale, rotation, translation, lowestLodVisible);
    }

    /**
     * Returns true unconditionally - a lighting override reports itself as always
     * on.
     */
    IsAlwaysOn() {
      return true;
    }

    /**
     * Builds the initial bounding sphere from the authored volumes so the first
     * frame can already reject an outside camera.
     */
    Initialize() {
      this.#RebuildBoundingSphere();
      return true;
    }

    /** No-op: a lighting override is not renderable and keeps no visibility state. */
    UpdateVisibility(_updateContext, _parentTransform, _parentLod) {}

    /** No-op: a lighting override contributes settings, never renderables. */
    GetRenderables(_renderables) {}

    /** No-op: a lighting override has no LOD levels. */
    ChangeLOD(_lod) {}
    /**
     * Recomputes the cached bounding sphere as the union of the child volumes'
     * spheres, skipping volumes with a missing centre or a non-finite/negative
     * radius, and records whether any volume contributed.
     */
    #RebuildBoundingSphere() {
      const target = this.#boundingSphere;
      vec3.set(target.center, 0, 0, 0);
      target.radius = 0;
      target.initialized = false;
      for (const volume of this.volumes) {
        const sphere = volume?.GetBoundingSphere?.();
        if (!sphere?.center || !Number.isFinite(sphere.radius) || sphere.radius < 0) continue;
        if (!target.initialized) {
          vec3.copy(target.center, sphere.center);
          target.radius = sphere.radius;
          target.initialized = true;
          continue;
        }
        _EveChildLightingOver.#UnionSphere(target, sphere);
      }
    }

    /**
     * Grows the target sphere in place so it also encloses the given sphere,
     * short-circuiting when either already contains the other and handling
     * coincident centres.
     */
  }];
  Priority = Object.freeze({
    SCENE_DEFAULT_PRIORITY: 0,
    LOW_PRIORITY: 1,
    MEDIUM_PRIORITY: 2,
    HIGH_PRIORITY: 3,
    UI_PRIORITY: 4,
    PRIORITY_COUNT: 5
  });
  #UnionSphere(target, sphere) {
    const delta = vec3.subtract(vec3.create(), sphere.center, target.center);
    const distance = vec3.length(delta);
    if (distance + sphere.radius <= target.radius) return;
    if (distance + target.radius <= sphere.radius) {
      vec3.copy(target.center, sphere.center);
      target.radius = sphere.radius;
      return;
    }
    if (distance === 0) {
      target.radius = Math.max(target.radius, sphere.radius);
      return;
    }
    const radius = (target.radius + sphere.radius + distance) * 0.5;
    vec3.scaleAndAdd(target.center, target.center, delta, (radius - target.radius) / distance);
    target.radius = radius;
  }
  constructor() {
    super(_EveChildLightingOver), _initClass();
  }
}();

export { _EveChildLightingOver as EveChildLightingOverride };
//# sourceMappingURL=EveChildLightingOverride.js.map
