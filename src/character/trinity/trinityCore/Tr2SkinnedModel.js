// Source: trinity/trinity/Tr2SkinnedModel.h
// Source: trinity/trinity/Tr2SkinnedModel.cpp
import { exposure as be } from "#be";
import { blue, IsMatch, IInitialize, INotify, IListNotify } from "#blue";
import { meta, type } from "#schema";
import { Tr2Model } from "./Tr2Model.js";
import { vec3 } from "#math/vec3";
import { mat4 } from "#math/mat4";
import { BLUELISTEVENT } from "#consts/blue";
import { Tr2PerAreaDataSkinned } from "./Tr2PerAreaDataSkinned.js";
import { TR2_MAX_BONES_PER_MESHAREA } from "./Tr2PerObjectDataSkinned.js";
import { Tr2RenderContext_GetMainThreadRenderContext } from "../../../trinity/core/context/Tr2RenderContext.js";
import { CreateLodAllocations } from "../../../trinity/core/mesh/TriGeometryResAllocations.js";

/** Carbon NO_SKELETON (Tr2SkinnedModel.cpp:10). */
const NO_SKELETON = 0xffffffff;

/** Carbon BoundingBoxInitialize's FLT_MAX (Utilities/BoundingBox.cpp:118-127). */
const FLT_MAX = 3.4028234663852886e38;

/**
 * Carbon's Tr2SkinnedModel (Tr2SkinnedModel.h:20-108): a model whose meshes are skinned to a named skeleton in its
 * geometry resource, and bound to an animation rig's bone list.
 *
 * Each batch owns its area's remapped palette through Tr2PerAreaDataSkinned.
 */
@be.define({
  name: "Tr2SkinnedModel",
  inherit: [ IInitialize, INotify, IListNotify ],
  // Tr2SkinnedModel_Blue.cpp:10-26, in Carbon's order.
  interfaces: [ IInitialize, INotify ],
  members: [
    [ be.ATTR, "geometryRes", be.READ ],
    [ be.ATTR_CHOOSER, "geometryResPath", be.READWRITE | be.NOTIFY | be.PERSIST, null ],
    [ be.ATTR, "skeletonName", be.READWRITE | be.NOTIFY | be.PERSIST ],
    [ be.ATTR, "skinScale", be.READWRITE | be.PERSIST ],
    [ be.METHOD, "ResetAnimationBindings", be.WRAP, "ResetBindings" ]
  ],
  chainTo: Tr2Model
})
export class Tr2SkinnedModel extends Tr2Model
{
  /** Identity fallback is consumed synchronously while building one area's palette. */
  static scratch = { mat4_0: mat4.create() };

  /**
   * Carbon GetBatches (h:36, cpp:107-137), preserving authored mesh traversal.
   *
   * @adapted no arena copy of the matrix is needed; the native helper never reads it.
   */
  GetBatches(batches, batchType, m, data)
  {
    if (this._destroyed) return;
    if (!this.geometryRes && this.geometryResPath) this.Initialize();
    if (this.geometryRes) this.geometryRes.IsGood(this);
    for (const mesh of this.meshes)
    {
      if (!mesh) continue;
      const areas = mesh.GetAreas(batchType);
      if (areas) this._GetBatchesForArea(areas, mesh, batches, m, data);
    }
  }

  /**
   * Carbon's private GetBatchesForArea (h:104, cpp:32-105).
   *
   * @adapted geometry allocation uses the existing lazy Trinity owner, as in
   *   Tr2Model; JS constructs area objects instead of leasing native arena memory.
   *   Each area's data also copies the skinned data's user data, as Carbon's
   *   objectId picking revision did (92483097^, Tr2SkinnedModel.cpp:75), which our
   *   objectId picking reads (Tr2RenderContext.eveSpacePickingFramework).
   */
  _GetBatchesForArea(areas, mesh, batches, _pm, skinnedData)
  {
    if (!mesh.GetDisplay()) return;
    const geometry = mesh.GetGeometryResource();
    if (!geometry || !geometry.IsGood()) return;
    const meshIndex = mesh.GetMeshIndex();
    const lod = geometry.GetMeshLod__LodIndex(meshIndex, 0);
    if (!lod || !CreateLodAllocations(geometry, meshIndex, lod, Tr2RenderContext_GetMainThreadRenderContext())) return;

    for (const area of areas)
    {
      if (!area.GetDisplay() || !area.GetMaterialInterface()) continue;
      const count = area.GetJointCount();
      if (count > TR2_MAX_BONES_PER_MESHAREA) continue;

      const areaData = new Tr2PerAreaDataSkinned();
      areaData.SetPickingPointer(skinnedData.GetPickingPointer());
      areaData.SetUserData(skinnedData.GetUserData());
      const mapping = area.GetJointMappingAnimRig();
      if (this._skeletonIx !== NO_SKELETON && mapping !== null)
      {
        areaData.SetJointCount(count);
        for (let joint = 0; joint < count; joint++)
        {
          areaData.SetJointTransform(joint, skinnedData.GetSkinningMatrix(mapping[joint]));
        }
      }
      else
      {
        areaData.SetJointCount(TR2_MAX_BONES_PER_MESHAREA);
        const { mat4_0 } = Tr2SkinnedModel.scratch;
        mat4.identity(mat4_0);
        // The first twelve identity lanes match the native packed identity.
        for (let joint = 0; joint < TR2_MAX_BONES_PER_MESHAREA; joint++) areaData.SetJointTransform(joint, mat4_0);
      }
      areaData.SetPerObjectData(skinnedData);
      const batch = mesh.CreateGeometryBatch(geometry, area, areaData, false, lod);
      if (batch) batches.Commit(batch);
    }
  }

  /** m_pBoneList: the bone list the meshes were last bound to. */
  _boneList = null;

  /** m_numBones */
  _numBones = 0;

  /** m_areAllMeshesBound */
  _areAllMeshesBound = false;

  /** m_skeletonIx: the index of skeletonName in the geometry resource, or NO_SKELETON. */
  _skeletonIx = NO_SKELETON;

  /** @cjs Prevents a destroyed model from reacquiring expired resources. */
  _destroyed = false;

  /** m_geometryResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @type.path("TriGeometryRes")
  geometryResPath = "";

  /**
   * m_geometryRes (TriGeometryResPtr) [READ]
   * Carbon: MAP_ATTRIBUTE (trinity/trinity/Tr2SkinnedModel_Blue.cpp:16).
   */
  @type.object.ref("TriGeometryRes")
  geometryRes = null;

  /** m_skeletonName (std::string) [READWRITE, NOTIFY, PERSIST] */


  @type.string
  skeletonName = "";

  /** m_skinScale (Vector3) [READWRITE, PERSIST] */

  @type.vec3
  skinScale = vec3.fromValues(1, 1, 1);

  /**
   * Carbon OnModified (Tr2SkinnedModel.cpp:226-238): a new geometry path or skeleton name re-initialises.
   *
   * @implemented
   */

  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "geometryResPath"))
    {
      this.Initialize();
    }
    else if (IsMatch(propertyName, "skeletonName"))
    {
      this.Initialize();
    }
    return true;
  }

  /**
   * Carbon Initialize (Tr2SkinnedModel.cpp:202-223): resets the skeleton and bindings, then acquires the geometry
   * resource, and RebuildCachedData selects the skeleton once it is prepared (at once when it already is).
   *
   * @adapted An expiring manager link replaces Carbon's native resource notify
   *   target, and the held geometry is dropped before the empty-path test.
   * @returns {boolean} true
   */

  @meta.invalidates("_areAllMeshesBound")
  Initialize()
  {
    this._skeletonIx = NO_SKELETON;
    this._areAllMeshesBound = false;
    if (this.geometryRes)
    {
      blue.resMan.notify.Remove(this, this.geometryRes);
      this.geometryRes = null;
    }
    if (!this.geometryResPath)
    {
      return true;
    }
    this.geometryRes = blue.resMan.GetResource(this.geometryResPath);
    // Rebuilds at once when the geometry is already prepared.
    if (this.geometryRes) blue.resMan.notify.Add(this, this.geometryRes, this, "geometryRes");
    return true;
  }

  /**
   * Carbon OnListModified (Tr2SkinnedModel.cpp:276-283): an inserted mesh triggers rebinding.
   * Carbon declaration: Tr2SkinnedModel::OnListModified (trinity/trinity/Tr2SkinnedModel.h:60).
   *
   * @implemented
   */
  @meta.invalidates("_areAllMeshesBound")
  OnListModified(event)
  {
    if (event === BLUELISTEVENT.BELIST_INSERTED)
    {
      // Trigger rebinding of meshes
      this._areAllMeshesBound = false;
    }
  }

  /**
   * Carbon ReleaseCachedData (Tr2SkinnedModel.cpp:240-243): forgets the selected skeleton.
   *
   * @implemented
   */

  ReleaseCachedData(_resource = null)
  {
    this._skeletonIx = NO_SKELETON;
  }

  /**
   * Lets go of an expired geometry: the selected skeleton, then the reference.
   * @cjs Carbon never expires a resource, so it has no such callback. resMan calls
   *   this when the link expires, and use reinitializes from geometryResPath.
   * @param {TriGeometryRes} resource The expired geometry.
   * @returns {void}
   */
  RemoveCachedData(resource)
  {
    this.ReleaseCachedData(resource);
    if (this.geometryRes === resource) this.geometryRes = null;
    // The link goes with the data, so a holder releases a resource in one place (Destruct and expiry alike).
    blue.resMan.notify.Remove(this, resource);
  }

  /**
   * Releases the selected skeleton before removing the geometry notification link.
   * Carbon: trinity/trinity/Tr2SkinnedModel.cpp:23-30.
   * @adapted Manager-owned links replace Carbon's per-resource notify targets.
   * @returns {void}
   * @adapted Preserves the prior explicit Destruct fences and cached-slot clearing; graph dispatch owns base cleanup.
   */
  _Destructor()
  {
    this._destroyed = true;
    // Carbon ~Tr2SkinnedModel (Tr2SkinnedModel.cpp:23-30): ReleaseCachedData( m_geometryRes ), then
    // RemoveNotifyTarget. With no geometry, RemoveCachedData(null) still releases, as Carbon does.
    this.RemoveCachedData(this.geometryRes);
  }

  /**
   * Carbon RebuildCachedData (Tr2SkinnedModel.cpp:245-262): selects the first skeleton named skeletonName.
   *
   * @implemented
   * @param {TriGeometryRes|null} [_resource] - the notifying resource; the model reads its own geometryRes
   */

  RebuildCachedData(_resource = null)
  {
    this._skeletonIx = NO_SKELETON;
    if (this.geometryRes)
    {
      const n = this.geometryRes.GetSkeletonCount();
      for (let i = 0; i < n; ++i)
      {
        const skel = this.geometryRes.GetSkeletonData(i);
        if (skel.name === this.skeletonName)
        {
          this._skeletonIx = i;
          break;
        }
      }
    }
  }

  /**
   * Carbon GetSkeleton (Tr2SkinnedModel.cpp:264-272).
   *
   * @implemented
   * @returns {object|null} the selected payload skeleton, or null when none is selected
   */

  GetSkeleton()
  {
    if (this._destroyed) return null;
    if (!this.geometryRes && this.geometryResPath) this.Initialize();
    if (this.geometryRes && !this.geometryRes.IsGood(this)) return null;
    if (this._skeletonIx === NO_SKELETON)
    {
      return null;
    }

    return this.geometryRes.GetSkeletonData(this._skeletonIx);
  }

  /**
   * Carbon BindToRig (Tr2SkinnedModel.cpp:159-195): binds every mesh to boneList against the selected skeleton,
   * once per bone list unless forced or a mesh was not yet bound.
   *
   * @implemented
   * @param {string[]|null} boneList - the animation rig's bone names; null clears the binding
   * @param {number} numBones
   * @param {boolean} forceRebind
   */

  BindToRig(boneList, numBones, forceRebind)
  {
    if (this._destroyed) return;
    if (!this.geometryRes && this.geometryResPath) this.Initialize();
    if (this.geometryRes && !this.geometryRes.IsGood(this)) return;
    if (!forceRebind && boneList === this._boneList && this._areAllMeshesBound)
    {
      return;
    }

    if (this._skeletonIx === NO_SKELETON)
    {
      return;
    }

    if (!boneList)
    {
      this._boneList = null;
      this._areAllMeshesBound = false;
      return;
    }

    const skel = this.geometryRes.GetSkeletonData(this._skeletonIx);

    forceRebind ||= !this._areAllMeshesBound; // if a reset was requested, make sure every mesh honors that
    this._areAllMeshesBound = true;
    for (const mesh of this.meshes)
    {
      if (!mesh.BindToRig(boneList, numBones, skel, forceRebind))
      {
        this._areAllMeshesBound = false;
      }
    }

    this._boneList = boneList;
    this._numBones = numBones;
  }

  /**
   * Carbon ResetBindings (Tr2SkinnedModel.cpp:197-200).
   *
   * @implemented
   */
  ResetBindings()
  {
    this._areAllMeshesBound = false;
  }

  /**
   * Carbon method ResetAnimationBindings -> ResetBindings (MAP_METHOD_AND_WRAP).
   *
   * @implemented
   * @renamed ResetBindings
   */
  ResetAnimationBindings()
  {
    this.ResetBindings();
  }

  /**
   * Carbon SetGeometryResPath (Tr2SkinnedModel.h:72-75): sets the path without re-initialising.
   *
   * @implemented
   */

  SetGeometryResPath(path)
  {
    this.geometryResPath = path;
  }

  /**
   * Carbon GetGeometryResPath (Tr2SkinnedModel.h:76-79).
   *
   * @implemented
   */

  GetGeometryResPath()
  {
    return this.geometryResPath;
  }

  /**
   * Carbon SetSkeletonName (Tr2SkinnedModel.h:80-83): sets the name without re-initialising.
   *
   * @implemented
   */

  SetSkeletonName(name)
  {
    this.skeletonName = name;
  }

  /**
   * Carbon GetDynamicBoundingBox (Tr2SkinnedModel.cpp:285-299): the union of every mesh's skinned bounds under the
   * bone transforms.
   *
   * @implemented
   * @param {mat4[]} boneTransforms - the animation's bone transforms
   * @param {vec3} minBounds - receives the minimum
   * @param {vec3} maxBounds - receives the maximum
   * @returns {boolean} false when the model has no meshes
   */

  GetDynamicBoundingBox(boneTransforms, minBounds, maxBounds)
  {
    if (!this.meshes.length)
    {
      return false;
    }

    vec3.set(minBounds, FLT_MAX, FLT_MAX, FLT_MAX);
    vec3.set(maxBounds, -FLT_MAX, -FLT_MAX, -FLT_MAX);

    for (const mesh of this.meshes)
    {
      const aabb = mesh.GetBounds(boneTransforms);
      if (aabb)
      {
        vec3.min(minBounds, minBounds, aabb.min);
        vec3.max(maxBounds, maxBounds, aabb.max);
      }
    }
    return true;
  }


}

