// Ported/adapted from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.cpp
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { Priority } from "../../generated/postProcess/enums.js";


/**
 * Space-object child that contributes a prioritized froxel fog settings
 * override, its strength driven by how deeply the camera sits inside the volumes
 * it owns.
 */
@type.define({ className: "EveChildFogVolume", family: "eve/child" })
export class EveChildFogVolume extends EveChildTransform
{
  #fogIntensity = 0;

  @io.persist
  @type.int32
  @type.enum("Priority")
  priority = 2;

  @io.persist
  @type.list("IEveVolume")
  volumes = [];

  @io.read
  @type.vec3
  boundingSphereCenter = vec3.create();

  @io.read
  @type.float32
  boundingSphereRadius = 0;

  @io.persist
  @type.string
  name = "";

  @io.persist
  @type.float32
  intensity = 1;

  @io.persist
  @type.float32
  thickness = 1;

  @io.persist
  @type.boolean
  thicknessEnabled = false;

  @io.persist
  @type.float32
  lightDirectionality = 0.5;

  @io.persist
  @type.boolean
  lightDirectionalityEnabled = false;

  @io.persist
  @type.float32
  environmentIntensity = 1;

  @io.persist
  @type.boolean
  environmentIntensityEnabled = false;

  @io.persist
  @type.float32
  environmentDirectionality = 0.75;

  @io.persist
  @type.boolean
  environmentDirectionalityEnabled = false;

  @io.persist
  @type.color
  fogColor = vec4.fromValues(1, 1, 1, 1);

  @io.persist
  @type.boolean
  fogColorEnabled = false;

  @io.persist
  @type.float32
  backgroundVisibility = 0;

  @io.persist
  @type.boolean
  backgroundVisibilityEnabled = false;

  @io.persist
  @type.float32
  godRayNoiseIntensity = 0;

  @io.persist
  @type.boolean
  godRayNoiseIntensityEnabled = false;

  @io.persist
  @type.float32
  godRayNoiseFrequency = 15;

  @io.persist
  @type.boolean
  godRayNoiseFrequencyEnabled = false;

  @io.persist
  @type.float32
  godRayNoiseAnimationSpeed = 0;

  @io.persist
  @type.boolean
  godRayNoiseAnimationSpeedEnabled = false;

  @io.persist
  @type.float32
  fogNoiseIntensity = 0;

  @io.persist
  @type.boolean
  fogNoiseIntensityEnabled = false;

  @io.persist
  @type.float32
  fogNoiseFrequency = 15;

  @io.persist
  @type.boolean
  fogNoiseFrequencyEnabled = false;

  /**
   * Recomputes the local bounding sphere as the union of the child volumes'
   * spheres, skipping volumes with a missing centre or a non-finite/negative
   * radius; returns whether any volume contributed.
   */
  @impl.adapted
  RebuildBoundingSphere()
  {
    vec3.set(this.boundingSphereCenter, 0, 0, 0);
    this.boundingSphereRadius = 0;
    let initialized = false;
    for (const volume of this.volumes)
    {
      const sphere = volume?.GetBoundingSphere?.();
      if (!sphere?.center || !Number.isFinite(sphere.radius) || sphere.radius < 0) continue;
      if (!initialized)
      {
        vec3.copy(this.boundingSphereCenter, sphere.center);
        this.boundingSphereRadius = sphere.radius;
        initialized = true;
        continue;
      }
      this.#UnionSphere(sphere);
    }
    return initialized;
  }

  /**
   * The authored name, persisted with the volume and used to identify it in the
   * parent graph.
   */
  GetName()
  {
    return this.name;
  }

  /** Sets the authored volume name, coercing nullish to the empty string. */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Copies the cached local-space bounding sphere into out and always reports success, even before any volume has contributed (in which case it is the zero-radius sphere at the origin).
   * @param {Float32Array} [out] - caller-owned; receives (x, y, z, radius)
   * @returns {Boolean} always true
   */
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
    return true;
  }

  /** No-op: a fog volume carries no sync-side frame work. */
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Rebuilds the world transform and bounding sphere, then resolves the fog
   * intensity for the frame: with no volumes the authored intensity applies
   * directly; otherwise the camera is moved into local space and, only while it
   * is inside the bounding sphere, the strongest volume intensity there
   * (short-circuiting at 1) is scaled by the authored intensity - a camera
   * outside leaves the intensity at zero.
   */
  @impl.adapted
  UpdateAsyncronous(updateContext, params = {})
  {
    this.UpdateTransform(params.localToWorldTransform ?? mat4.create());
    const initialized = this.RebuildBoundingSphere();
    if (this.volumes.length === 0)
    {
      this.#fogIntensity = this.intensity;
      return;
    }

    this.#fogIntensity = 0;
    const viewPosition = updateContext?.renderContext?.GetViewPosition?.();
    const inverse = mat4.invert(mat4.create(), this.worldTransform);
    if (!viewPosition || !inverse || !initialized) return;
    const localView = vec3.transformMat4(vec3.create(), viewPosition, inverse);
    if (vec3.distance(localView, this.boundingSphereCenter) > this.boundingSphereRadius) return;
    for (const volume of this.volumes)
    {
      this.#fogIntensity = Math.max(this.#fogIntensity, Number(volume?.GetIntensity?.(localView)) || 0);
      if (this.#fogIntensity >= 1) break;
    }
    this.#fogIntensity *= this.intensity;
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

  /** Returns true unconditionally - a fog volume reports itself as always on. */
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
    this.RebuildBoundingSphere();
    return true;
  }

  /** Carbon EveChildFogVolume::RegisterComponents (cpp:69-72): unconditional
   * FroxelFogSettings leaf self-registration. Carbon's UnRegisterComponents
   * (cpp:74-77) only removes this same component, which EveEntity::UnRegister
   * already did via UnRegisterAllComponents (EveEntity.cpp:90), so the JS
   * un-side keeps the base no-op. */
  @impl.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.FroxelFogSettings, this);
    }
  }

  /**
   * Returns this child's contribution to the froxel fog system: its priority,
   * the intensity resolved by the last async update, and every optional
   * attribute as a {value, enabled} pair so the consumer can tell an override
   * from a default.
   */
  @impl.adapted
  GetFroxelFogSettings()
  {
    const attribute = (value, enabled) => ({ value, enabled });
    return {
      priority: this.priority,
      intensity: this.#fogIntensity,
      thickness: attribute(this.thickness, this.thicknessEnabled),
      lightDirectionality: attribute(this.lightDirectionality, this.lightDirectionalityEnabled),
      environmentIntensity: attribute(this.environmentIntensity, this.environmentIntensityEnabled),
      environmentDirectionality: attribute(this.environmentDirectionality, this.environmentDirectionalityEnabled),
      fogColor: attribute(vec4.clone(this.fogColor), this.fogColorEnabled),
      backgroundVisibility: attribute(this.backgroundVisibility, this.backgroundVisibilityEnabled),
      godRayNoiseIntensity: attribute(this.godRayNoiseIntensity, this.godRayNoiseIntensityEnabled),
      godRayNoiseFrequency: attribute(this.godRayNoiseFrequency, this.godRayNoiseFrequencyEnabled),
      godRayNoiseAnimationSpeed: attribute(this.godRayNoiseAnimationSpeed, this.godRayNoiseAnimationSpeedEnabled),
      fogNoiseIntensity: attribute(this.fogNoiseIntensity, this.fogNoiseIntensityEnabled),
      fogNoiseFrequency: attribute(this.fogNoiseFrequency, this.fogNoiseFrequencyEnabled)
    };
  }

  /** No-op: a fog volume is not renderable and keeps no visibility state. */
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: a fog volume contributes settings, never renderables. */
  GetRenderables(_renderables)
  {
  }

  /** No-op: a fog volume has no LOD levels. */
  ChangeLOD(_lod)
  {
  }

  static Priority = Priority;

  /**
   * Grows the accumulated bounding sphere so it also encloses the given sphere,
   * short-circuiting when either sphere already contains the other and handling
   * coincident centres.
   */
  #UnionSphere(sphere)
  {
    const delta = vec3.subtract(vec3.create(), sphere.center, this.boundingSphereCenter);
    const distance = vec3.length(delta);
    if (distance + sphere.radius <= this.boundingSphereRadius) return;
    if (distance + this.boundingSphereRadius <= sphere.radius)
    {
      vec3.copy(this.boundingSphereCenter, sphere.center);
      this.boundingSphereRadius = sphere.radius;
      return;
    }
    if (distance === 0)
    {
      this.boundingSphereRadius = Math.max(this.boundingSphereRadius, sphere.radius);
      return;
    }
    const radius = (this.boundingSphereRadius + sphere.radius + distance) * 0.5;
    vec3.scaleAndAdd(this.boundingSphereCenter, this.boundingSphereCenter, delta, (radius - this.boundingSphereRadius) / distance);
    this.boundingSphereRadius = radius;
  }
}
