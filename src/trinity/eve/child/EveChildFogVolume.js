import { exposure as be } from "#be";
import { ITr2DebugRenderable, ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildFogVolume_Blue.cpp
import { meta, type, blue } from "#schema";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveEntity } from "../EveEntity.js";
import { mat4 } from "#math/mat4";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";

import { ITr2FroxelFogSettings } from "./ITr2FroxelFogSettings.js";
import { EveComponentType } from "../EntityComponents.js";
import { Priority } from "../../generated/postProcess/enums.js";
import "../../postProcess/Tr2PostProcessAttributes.js";


const INVERSE_WORLD = mat4.create();
const LOCAL_VIEW = vec3.create();
const UNION_DELTA = vec3.create();
const DEBUG_TRANSFORM = mat4.create();


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
    reflectionIntensity: createAttribute(1),
    logThickness: createAttribute(0)
  };
}


/**
 * Space-object child that contributes a prioritized froxel fog settings
 * override, its strength driven by how deeply the camera sits inside the volumes
 * it owns.
 */
@be.define("EveChildFogVolume")
@blue.inherit(IInitialize)
@be.mapInterface(ITr2FroxelFogSettings)
@be.mapInterface(EveEntity)
@be.mapInterface(EveSpaceObjectChild)
@be.mapInterface(IEveSpaceObjectChild)
@be.mapInterface(IInitialize)
@blue.inherit(ITr2DebugRenderable)
export class EveChildFogVolume extends ITr2FroxelFogSettings
{
  _fogIntensity = 0;

  _froxelFogSettings = createFroxelFogSettings();

  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PostProcessEnums.Priority")
  priority = 2;

  @be.mapAttribute(be.READ | be.PERSIST)

  @type.list("IEveVolume")
  volumes = [];

  @be.mapAttribute(be.READ)
  @type.vec3
  boundingSphereCenter = vec3.create();

  @be.mapAttribute(be.READ)
  @type.float32
  boundingSphereRadius = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.string
  name = "";

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  intensity = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  thickness = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  thicknessEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  lightDirectionality = 0.5;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  lightDirectionalityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  environmentIntensity = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  environmentIntensityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  environmentDirectionality = 0.75;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  environmentDirectionalityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.color
  fogColor = vec4.fromValues(1, 1, 1, 1);

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  fogColorEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  backgroundVisibility = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  backgroundVisibilityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  godRayNoiseIntensity = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  godRayNoiseIntensityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  godRayNoiseFrequency = 15;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  godRayNoiseFrequencyEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  godRayNoiseAnimationSpeed = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  godRayNoiseAnimationSpeedEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  fogNoiseIntensity = 0;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  fogNoiseIntensityEnabled = false;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  fogNoiseFrequency = 15;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  fogNoiseFrequencyEnabled = false;

  /** A colour multiplier for the fog's reflections; 1 is the realistic default (EveChildFogVolume.cpp:30). */
  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.float32
  reflectionIntensity = 1;

  @be.mapAttribute(be.READWRITE | be.PERSIST)

  @type.boolean
  reflectionIntensityEnabled = false;

  /**
   * Recomputes the local bounding sphere as the union of the child volumes'
   * spheres, skipping volumes with a missing centre or a non-finite/negative
   * radius; returns whether any volume contributed.
   */
  @blue.method
  @meta.adapted
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
      this._UnionSphere(sphere);
    }
    return initialized;
  }

  /**
   * The authored name, persisted with the volume and used to identify it in the
   * parent graph.
   */
  @blue.method
  GetName()
  {
    return this.name;
  }

  /** Sets the authored volume name, coercing nullish to the empty string. */
  @blue.method
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Copies the cached local-space bounding sphere into out and always reports success, even before any volume has contributed (in which case it is the zero-radius sphere at the origin).
   * @param {Float32Array} [out] - caller-owned; receives (x, y, z, radius)
   * @returns {Boolean} always true
   */
  @blue.method
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, this.boundingSphereCenter[0], this.boundingSphereCenter[1], this.boundingSphereCenter[2], this.boundingSphereRadius);
    return true;
  }

  /** No-op: a fog volume carries no sync-side frame work. */
  @blue.method
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Carbon UpdateTransformFromParent (EveChildFogVolume.cpp:124-129): the fog
   * volume ignores its own local offset chain and adopts the parent's world
   * matrix verbatim - the override that makes fog volumes track parents.
   */
  @blue.method
  @meta.implemented
  UpdateTransformFromParent(params)
  {
    this.UpdateTransform(params.localToWorldTransform);
  }

  /**
   * Rebuilds the world transform and bounding sphere, then resolves the fog
   * intensity for the frame: with no volumes the authored intensity applies
   * directly; otherwise the camera is moved into local space and, only while it
   * is inside the bounding sphere, the strongest volume intensity there
   * (short-circuiting at 1) is scaled by the authored intensity - a camera
   * outside leaves the intensity at zero.
   */
  @blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, params)
  {
    this.UpdateTransform(params.localToWorldTransform);
    const initialized = this.RebuildBoundingSphere();
    if (this.volumes.length === 0)
    {
      this._fogIntensity = this.intensity;
      return;
    }

    this._fogIntensity = 0;
    const viewPosition = Tr2Renderer.GetViewPosition();
    // Inverse( m_worldTransform ) (EveChildFogVolume.cpp:105), unconditional.
    const inverse = mat4.inverseCarbon(INVERSE_WORLD, this.worldTransform);
    if (!initialized) return;
    vec3.transformMat4(LOCAL_VIEW, viewPosition, inverse);
    if (vec3.distance(LOCAL_VIEW, this.boundingSphereCenter) > this.boundingSphereRadius) return;
    for (const volume of this.volumes)
    {
      this._fogIntensity = Math.max(this._fogIntensity, volume.GetIntensity(LOCAL_VIEW));
      if (this._fogIntensity === 1) break;
    }
    this._fogIntensity *= this.intensity;
  }

  /**
   * Copies the child's world transform, as rebuilt by the last async update.
   * Carbon's body is empty; the JavaScript child contract must return the
   * transform because owned parent/FX consumers use this method as their
   * nominal transform boundary.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  @blue.method
  @meta.adapted
  GetLocalToWorldTransform(out = mat4.create())
  {
    return mat4.copy(out, this.worldTransform);
  }

  /**
   * Applies the authored scale/rotation/translation through the shared child
   * transform setup.
   */
  @blue.method
  Setup(scale, rotation, translation, lowestLodVisible)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  /** Returns true unconditionally - a fog volume reports itself as always on. */
  @blue.method
  IsAlwaysOn()
  {
    return true;
  }

  /**
   * Builds the initial bounding sphere from the authored volumes so the first
   * frame can already reject an outside camera.
   */
  @blue.method
  Initialize()
  {
    this.RebuildBoundingSphere();
    return true;
  }

  /**
   * Carbon EveChildFogVolume::GetDebugOptions (cpp:158-162).
   * @param {Set<string>} options The caller-owned option set.
   */
  @blue.method
  @meta.implemented
  GetDebugOptions(options)
  {
    options.add("Volumes");
    options.add("Bounding Sphere");
  }

  /**
   * Carbon EveChildFogVolume::RenderDebugInfo (cpp:164-178): every volume
   * under the world transform with "Volumes", then the bounding sphere placed
   * at its centre under the world transform with "Bounding Sphere".
   * @param {ITr2DebugRenderer2} renderer
   */
  @blue.method
  @meta.implemented
  RenderDebugInfo(renderer)
  {
    if (renderer.HasOption(this, "Volumes"))
    {
      for (const volume of this.volumes)
      {
        volume.RenderDebugInfo(renderer, this.worldTransform);
      }
    }

    if (renderer.HasOption(this, "Bounding Sphere"))
    {
      // Carbon (row-vector): TranslationMatrix( m_boundingSphere.center ) * m_worldTransform.
      const transform = mat4.translate(DEBUG_TRANSFORM, this.worldTransform, this.boundingSphereCenter);
      renderer.DrawSphere__TransformRadius(
        Tr2DebugObjectReference.create__Object(this),
        transform,
        this.boundingSphereRadius,
        10,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xff333333));
    }
  }

  /** Carbon EveChildFogVolume::RegisterComponents (cpp:71-74): unconditional
   * FroxelFogSettings leaf self-registration. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.FroxelFogSettings, this);
    }
  }

  /**
   * Carbon EveChildFogVolume::UnRegisterComponents (cpp:76-79): removes the
   * FroxelFogSettings component. Reached from EveEntity::UnRegister
   * (EveEntity.cpp:81-94) after UnRegisterAllComponents has already removed
   * it, so there the removal finds nothing; Carbon does it anyway.
   */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    this.GetComponentRegistry().UnRegisterComponent(EveComponentType.FroxelFogSettings, this);
  }

  /**
   * Returns this child's stable contribution record. Values are refreshed in
   * place so per-frame fog blending neither allocates nor loses Carbon's
   * `fogNoiseMovementSpeed` and derived `logThickness` attributes.
   */
  @blue.method
  @meta.adapted
  GetFroxelFogSettings()
  {
    const out = this._froxelFogSettings;
    out.priority = this.priority;
    out.intensity = this._fogIntensity;
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
    out.reflectionIntensity.value = this.reflectionIntensity;
    out.reflectionIntensity.enabled = this.reflectionIntensityEnabled;
    return out;
  }

  /** No-op: a fog volume is not renderable and keeps no visibility state. */
  @blue.method
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: a fog volume contributes settings, never renderables. */
  @blue.method
  GetRenderables(_renderables)
  {
  }

  /** No-op: a fog volume has no LOD levels. */
  @blue.method
  ChangeLOD(_lod)
  {
  }

  static Priority = Priority;

  /**
   * Grows the accumulated bounding sphere so it also encloses the given sphere,
   * short-circuiting when either sphere already contains the other and handling
   * coincident centres.
   */
  _UnionSphere(sphere)
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

// EveChildFogVolume_Blue.cpp: native exposure.
