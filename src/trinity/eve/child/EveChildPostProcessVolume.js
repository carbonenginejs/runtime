import { IInitialize } from "../../../global/blue/IInitialize.js";
import { IEveSpaceObjectChild } from "./IEveSpaceObjectChild.js";
import { EveSpaceObjectChild } from "./EveSpaceObjectChild.js";
import { EveEntity } from "../EveEntity.js";
// Source: trinity/trinity/Eve/SpaceObject/Children/EveChildPostProcessVolume.h
// Hand-maintained from Carbon source, promoted out of generated intake.
import { meta } from "#schema";
import { EveChildTransform } from "./EveChildTransform.js";
import { mat4 } from "#math/mat4";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { Tr2PostProcessAttributes } from "../../postProcess/Tr2PostProcessAttributes.js";
import { EveComponentType } from "../EveComponentTypes.js";

/** A child that unions a set of inclusion and exclusion volumes into a bounding sphere and drives a post-process effect's intensity from the camera's position relative to them. */
@meta.define({ className: "EveChildPostProcessVolume", family: "eve/child" })
@meta.blue.inherit(IInitialize)
export class EveChildPostProcessVolume extends EveChildTransform
{

  /** m_volumes (PIEveVolumeVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveVolume")
  volumes = [];

  /** m_exclusionVolumes (PIEveVolumeVector) [READ, PERSIST] */
  @meta.blue.read
  @meta.blue.persist
  @meta.type.list("IEveVolume")
  exclusionVolumes = [];

  /** m_boundingSphere.center (CcpMath::Sphere) [READ] */
  @meta.blue.read
  @meta.type.rawStruct("CcpMath::Sphere")
  boundingSphereCenter = null;

  /** m_boundingSphere.radius (CcpMath::Sphere) [READ] */
  @meta.blue.read
  @meta.type.rawStruct("CcpMath::Sphere")
  boundingSphereRadius = null;

  /** m_name (BlueSharedString) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  name = "";

  /** m_postProcessAttributes (Tr2PostProcessAttributesPtr) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.model("Tr2PostProcessAttributes")
  postProcessAttributes = null;

  // m_boundingSphere (CcpMath::Sphere) working state as a packed vec4; the
  // Carbon constructor initializes it to center (0,0,0), radius 0
  // (EveChildPostProcessVolume.cpp:11-18). The read-only mirror fields above
  // are refreshed after every rebuild.
  _boundingSphere = vec4.create();

  /**
   * Unions the volumes' bounding spheres into the object-space bound
   * (EveChildPostProcessVolume.cpp:24-60). The zeroed start sphere stays
   * "initialized" per CcpMath::Sphere semantics (radius >= 0,
   * Sphere_inline.h:33-36), so the result always includes the local origin -
   * matching Carbon exactly.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Volume bounding spheres arrive as duck-typed { center, radius } records rather than CcpMath::Sphere values.")
  RebuildBoundingSphere()
  {
    const sphere = this._boundingSphere;
    vec4.set(sphere, 0, 0, 0, 0);
    for (const volume of this.volumes)
    {
      const volumeSphere = volume.GetBoundingSphere();
      const center = volumeSphere?.center;
      const radius = Number(volumeSphere?.radius);
      if (!center || !(radius >= 0))
      {
        // Sphere::IsInitialized is radius >= 0 (Sphere_inline.h:33-36).
        continue;
      }
      const dx = center[0] - sphere[0];
      const dy = center[1] - sphere[1];
      const dz = center[2] - sphere[2];
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (radius >= sphere[3] && distanceSq <= (radius - sphere[3]) * (radius - sphere[3]))
      {
        // volumeSphere.IsSphereInside(m_boundingSphere) - copy it (cpp:42-46).
        vec4.set(sphere, center[0], center[1], center[2], radius);
        continue;
      }
      if (sphere[3] >= radius && distanceSq <= (sphere[3] - radius) * (sphere[3] - radius))
      {
        // m_boundingSphere.IsSphereInside(volumeSphere) - no update (cpp:48-51).
        continue;
      }
      // Extend the sphere (cpp:54-58). The contains checks above exclude the
      // coincident-center case, so deltaLen > 0 here, as in Carbon.
      const deltaLen = Math.sqrt(distanceSq);
      const centerScale = 0.5 * (1 + (radius - sphere[3]) / deltaLen);
      sphere[0] += centerScale * dx;
      sphere[1] += centerScale * dy;
      sphere[2] += centerScale * dz;
      sphere[3] = 0.5 * (sphere[3] + radius + deltaLen);
    }
    this._MirrorBoundingSphere();
  }

  @meta.blue.method
  @meta.implemented
  /**
   * The volume's name.
   */
  GetName()
  {
    return this.name;
  }

  @meta.blue.method
  @meta.implemented
  /**
   * Sets the volume's name, coercing the value to a string.
   */
  SetName(name)
  {
    this.name = String(name ?? "");
  }

  /** Carbon's visibility pass is empty (EveChildPostProcessVolume.cpp:84-86). */
  @meta.blue.method
  @meta.noop
  UpdateVisibility(_updateContext, _parentTransform, _parentLod)
  {
  }

  /** Post-process volumes publish no renderables (EveChildPostProcessVolume.h:40). */
  @meta.blue.method
  @meta.noop
  GetRenderables(renderables = [])
  {
    return renderables;
  }

  /** Copies the object-space bound (EveChildPostProcessVolume.cpp:88-94). */
  @meta.blue.method
  @meta.implemented
  GetBoundingSphere(out = vec4.create(), _query = 0)
  {
    vec4.copy(out, this._boundingSphere);
    return true;
  }

  /** Carbon's synchronous pass is empty (EveChildPostProcessVolume.cpp:96-98). */
  @meta.blue.method
  @meta.noop
  UpdateSyncronous(_updateContext, _params)
  {
  }

  /**
   * Per-frame async update (EveChildPostProcessVolume.cpp:100-151): refresh
   * the transform and bound, then resolve the post-process intensity from the
   * camera position against the inclusion and exclusion volumes.
   */
  @meta.blue.method
  @meta.blue.contextual(["camera"])
  @meta.adapted
  @meta.reason("Carbon reads the Tr2Renderer view-position global; the relocated camera state arrives via the threaded render context.")
  UpdateAsyncronous(updateContext, params)
  {
    this._UpdateTransformFromParent(params);
    this.RebuildBoundingSphere();
    const attributes = this._EnsureAttributes();

    // Global postprocess volumes have no volumes, so they are always on
    // (cpp:108-112).
    if (this.volumes.length === 0)
    {
      attributes.intensity = 1;
      return;
    }

    attributes.intensity = 0;
    const viewPosition = updateContext?.renderContext?.GetViewPosition();
    if (!viewPosition)
    {
      return;
    }
    if (!mat4.invert(EveChildPostProcessVolume._inverseWorld, this.worldTransform))
    {
      // JS-only guard: Carbon inverts unconditionally; a singular world
      // transform keeps the volume off for the frame.
      return;
    }
    const cameraInObjectSpace = vec3.transformMat4(EveChildPostProcessVolume._cameraInObjectSpace, viewPosition, EveChildPostProcessVolume._inverseWorld);

    // Sphere::IsPointInside with radiusEpsilon 1e-4 (Sphere_inline.h:107-117).
    const sphere = this._boundingSphere;
    const dx = cameraInObjectSpace[0] - sphere[0];
    const dy = cameraInObjectSpace[1] - sphere[1];
    const dz = cameraInObjectSpace[2] - sphere[2];
    if (!(sphere[3] >= 0) || dx * dx + dy * dy + dz * dz > sphere[3] * sphere[3] + 1e-4)
    {
      return;
    }

    // Find the intensity within the volumes (cpp:123-132).
    for (const volume of this.volumes)
    {
      attributes.intensity = Math.max(attributes.intensity, Number(volume.GetIntensity(cameraInObjectSpace)) || 0);
      if (attributes.intensity === 1)
      {
        break;
      }
    }

    if (attributes.intensity !== 0)
    {
      // Subtract the exclusion volumes' intensity (cpp:134-148).
      let negativeIntensity = 0;
      for (const volume of this.exclusionVolumes)
      {
        negativeIntensity = Math.max(negativeIntensity, Number(volume.GetIntensity(cameraInObjectSpace)) || 0);
        if (negativeIntensity === 1)
        {
          break;
        }
      }
      attributes.intensity = Math.max(0, attributes.intensity - negativeIntensity);
    }
  }

  /** Carbon's implementation is empty (EveChildPostProcessVolume.cpp:160-162). */
  @meta.blue.method
  @meta.noop
  GetLocalToWorldTransform(_out = null)
  {
  }

  /** Forwards to the base transform setup (EveChildPostProcessVolume.cpp:164-168). */
  @meta.blue.method
  @meta.implemented
  Setup(scale = null, rotation = null, translation = null, lowestLodVisible = null)
  {
    return super.Setup(scale, rotation, translation, lowestLodVisible);
  }

  @meta.blue.method
  @meta.implemented
  /**
   * Always true: the volume stays active regardless of where the camera is.
   */
  IsAlwaysOn()
  {
    return true;
  }

  /** Builds the initial bound (EveChildPostProcessVolume.cpp:177-181). */
  @meta.blue.method
  @meta.adapted
  @meta.reason("The Carbon constructor's attribute-instance creation (cpp:11-18) is deferred to first use because the generated field default stays null.")
  Initialize()
  {
    this._EnsureAttributes();
    this.RebuildBoundingSphere();
    return true;
  }

  /** Carbon EveChildPostProcessVolume::RegisterComponents (cpp:62-65):
   * unconditional PostProcessOwner leaf self-registration. Carbon's
   * UnRegisterComponents (cpp:67-70) only removes this same component, which
   * EveEntity::UnRegister already did via UnRegisterAllComponents
   * (EveEntity.cpp:90), so the JS un-side keeps the base no-op. */
  @meta.blue.method
  @meta.implemented
  RegisterComponents()
  {
    const registry = this.GetComponentRegistry();
    if (registry)
    {
      registry.RegisterComponent(EveComponentType.PostProcessOwner, this);
    }
  }

  /** Returns the owned attribute record (EveChildPostProcessVolume.cpp:217-220). */
  @meta.blue.method
  @meta.implemented
  GetPostProcessAttributes()
  {
    return this._EnsureAttributes();
  }

  /** Rebuilds the world transform from the parent (EveChildPostProcessVolume.cpp:153-158). */
  _UpdateTransformFromParent(params)
  {
    const parentTransform = params?.localToWorldTransform;
    if (parentTransform && parentTransform.length === 16)
    {
      this.UpdateTransform(parentTransform);
    }
  }

  /**
   * Lazily creates the attribute record the Carbon constructor allocates with
   * zero intensity (EveChildPostProcessVolume.cpp:11-18).
   */
  _EnsureAttributes()
  {
    if (!this.postProcessAttributes)
    {
      this.postProcessAttributes = new Tr2PostProcessAttributes();
      this.postProcessAttributes.intensity = 0;
    }
    return this.postProcessAttributes;
  }

  /** Refreshes the schema's read-only center/radius mirrors from the packed bound. */
  _MirrorBoundingSphere()
  {
    if (!this.boundingSphereCenter)
    {
      this.boundingSphereCenter = vec3.create();
    }
    vec3.set(this.boundingSphereCenter, this._boundingSphere[0], this._boundingSphere[1], this._boundingSphere[2]);
    this.boundingSphereRadius = this._boundingSphere[3];
  }

  static _inverseWorld = mat4.create();

  static _cameraInObjectSpace = vec3.create();

}

// EveChildPostProcessVolume_Blue.cpp: native exposure; unported contracts: ITr2PostProcessOwner.
meta.blue.interfaceTable({ interfaces: [EveEntity, EveSpaceObjectChild, IEveSpaceObjectChild, IInitialize], chainTo: null })(EveChildPostProcessVolume, { kind: "class" });
