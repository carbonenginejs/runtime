// Ported/adapted from CarbonEngine (MIT, (c) 2026 CCP Games) - https://github.com/carbonengine/trinity
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.h
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.cpp
//   trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume_Blue.cpp
import { mat4 } from "@carbonenginejs/runtime-utils/mat4";
import { vec3 } from "@carbonenginejs/runtime-utils/vec3";
import { vec4 } from "@carbonenginejs/runtime-utils/vec4";
import { impl, io, type } from "@carbonenginejs/runtime-utils/schema";
import { ITr2FroxelFogSettings } from "./ITr2FroxelFogSettings.js";
import { EveComponentType } from "../EveComponentTypes.js";
import { Priority } from "../../generated/postProcess/enums.js";


const INVERSE_WORLD = mat4.create();
const LOCAL_VIEW = vec3.create();
const UNION_DELTA = vec3.create();


function createAttribute(value)
{
  return { value, enabled: false };
}


function createFroxelFogSettings()
{
  return {
    priority: Priority.MEDIUM_PRIORITY,
    intensity: 0,
    thickness: createAttribute(0),
    lightDirectionality: createAttribute(0),
    environmentIntensity: createAttribute(0),
    environmentDirectionality: createAttribute(0),
    fogColor: createAttribute(vec4.create()),
    backgroundVisibility: createAttribute(0),
    godRayNoiseIntensity: createAttribute(0),
    godRayNoiseFrequency: createAttribute(0),
    godRayNoiseAnimationSpeed: createAttribute(0),
    fogNoiseIntensity: createAttribute(0),
    fogNoiseFrequency: createAttribute(0),
    fogNoiseMovementSpeed: createAttribute(vec3.create()),
    logThickness: createAttribute(0)
  };
}


/**
 * Space-object child that contributes a prioritized froxel fog settings
 * override, its strength driven by how deeply the camera sits inside the volumes
 * it owns.
 */
@type.define({ className: "EveChildFogVolume", family: "eve/child" })
export class EveChildFogVolume extends ITr2FroxelFogSettings
{
  #fogIntensity = 0;

  #froxelFogSettings = createFroxelFogSettings();

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
      const sphere = volume.GetBoundingSphere();
      if (!Number.isFinite(sphere.radius) || sphere.radius < 0) continue;
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
  UpdateAsyncronous(updateContext, params)
  {
    this.UpdateTransform(params.localToWorldTransform);
    const initialized = this.RebuildBoundingSphere();
    if (this.volumes.length === 0)
    {
      this.#fogIntensity = this.intensity;
      return;
    }

    this.#fogIntensity = 0;
    const viewPosition = updateContext.renderContext.GetViewPosition();
    const inverse = mat4.invert(INVERSE_WORLD, this.worldTransform);
    if (!inverse || !initialized) return;
    vec3.transformMat4(LOCAL_VIEW, viewPosition, inverse);
    if (vec3.distance(LOCAL_VIEW, this.boundingSphereCenter) > this.boundingSphereRadius) return;
    for (const volume of this.volumes)
    {
      this.#fogIntensity = Math.max(this.#fogIntensity, volume.GetIntensity(LOCAL_VIEW));
      if (this.#fogIntensity === 1) break;
    }
    this.#fogIntensity *= this.intensity;
  }

  /**
   * Copies the child's world transform, as rebuilt by the last async update.
   * Carbon's body is empty; the JavaScript child contract must return the
   * transform because owned parent/FX consumers use this method as their
   * nominal transform boundary.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  @impl.adapted
  @impl.reason("Carbon's EveChildFogVolume body leaves the out matrix untouched; JavaScript's nominal child consumers require the current world transform and already consume that corrected contract.")
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
   * Returns this child's stable contribution record. Values are refreshed in
   * place so per-frame fog blending neither allocates nor loses Carbon's
   * `fogNoiseMovementSpeed` and derived `logThickness` attributes.
   */
  @impl.adapted
  GetFroxelFogSettings()
  {
    const out = this.#froxelFogSettings;
    out.priority = this.priority;
    out.intensity = this.#fogIntensity;
    out.thickness.value = this.thickness;
    out.thickness.enabled = this.thicknessEnabled;
    out.lightDirectionality.value = this.lightDirectionality;
    out.lightDirectionality.enabled = this.lightDirectionalityEnabled;
    out.environmentIntensity.value = this.environmentIntensity;
    out.environmentIntensity.enabled = this.environmentIntensityEnabled;
    out.environmentDirectionality.value = this.environmentDirectionality;
    out.environmentDirectionality.enabled = this.environmentDirectionalityEnabled;
    vec4.copy(out.fogColor.value, this.fogColor);
    out.fogColor.enabled = this.fogColorEnabled;
    out.backgroundVisibility.value = this.backgroundVisibility;
    out.backgroundVisibility.enabled = this.backgroundVisibilityEnabled;
    out.godRayNoiseIntensity.value = this.godRayNoiseIntensity;
    out.godRayNoiseIntensity.enabled = this.godRayNoiseIntensityEnabled;
    out.godRayNoiseFrequency.value = this.godRayNoiseFrequency;
    out.godRayNoiseFrequency.enabled = this.godRayNoiseFrequencyEnabled;
    out.godRayNoiseAnimationSpeed.value = this.godRayNoiseAnimationSpeed;
    out.godRayNoiseAnimationSpeed.enabled = this.godRayNoiseAnimationSpeedEnabled;
    out.fogNoiseIntensity.value = this.fogNoiseIntensity;
    out.fogNoiseIntensity.enabled = this.fogNoiseIntensityEnabled;
    out.fogNoiseFrequency.value = this.fogNoiseFrequency;
    out.fogNoiseFrequency.enabled = this.fogNoiseFrequencyEnabled;
    return out;
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
    vec3.subtract(UNION_DELTA, sphere.center, this.boundingSphereCenter);
    const distance = vec3.length(UNION_DELTA);
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
    vec3.scaleAndAdd(this.boundingSphereCenter, this.boundingSphereCenter, UNION_DELTA, (radius - this.boundingSphereRadius) / distance);
    this.boundingSphereRadius = radius;
  }
}
