// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier.h
// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier.cpp
// Source: trinity/trinity/Eve/SpaceObject/Children/EveModularObjectModifier_Blue.cpp
import { mat4 } from "#math/mat4";
import { quat } from "#math/quat";
import { vec3 } from "#math/vec3";
import { vec4 } from "#math/vec4";
import { CjsSchema, meta } from "#schema";
import { EveChildPartData, EveChildPartDataPartData } from "./child/EveChildPartData/index.js";
import { EveChildInstancedMeshes } from "./child/EveChildInstancedMeshes/index.js";
import { EveStation2 } from "./spaceObject/EveStation2.js";
import { Tr2Lod } from "./EveLODHelper.js";


/** Transient edit session for one modular EveSpaceObject2. */
@meta.define({ className: "EveModularObjectModifier", family: "eve" })
export class EveModularObjectModifier
{
  _object = null;

  _data = null;

  _instancedMeshes = null;

  _sof = null;

  _objectLoader = null;

  /** Serializes asynchronous hull/resource edits across sessions on one owner. */
  static _pendingEdits = new WeakMap();

  /** Opens an edit session and creates persistent part data when absent. */
  @meta.blue.method
  @meta.adapted
  Create(object, sof, objectLoader = null)
  {
    if (this._object && EveModularObjectModifier._pendingEdits.has(this._object))
    {
      throw new Error("Cannot replace a modular edit session while an edit is pending.");
    }
    this._object = object;
    this._sof = sof;
    this._objectLoader = objectLoader;
    this._data = object.effectChildren.find(child => child instanceof EveChildPartData) ?? null;
    if (!this._data)
    {
      this._data = new EveChildPartData();
      object.AddToEffectChildrenList(this._data);
    }
    this._instancedMeshes = object.effectChildren.find(
      child => child instanceof EveChildInstancedMeshes) ?? null;
    return this;
  }

  /**
   * Builds and attaches one SOF hull part, returning its unique part tag.
   * Adapted: async SOF acquisition requires serialization per owner so IDs
   * and composed graphs cannot be overwritten by concurrent edit sessions.
   */
  @meta.blue.method
  @meta.adapted
  async AddHull(hullName, factionName, raceName, position, rotation, scale)
  {
    // Preserve the call's transform while preceding edits or resources await.
    const savedPosition = Array.from(position);
    const savedRotation = Array.from(rotation);
    const savedScale = Array.from(scale);
    return this._QueueEdit(() => this._AddHull(hullName, factionName, raceName, savedPosition, savedRotation, savedScale));
  }

  /** Completes one serialized native hull edit after awaiting its SOF build. */
  @meta.adapted
  async _AddHull(hullName, factionName, raceName, position, rotation, scale)
  {
    this._AssertReady();
    const id = this._AllocatePartId();
    const dna = `${hullName}:${factionName || this._data.faction}:${raceName || this._data.race}`;
    const transform = mat4.fromRotationTranslationScale(mat4.create(), rotation, position, scale);
    if (!await this._sof.BuildChild(this._object, dna, id, transform))
    {
      return EveModularObjectModifier.INVALID_PART_TAG;
    }

    // Runtime SOF composes through GetValues/SetValues and may replace the
    // whole child list. Reacquire graph-owned records before mutating them.
    this._data = this._object.effectChildren.find(
      child => child instanceof EveChildPartData) ?? null;
    this._instancedMeshes = this._object.effectChildren.find(
      child => child instanceof EveChildInstancedMeshes) ?? null;

    const part = new EveChildPartDataPartData();
    part.partId = id;
    vec3.copy(part.position, position);
    quat.copy(part.rotation, rotation);
    vec3.copy(part.scale, scale);
    vec4.set(part.boundingSphere,
      this._object.boundingSphereCenter[0],
      this._object.boundingSphereCenter[1],
      this._object.boundingSphereCenter[2],
      this._object.boundingSphereRadius);
    this._data.parts.push(part);
    this._object.InvalidateMergedLocators("structure");
    this._UpdateImpactOverlayLocatorCount();
    this.ApplyBounds();
    return id;
  }

  /**
   * Loads and attaches one resource child, returning its unique part tag.
   * Adapted: promise-capable browser acquisition shares the owner's edit order.
   */
  @meta.blue.method
  @meta.adapted
  async AddChild(resourcePath, position, rotation, scale)
  {
    // Preserve the call's transform while preceding edits or resources await.
    const savedPosition = Array.from(position);
    const savedRotation = Array.from(rotation);
    const savedScale = Array.from(scale);
    return this._QueueEdit(() => this._AddChild(resourcePath, savedPosition, savedRotation, savedScale));
  }

  /** Completes one serialized child load before updating tags, records and bounds. */
  @meta.adapted
  async _AddChild(resourcePath, position, rotation, scale)
  {
    this._AssertReady();
    if (!this._objectLoader)
    {
      throw new Error("EveModularObjectModifier.AddChild requires a CjsEveChildResourceLoader.");
    }

    const child = await this._objectLoader.LoadChild(String(resourcePath), this._object);
    if (!child) return EveModularObjectModifier.INVALID_PART_TAG;

    child.Setup(scale, rotation, position, Tr2Lod.TR2_LOD_LOW);
    this._object.AddToEffectChildrenList(child);
    const id = this._AllocatePartId();
    child.SetPartTag(id);

    const part = new EveChildPartDataPartData();
    part.partId = id;
    vec3.copy(part.position, position);
    quat.copy(part.rotation, rotation);
    vec3.copy(part.scale, scale);
    this._data.parts.push(part);
    this._object.InvalidateMergedLocators("structure");
    this.ApplyBounds();
    return id;
  }

  /**
   * Serializes asynchronous edits without retaining rejected operations.
   * Custom: native edits cannot suspend, while JS must allocate a tag and
   * read the current owner only after preceding edits have finished.
   */
  @meta.ours
  _QueueEdit(edit)
  {
    this._AssertReady();
    const owner = this._object;
    const pending = EveModularObjectModifier._pendingEdits;
    const previous = pending.get(owner) ?? Promise.resolve();
    const operation = previous.then(() => edit());
    const settled = operation.then(() => undefined, () => undefined);
    pending.set(owner, settled);
    settled.then(() =>
    {
      if (pending.get(owner) === settled) pending.delete(owner);
    });
    return operation;
  }

  /** Removes a modular part and every child carrying its tag. */
  @meta.blue.method
  @meta.implemented
  Remove(partId)
  {
    const part = this._GetPart(partId);
    for (let index = this._object.effectChildren.length - 1; index >= 0; index--)
    {
      const child = this._object.effectChildren[index];
      if (child.GetPartTag() === part.partId) this._object.RemoveFromEffectChildrenList(child);
    }

    // A part's locators are owned by its child and merged by the object, so
    // removing the child removes them; Carbon stopped filtering the object's
    // sets by part tag in trinity 108ab454.
    if (this._instancedMeshes) this._instancedMeshes.RemoveInstancesByPartTag(part.partId);
    this._data.parts.splice(this._data.parts.indexOf(part), 1);
    this._object.InvalidateMergedLocators("structure");
    this._object.ClearImpactDamage();
    this._UpdateImpactOverlayLocatorCount();
    this.ApplyBounds();
    return true;
  }

  /** Replaces a modular part transform and updates its attached children. */
  @meta.blue.method
  @meta.adapted
  SetTransform(partId, position, rotation, scale)
  {
    const part = this._GetPart(partId);
    const oldTransform = mat4.fromRotationTranslationScale(
      mat4.create(), part.rotation, part.position, part.scale);
    const newTransform = mat4.fromRotationTranslationScale(
      mat4.create(), rotation, position, scale);
    const inverseOld = mat4.create();
    if (!mat4.invert(inverseOld, oldTransform))
    {
      throw new Error(`Modular part ${part.partId} has a singular transform.`);
    }

    // Part-owned locators follow their child's transform through the merge
    // (the PartMoved invalidation below); Carbon stopped moving them here in
    // trinity 108ab454.
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
    for (const child of this._object.effectChildren)
    {
      if (child.GetPartTag() === part.partId)
      {
        child.Setup(scale, rotation, position, Tr2Lod.TR2_LOD_LOW);
      }
      // OUTSIDE the partTag gate (Carbon EveModularObjectModifier.cpp:200-203,
      // PLAT-11963): the shared instanced child carries many parts' instances
      // under its own aggregate tag; the per-part filter lives in the method.
      if (child instanceof EveChildInstancedMeshes)
      {
        child.SetInstanceTransformByPartTag(part.partId, position, rotation, scale);
      }
    }
    this._object.InvalidateMergedLocators("partMoved");
    this.ApplyBounds();
    return true;
  }

  /** Recomputes culling bounds from the current modular part spheres. */
  @meta.blue.method
  @meta.adapted
  ApplyBounds()
  {
    this._AssertReady();
    const ordered = this._data.parts.slice().sort(
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
      vec3.set(this._object.shapeEllipsoidCenter, 0, 0, 0);
      vec3.set(this._object.shapeEllipsoidRadius, 0, 0, 0);
    }
    else
    {
      vec3.lerp(this._object.shapeEllipsoidCenter, min, max, 0.5);
      vec3.subtract(this._object.shapeEllipsoidRadius, max, min);
      vec3.scale(
        this._object.shapeEllipsoidRadius,
        this._object.shapeEllipsoidRadius,
        Math.sqrt(3) * 0.5);
    }
    this._object.SetBoundingSphereInformation(bounds);
    return bounds;
  }

  /** Copies a modular part's authored position. */
  @meta.blue.method
  @meta.implemented
  GetPosition(partId, out = vec3.create())
  {
    return vec3.copy(out, this._GetPart(partId).position);
  }

  /** Copies a modular part's authored rotation. */
  @meta.blue.method
  @meta.implemented
  GetRotation(partId, out = quat.create())
  {
    return quat.copy(out, this._GetPart(partId).rotation);
  }

  /** Copies a modular part's authored scale. */
  @meta.blue.method
  @meta.implemented
  GetScale(partId, out = vec3.create())
  {
    return vec3.copy(out, this._GetPart(partId).scale);
  }

  /** Throws until the modifier has an object, part data and SOF service. */
  _AssertReady()
  {
    // Another session's SOF composition can replace nested record identities.
    // Every read and mutation must use the owner's current graph.
    if (this._object)
    {
      this._data = this._object.effectChildren.find(child => CjsSchema.cast(child, EveChildPartData)) ?? null;
      this._instancedMeshes = this._object.effectChildren.find(child => CjsSchema.cast(child, EveChildInstancedMeshes)) ?? null;
    }
    if (!this._object || !this._data || !this._sof)
    {
      throw new Error("EveModularObjectModifier.Create must be called before editing.");
    }
  }

  /** Resolves a modular part by its unsigned part tag. */
  _GetPart(partId)
  {
    this._AssertReady();
    const id = Number(partId) >>> 0;
    const part = this._data.parts.find(candidate => candidate.partId === id);
    if (!part) throw new RangeError(`Unknown modular part tag ${id}.`);
    return part;
  }

  /** Finds an unused nonzero tag across recorded parts and attached children. */
  _AllocatePartId()
  {
    let id = this._data.GetUnusedPartID();
    for (const child of this._object.effectChildren)
    {
      const tag = child.GetPartTag();
      if (tag !== 0) id = Math.max(id, (tag + 1) >>> 0);
    }
    return id >>> 0;
  }

  /** Refreshes the owning impact overlay after the locator graph changes. */
  _UpdateImpactOverlayLocatorCount()
  {
    if (!this._object.impactOverlay) return;
    this._object.EnsureChildLocatorMerged();
    this._object.impactOverlay.SetDamageLocatorCount(this._object.GetDamageLocatorCount());
  }

  static INVALID_PART_TAG = 0xffffffff;
}


/** Creates an empty modular station after the injected SOF catalog is ready. */
export async function CreateModularObject(sof, factionName = "", raceName = "", objectLoader = null)
{
  await sof.InitializeAsync();
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
