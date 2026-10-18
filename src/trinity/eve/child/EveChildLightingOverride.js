// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildLightingOverride.cpp
import { ITr2DebugRenderable, ITr2DebugRenderer2, Tr2DebugColor, Tr2DebugObjectReference } from "#interfaces";
import { IInitialize } from "../../../global/blue/IInitialize.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveEntity } from "../EveEntity.js";
import { mat4 } from "#math/mat4";
import { Tr2Renderer } from "../../core/Tr2Renderer.js";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { meta, type, blue } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { EveComponentType } from "../EntityComponents.js";
import { Priority } from "../../generated/postProcess/enums.js";
import { IEveLightingOverride } from "./IEveLightingOverride.js";
import "../../postProcess/Tr2PostProcessAttributes.js";

const DEBUG_TRANSFORM = mat4.create();


/**
 * Space-object child that overrides scene sun, background and reflection
 * lighting, its blend strength driven by how deeply the camera sits inside the
 * volumes it owns.
 */
@blue.define("EveChildLightingOverride")
@blue.inherit(IEveLightingOverride)
@blue.inherit(IInitialize)
@blue.interface(EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild, IEveLightingOverride, IInitialize, ITr2DebugRenderable)
@blue.inherit(ITr2DebugRenderable)
export class EveChildLightingOverride extends EveChildTransform
{
  _overrideIntensity = 0;
  _boundingSphere = { center: vec3.create(), radius: 0, initialized: false };

  @blue.readwrite
  @blue.persist
  @type.int32
  @type.enum("trinity.PostProcessEnums.Priority")
  priority = 2;

  @blue.readwrite
  @blue.persist
  @type.string
  name = "";

  @blue.readwrite
  @blue.persist
  @type.float32
  backgroundIntensity = 1;

  @blue.readwrite
  @blue.persist
  @type.float32
  intensity = 1;

  @blue.readwrite
  @blue.persist
  @type.float32
  reflectionIntensity = 1;

  @blue.readwrite
  @blue.persist
  @type.float32
  sunIntensity = 1;

  @blue.readwrite
  @blue.persist
  @type.color
  sunColor = vec4.fromValues(1, 1, 1, 1);

  @blue.read
  @blue.persist
  @type.list("IEveVolume")
  volumes = [];

  /** Carbon EveChildLightingOverride::RegisterComponents (cpp:47-50):
   * unconditional EveLightingOverride leaf self-registration. */
  @blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.EveLightingOverride, this);
    }
  }

  /**
   * Carbon EveChildLightingOverride::UnRegisterComponents (cpp:52-55):
   * removes the EveLightingOverride component. Reached from
   * EveEntity::UnRegister (EveEntity.cpp:81-94) after UnRegisterAllComponents
   * has already removed it, so there the removal finds nothing; Carbon does it
   * anyway.
   */
  @blue.method
  @meta.implemented
  UnRegisterComponents()
  {
    this.GetComponentRegistry().UnRegisterComponent(EveComponentType.EveLightingOverride, this);
  }

  /**
   * Returns this child's contribution to the lighting system: its priority, the
   * blend intensity resolved by the last async update, and the sun
   * colour/intensity plus background and reflection intensities to blend toward.
   */
  @blue.method
  @meta.implemented
  GetOverrides()
  {
    return {
      priority: this.priority,
      intensity: this._overrideIntensity,
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
  @blue.method
  GetName()
  {
    return this.name;
  }

  /** Sets the authored override name, coercing nullish to the empty string. */
  @blue.method
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /**
   * Copies the cached local-space bounding sphere into out and always reports success, even before any volume has contributed.
   * @param {Float32Array} [out] - caller-owned; receives (x, y, z, radius)
   * @returns {Boolean} always true
   */
  @blue.method
  @meta.adapted
  GetBoundingSphere(out = vec4.create())
  {
    vec4.set(out, this._boundingSphere.center[0], this._boundingSphere.center[1], this._boundingSphere.center[2], this._boundingSphere.radius);
    return true;
  }

  /** No-op: a lighting override carries no sync-side frame work. */
  @blue.method
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
  @blue.method
  @meta.adapted
  UpdateAsyncronous(updateContext, params = {})
  {
    this.UpdateTransform(params.localToWorldTransform ?? mat4.create());
    this._RebuildBoundingSphere();

    if (this.volumes.length === 0)
    {
      this._overrideIntensity = this.intensity;
      return;
    }

    this._overrideIntensity = 0;
    // EveChildLightingOverride.cpp:115-116.
    const viewPosition = Tr2Renderer.GetViewPosition();
    const inverse = mat4.invert(mat4.create(), this.worldTransform);
    if (!inverse || !this._boundingSphere.initialized) return;
    const localView = vec3.transformMat4(vec3.create(), viewPosition, inverse);
    if (vec3.distance(localView, this._boundingSphere.center) > this._boundingSphere.radius) return;

    for (const volume of this.volumes)
    {
      this._overrideIntensity = Math.max(this._overrideIntensity, Number(volume.GetIntensity(localView)) || 0);
      if (this._overrideIntensity >= 1) break;
    }
    this._overrideIntensity *= this.intensity;
  }

  /**
   * Copies the child's world transform, as rebuilt by the last async update.
   * @param {Float32Array} [out] - caller-owned; allocated when omitted
   * @returns {Float32Array} out
   */
  @blue.method
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

  /**
   * Returns true unconditionally - a lighting override reports itself as always
   * on.
   */
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
    this._RebuildBoundingSphere();
    return true;
  }

  /**
   * Carbon EveChildLightingOverride::GetDebugOptions (cpp:157-161).
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
   * Carbon EveChildLightingOverride::RenderDebugInfo (cpp:163-177): every
   * volume under the world transform with "Volumes", then the bounding sphere
   * placed at its centre under the world transform with "Bounding Sphere".
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
      const transform = mat4.translate(DEBUG_TRANSFORM, this.worldTransform, this._boundingSphere.center);
      renderer.DrawSphere__TransformRadius(
        Tr2DebugObjectReference.create__Object(this),
        transform,
        this._boundingSphere.radius,
        10,
        ITr2DebugRenderer2.Effect.Wireframe,
        Tr2DebugColor.create__Uint32(0xff333333));
    }
  }

  /** No-op: a lighting override is not renderable and keeps no visibility state. */
  @blue.method
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** No-op: a lighting override contributes settings, never renderables. */
  @blue.method
  GetRenderables(_renderables)
  {
  }

  /** No-op: a lighting override has no LOD levels. */
  @blue.method
  ChangeLOD(_lod)
  {
  }

  static Priority = Priority;

  /**
   * Recomputes the cached bounding sphere as the union of the child volumes'
   * spheres, skipping volumes with a missing centre or a non-finite/negative
   * radius, and records whether any volume contributed.
   */
  @blue.method
  _RebuildBoundingSphere()
  {
    const target = this._boundingSphere;
    vec3.set(target.center, 0, 0, 0);
    target.radius = 0;
    target.initialized = false;

    for (const volume of this.volumes)
    {
      const sphere = volume.GetBoundingSphere();
      if (!sphere?.center || !Number.isFinite(sphere.radius) || sphere.radius < 0) continue;
      if (!target.initialized)
      {
        vec3.copy(target.center, sphere.center);
        target.radius = sphere.radius;
        target.initialized = true;
        continue;
      }
      EveChildLightingOverride._UnionSphere(target, sphere);
    }
  }

  /**
   * Grows the target sphere in place so it also encloses the given sphere,
   * short-circuiting when either already contains the other and handling
   * coincident centres.
   */
  static _UnionSphere(target, sphere)
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

// EveChildLightingOverride_Blue.cpp: native exposure.
