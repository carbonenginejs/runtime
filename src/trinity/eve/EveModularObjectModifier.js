// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsModel } from "#model";
import { carbon, impl, type } from "#schema";
import { EveChildPartData, EveChildPartDataPartData } from "./child/EveChildPartData.js";
import { EveChildInstancedMeshes } from "./child/EveChildInstancedMeshes.js";
import { EveStation2 } from "./spaceObject/EveStation2.js";
import { Tr2Lod } from "./EveLODHelper.js";


/** Transient edit session for one modular EveSpaceObject2. */
@type.define({ className: "EveModularObjectModifier", family: "eve" })
export class EveModularObjectModifier extends CjsModel
{
  #object = null;

  #data = null;

  #instancedMeshes = null;

  #sof = null;

  #objectLoader = null;

  /** Opens an edit session and creates persistent part data when absent. */
  @carbon.method
  @impl.adapted
  Create(object, sof, objectLoader = null)
  {
    this.#object = object;
    this.#sof = sof;
    this.#objectLoader = objectLoader;
    this.#data = object.effectChildren.find(child => child instanceof EveChildPartData) ?? null;
    if (!this.#data)
    {
      this.#data = new EveChildPartData();
      object.AddToEffectChildrenList(this.#data);
    }
    this.#instancedMeshes = object.effectChildren.find(
      child => child instanceof EveChildInstancedMeshes) ?? null;
    return this;
  }

  /** Builds and attaches one SOF hull part, returning its unique part tag. */
  @carbon.method
  @impl.implemented
  AddHull(hullName, factionName, raceName, position, rotation, scale)
  {
    this.#AssertReady();
    const id = this.#AllocatePartId();
    const dna = `${hullName}:${factionName || this.#data.faction}:${raceName || this.#data.race}`;
    const transform = mat4.fromRotationTranslationScale(mat4.create(), rotation, position, scale);
    if (!this.#sof.BuildChild(this.#object, dna, id, transform))
    {
      return EveModularObjectModifier.INVALID_PART_TAG;
    }

    // Runtime SOF composes through GetValues/SetValues and may replace the
    // whole child list. Reacquire graph-owned records before mutating them.
    this.#data = this.#object.effectChildren.find(
      child => child instanceof EveChildPartData) ?? null;
    this.#instancedMeshes = this.#object.effectChildren.find(
      child => child instanceof EveChildInstancedMeshes) ?? null;

    const part = new EveChildPartDataPartData();
    part.partId = id;
    vec3.copy(part.position, position);
    quat.copy(part.rotation, rotation);
    vec3.copy(part.scale, scale);
    vec4.set(part.boundingSphere,
      this.#object.boundingSphereCenter[0],
      this.#object.boundingSphereCenter[1],
      this.#object.boundingSphereCenter[2],
      this.#object.boundingSphereRadius);
    this.#data.parts.push(part);
    this.#object.InvalidateMergedLocators("structure");
    this.#UpdateImpactOverlayLocatorCount();
    this.ApplyBounds();
    return id;
  }

  /** Loads and attaches one resource child, returning its unique part tag. */
  @carbon.method
  @impl.adapted
  AddChild(resourcePath, position, rotation, scale)
  {
    this.#AssertReady();
    if (!this.#objectLoader)
    {
      throw new Error("EveModularObjectModifier.AddChild requires a CjsEveChildResourceLoader.");
    }

    const child = this.#objectLoader.LoadChild(String(resourcePath), this.#object);
    if (!child) return EveModularObjectModifier.INVALID_PART_TAG;

    child.Setup(scale, rotation, position, Tr2Lod.TR2_LOD_LOW);
    this.#object.AddToEffectChildrenList(child);
    const id = this.#AllocatePartId();
    child.SetPartTag(id);

    const part = new EveChildPartDataPartData();
    part.partId = id;
    vec3.copy(part.position, position);
    quat.copy(part.rotation, rotation);
    vec3.copy(part.scale, scale);
    this.#data.parts.push(part);
    this.#object.InvalidateMergedLocators("structure");
    this.ApplyBounds();
    return id;
  }

  /** Removes a modular part and every child carrying its tag. */
  @carbon.method
  @impl.implemented
  Remove(partId)
  {
    const part = this.#GetPart(partId);
    for (let index = this.#object.effectChildren.length - 1; index >= 0; index--)
    {
      const child = this.#object.effectChildren[index];
      if (child.GetPartTag() === part.partId) this.#object.RemoveFromEffectChildrenList(child);
    }

    for (const set of this.#object.locatorSets)
    {
      set.locators = set.locators.filter(locator => locator.partTag !== part.partId);
    }
    if (this.#instancedMeshes) this.#instancedMeshes.RemoveInstancesByPartTag(part.partId);
    this.#data.parts.splice(this.#data.parts.indexOf(part), 1);
    this.#object.InvalidateMergedLocators("structure");
    this.#object.ClearImpactDamage();
    this.#UpdateImpactOverlayLocatorCount();
    this.ApplyBounds();
    return true;
  }

  /** Replaces a modular part transform and updates its attached children. */
  @carbon.method
  @impl.adapted
  SetTransform(partId, position, rotation, scale)
  {
    const part = this.#GetPart(partId);
    const oldTransform = mat4.fromRotationTranslationScale(
      mat4.create(), part.rotation, part.position, part.scale);
    const newTransform = mat4.fromRotationTranslationScale(
      mat4.create(), rotation, position, scale);
    const inverseOld = mat4.create();
    if (!mat4.invert(inverseOld, oldTransform))
    {
      throw new Error(`Modular part ${part.partId} has a singular transform.`);
    }

    const inverseOldRotation = quat.invert(quat.create(), part.rotation);
    for (const set of this.#object.locatorSets)
    {
      for (const locator of set.locators)
      {
        if (locator.partTag !== part.partId) continue;
        locator.scale[0] = scale[0] / part.scale[0];
        locator.scale[1] = scale[1] / part.scale[1];
        locator.scale[2] = scale[2] / part.scale[2];
        // Carbon invOld.rotation * newRotation (row-vector composition) maps
        // to reversed gl-matrix quaternion operands.
        quat.multiply(locator.direction, rotation, inverseOldRotation);
        vec3.transformMat4(locator.position, locator.position, inverseOld);
        vec3.transformMat4(locator.position, locator.position, newTransform);
      }
    }

    const center = vec3.fromValues(
      part.boundingSphere[0], part.boundingSphere[1], part.boundingSphere[2]);
    vec3.transformMat4(center, center, inverseOld);
    vec3.transformMat4(center, center, newTransform);
    vec3.copy(part.boundingSphere, center);
    part.boundingSphere[3] *= Math.max(scale[0], scale[1], scale[2]) /
      Math.max(part.scale[0], part.scale[1], part.scale[2]);

    vec3.copy(part.position, position);
    quat.copy(part.rotation, rotation);
    vec3.copy(part.scale, scale);
    for (const child of this.#object.effectChildren)
    {
      if (child.GetPartTag() === part.partId)
      {
        child.Setup(scale, rotation, position, Tr2Lod.TR2_LOD_LOW);
      }
      // OUTSIDE the partTag gate (Carbon EveModularObjectModifier.cpp:225-228,
      // PLAT-11963): the shared instanced child carries many parts' instances
      // under its own aggregate tag; the per-part filter lives in the method.
      if (child instanceof EveChildInstancedMeshes)
      {
        child.SetInstanceTransformByPartTag(part.partId, position, rotation, scale);
      }
    }
    this.#object.InvalidateMergedLocators("partMoved");
    this.ApplyBounds();
    return true;
  }

  /** Recomputes culling bounds from the current modular part spheres. */
  @carbon.method
  @impl.adapted
  ApplyBounds()
  {
    this.#AssertReady();
    const ordered = this.#data.parts.slice().sort(
      (left, right) => right.boundingSphere[3] - left.boundingSphere[3]);
    const bounds = vec4.create();
    const min = vec3.fromValues(Infinity, Infinity, Infinity);
    const max = vec3.fromValues(-Infinity, -Infinity, -Infinity);
    let hasBounds = false;

    for (const part of ordered)
    {
      includeSphere(bounds, part.boundingSphere, hasBounds);
      hasBounds = true;
      for (let axis = 0; axis < 3; axis++)
      {
        min[axis] = Math.min(min[axis], part.boundingSphere[axis] - part.boundingSphere[3]);
        max[axis] = Math.max(max[axis], part.boundingSphere[axis] + part.boundingSphere[3]);
      }
    }

    if (!hasBounds)
    {
      vec4.set(bounds, 0, 0, 0, 0);
      vec3.set(this.#object.shapeEllipsoidCenter, 0, 0, 0);
      vec3.set(this.#object.shapeEllipsoidRadius, 0, 0, 0);
    }
    else
    {
      vec3.lerp(this.#object.shapeEllipsoidCenter, min, max, 0.5);
      vec3.subtract(this.#object.shapeEllipsoidRadius, max, min);
      vec3.scale(
        this.#object.shapeEllipsoidRadius,
        this.#object.shapeEllipsoidRadius,
        Math.sqrt(3) * 0.5);
    }
    this.#object.SetBoundingSphereInformation(bounds);
    return bounds;
  }

  /** Copies a modular part's authored position. */
  @carbon.method
  @impl.implemented
  GetPosition(partId, out = vec3.create())
  {
    return vec3.copy(out, this.#GetPart(partId).position);
  }

  /** Copies a modular part's authored rotation. */
  @carbon.method
  @impl.implemented
  GetRotation(partId, out = quat.create())
  {
    return quat.copy(out, this.#GetPart(partId).rotation);
  }

  /** Copies a modular part's authored scale. */
  @carbon.method
  @impl.implemented
  GetScale(partId, out = vec3.create())
  {
    return vec3.copy(out, this.#GetPart(partId).scale);
  }

  /** Throws until the modifier has an object, part data and SOF service. */
  #AssertReady()
  {
    if (!this.#object || !this.#data || !this.#sof)
    {
      throw new Error("EveModularObjectModifier.Create must be called before editing.");
    }
  }

  /** Resolves a modular part by its unsigned part tag. */
  #GetPart(partId)
  {
    this.#AssertReady();
    const id = Number(partId) >>> 0;
    const part = this.#data.parts.find(candidate => candidate.partId === id);
    if (!part) throw new RangeError(`Unknown modular part tag ${id}.`);
    return part;
  }

  /** Finds an unused nonzero tag across recorded parts and attached children. */
  #AllocatePartId()
  {
    let id = this.#data.GetUnusedPartID();
    for (const child of this.#object.effectChildren)
    {
      const tag = child.GetPartTag();
      if (tag !== 0) id = Math.max(id, (tag + 1) >>> 0);
    }
    return id >>> 0;
  }

  /** Refreshes the owning impact overlay after the locator graph changes. */
  #UpdateImpactOverlayLocatorCount()
  {
    if (!this.#object.impactOverlay) return;
    this.#object.EnsureChildLocatorMerged();
    this.#object.impactOverlay.SetDamageLocatorCount(this.#object.GetDamageLocatorCount());
  }

  static INVALID_PART_TAG = 0xffffffff;
}


/** Creates an empty modular station plus its edit session. */
export function CreateModularObject(sof, factionName = "", raceName = "", objectLoader = null)
{
  const object = new EveStation2();
  const data = new EveChildPartData();
  data.faction = String(factionName);
  data.race = String(raceName);
  object.AddToEffectChildrenList(data);
  object.Initialize();
  return [ object, new EveModularObjectModifier().Create(object, sof, objectLoader) ];
}


/** Opens a modular edit session on an existing object. */
export function ModifyModularObject(object, sof, objectLoader = null)
{
  return new EveModularObjectModifier().Create(object, sof, objectLoader);
}


/** Returns Carbon's reserved invalid modular-part tag. */
export function GetInvalidPartTag()
{
  return EveModularObjectModifier.INVALID_PART_TAG;
}


function includeSphere(out, sphere, initialized)
{
  if (!initialized)
  {
    vec4.copy(out, sphere);
    return;
  }

  const dx = sphere[0] - out[0];
  const dy = sphere[1] - out[1];
  const dz = sphere[2] - out[2];
  const distance = Math.hypot(dx, dy, dz);
  if (out[3] >= distance + sphere[3]) return;
  if (sphere[3] >= distance + out[3])
  {
    vec4.copy(out, sphere);
    return;
  }

  const radius = (distance + out[3] + sphere[3]) * 0.5;
  const shift = distance ? (radius - out[3]) / distance : 0;
  out[0] += dx * shift;
  out[1] += dy * shift;
  out[2] += dz * shift;
  out[3] = radius;
}
