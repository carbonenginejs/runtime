// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.cpp
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { impl, io, type } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { Priority } from "../../generated/postProcess/enums.js";


/**
 * Space-object child that overrides scene sun, background and reflection
 * lighting, its blend strength driven by how deeply the camera sits inside the
 * volumes it owns.
 */
@type.define({ className: "EveChildLightingOverride", family: "eve/child" })
export class EveChildLightingOverride extends EveChildTransform
{
  #overrideIntensity = 0;
  #boundingSphere = { center: vec3.create(), radius: 0, initialized: false };

  @io.persist
  @type.int32
  @type.enum("Priority")
  priority = 2;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  backgroundIntensity = 1;

  @io.persist
  @type.float32
  intensity = 1;

  @io.persist
  @type.float32
  reflectionIntensity = 1;

  @io.persist
  @type.float32
  sunIntensity = 1;

  @io.persist
  @type.color
  sunColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.list("IEveVolume")
  volumes = [];

  /** Carbon EveChildLightingOverride::RegisterComponents (cpp:47-50):
   * unconditional EveLightingOverride leaf self-registration. Carbon's
   * UnRegisterComponents (cpp:52-55) only removes this same component, which
   * EveEntity::UnRegister already did via UnRegisterAllComponents
   * (EveEntity.cpp:90), so the JS un-side keeps the base no-op. */
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.EveLightingOverride, this);
    }
  }

  /**
   * Returns this child's contribution to the lighting system: its priority, the
   * blend intensity resolved by the last async update, and the sun
   * colour/intensity plus background and reflection intensities to blend toward.
   */
  @impl.implemented
  GetOverrides()
  {
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
  GetName()
  {
    return this.name;
  }

  /** Sets the authored override name, coercing nullish to the empty string. */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Copies the cached local-space bounding sphere into out and always reports success, even before any volume has contributed.
   * @param {Float32Array} [out] - caller-owned; receives (x, y, z, radius)
   * @returns {Boolean} always true
   */
  @impl.adapted
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, this.#boundingSphere.center[0], this.#boundingSphere.center[1], this.#boundingSphere.center[2], this.#boundingSphere.radius);
    return true;
  }

  /** No-op: a lighting override carries no sync-side frame work. */
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Rebuilds the world transform and bounding sphere, then resolves the override
   * strength for the frame: with no volumes the authored intensity applies
   * directly; otherwise the camera is moved into local space and, only while it
   * is inside the bounding sphere, the strongest volume intensity there
   * (short-circuiting at 1) is scaled by the authored intensity - a camera
   * outside leaves the strength at zero.
   */
  @impl.adapted
  UpdateAsyncronous(updateContext, params = {})
  {
    this.UpdateTransform(params.localToWorldTransform ?? mat4.create());
    this.#RebuildBoundingSphere();

    if (this.volumes.length === 0)
    {
      this.#overrideIntensity = this.intensity;
      return;
    }

    this.#overrideIntensity = 0;
    const viewPosition = updateContext?.renderContext?.GetViewPosition?.();
    const inverse = mat4.invert(mat4.create(), this.worldTransform);
    if (!viewPosition || !inverse || !this.#boundingSphere.initialized) return;
    const localView = vec3.transformMat4(vec3.create(), viewPosition, inverse);
    if (vec3.distance(localView, this.#boundingSphere.center) > this.#boundingSphere.radius) return;

    for (const volume of this.volumes)
    {
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
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.worldTransform);
  }

  /**
   * Applies the authored scale/rotation/translation through the shared child
   * transform setup.
   */
  Setup(scale, rotation, translation, lowestLodVisible)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /**
   * Returns true unconditionally - a lighting override reports itself as always
   * on.
   */
  IsAlwaysOn()
  {
    return true;
  }

  /**
   * Builds the initial bounding sphere from the authored volumes so the first
   * frame can already reject an outside camera.
   */
  Initialize()
  {
    this.#RebuildBoundingSphere();
    return true;
  }

  /** No-op: a lighting override is not renderable and keeps no visibility state. */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: a lighting override contributes settings, never renderables. */
  GetRenderables(_renderables)
  {
  }

  /** No-op: a lighting override has no LOD levels. */
  ChangeLOD(_lod)
  {
  }

  static Priority = Priority;

  /**
   * Recomputes the cached bounding sphere as the union of the child volumes'
   * spheres, skipping volumes with a missing centre or a non-finite/negative
   * radius, and records whether any volume contributed.
   */
  #RebuildBoundingSphere()
  {
    const target = this.#boundingSphere;
    vec3.set(target.center, 0, 0, 0);
    target.radius = 0;
    target.initialized = false;

    for (const volume of this.volumes)
    {
      const sphere = volume?.GetBoundingSphere?.();
      if (!sphere?.center || !Number.isFinite(sphere.radius) || sphere.radius < 0) continue;
      if (!target.initialized)
      {
        vec3.copy(target.center, sphere.center);
        target.radius = sphere.radius;
        target.initialized = true;
        continue;
      }
      EveChildLightingOverride.#UnionSphere(target, sphere);
    }
  }

  /**
   * Grows the target sphere in place so it also encloses the given sphere,
   * short-circuiting when either already contains the other and handling
   * coincident centres.
   */
  static #UnionSphere(target, sphere)
  {
    const delta = vec3.subtract(vec3.create(), sphere.center, target.center);
    const distance = vec3.length(delta);
    if (distance + sphere.radius <= target.radius) return;
    if (distance + target.radius <= sphere.radius)
    {
      vec3.copy(target.center, sphere.center);
      target.radius = sphere.radius;
      return;
    }
    if (distance === 0)
    {
      target.radius = Math.max(target.radius, sphere.radius);
      return;
    }
    const radius = (target.radius + sphere.radius + distance) * 0.5;
    vec3.scaleAndAdd(target.center, target.center, delta, (radius - target.radius) / distance);
    target.radius = radius;
  }
}
