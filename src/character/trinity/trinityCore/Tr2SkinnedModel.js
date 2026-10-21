// Source: trinity/trinity/Tr2SkinnedModel.h
// Source: trinity/trinity/Tr2SkinnedModel.cpp
import { blue as be, IsMatch, IInitialize, INotify, IListNotify, ResourceRequirement } from "#blue";
import { meta, type, blue } from "#schema";
import { Tr2Model } from "./Tr2Model.js";
import { vec3 } from "#math/vec3";
import { BLUELISTEVENT } from "#consts/blue";

/** Carbon NO_SKELETON (Tr2SkinnedModel.cpp:10). */
const NO_SKELETON = 0xffffffff;

/** Carbon BoundingBoxInitialize's FLT_MAX (Utilities/BoundingBox.cpp:118-127). */
const FLT_MAX = 3.4028234663852886e38;

/**
 * Carbon's Tr2SkinnedModel (Tr2SkinnedModel.h:20-108): a model whose meshes are skinned to a named skeleton in its
 * geometry resource, and bound to an animation rig's bone list.
 *
 * Not ported: GetBatches and GetBatchesForArea (cpp:32-139), which need Carbon's Tr2PerObjectDataSkinned and
 * Tr2PerAreaDataSkinned (see the character README); until then Tr2Model's batches are used.
 */
@blue.define("Tr2SkinnedModel")
@blue.inherit(IInitialize, INotify, IListNotify)
@blue.interface(IInitialize, INotify)
@blue.chainTo(Tr2Model)
export class Tr2SkinnedModel extends Tr2Model
{

  /** m_pBoneList: the bone list the meshes were last bound to. */
  _boneList = null;

  /** m_numBones */
  _numBones = 0;

  /** m_areAllMeshesBound */
  _areAllMeshesBound = false;

  /** m_skeletonIx: the index of skeletonName in the geometry resource, or NO_SKELETON. */
  _skeletonIx = NO_SKELETON;

  /** m_geometryResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.path("TriGeometryRes")
  geometryResPath = "";

  /** m_geometryRes (TriGeometryResPtr) [READ] */
  @blue.read
  @type.rootRef("TriGeometryRes")
  geometryRes = null;

  /** m_skeletonName (std::string) [READWRITE, NOTIFY, PERSIST] */
  @blue.notify
  @blue.readwrite
  @blue.persist
  @type.string
  skeletonName = "";

  /** m_skinScale (Vector3) [READWRITE, PERSIST] */
  @blue.readwrite
  @blue.persist
  @type.vec3
  skinScale = vec3.fromValues(1, 1, 1);

  /** Carbon OnModified (Tr2SkinnedModel.cpp:226-238): a new geometry path or skeleton name re-initialises. */
  @blue.method
  @meta.implemented
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
   * resource and becomes its notify target, so RebuildCachedData selects the skeleton once it is prepared (at once
   * when it already is).
   * @returns {boolean} true
   */
  @blue.method
  @meta.implemented
  @meta.invalidates("_areAllMeshesBound")
  Initialize()
  {
    this._skeletonIx = NO_SKELETON;
    this._areAllMeshesBound = false;

    if (!this.geometryResPath)
    {
      return true;
    }

    if (this.geometryRes)
    {
      this.geometryRes.RemoveNotifyTarget(this);
      this.geometryRes = null;
    }
    this.geometryRes = be.resMan.GetResource(this.geometryResPath, { requirement: ResourceRequirement.GEOMETRY });
    if (this.geometryRes)
    {
      this.geometryRes.AddNotifyTarget(this);
    }
    return true;
  }

  /** Carbon OnListModified (Tr2SkinnedModel.cpp:276-283): an inserted mesh triggers rebinding. */
  @blue.method
  @meta.implemented
  @meta.invalidates("_areAllMeshesBound")
  OnListModified(event)
  {
    if (event === BLUELISTEVENT.BELIST_INSERTED)
    {
      // Trigger rebinding of meshes
      this._areAllMeshesBound = false;
    }
  }

  /** Carbon ReleaseCachedData (Tr2SkinnedModel.cpp:240-243): forgets the selected skeleton. */
  @blue.method
  @meta.implemented
  ReleaseCachedData(_resource = null)
  {
    this._skeletonIx = NO_SKELETON;
  }

  /**
   * Carbon RebuildCachedData (Tr2SkinnedModel.cpp:245-262): selects the first skeleton named skeletonName.
   * @param {TriGeometryRes|null} [_resource] - the notifying resource; the model reads its own geometryRes
   */
  @blue.method
  @meta.implemented
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
   * @returns {object|null} the selected payload skeleton, or null when none is selected
   */
  @blue.method
  @meta.implemented
  GetSkeleton()
  {
    if (this._skeletonIx === NO_SKELETON)
    {
      return null;
    }

    return this.geometryRes.GetSkeletonData(this._skeletonIx);
  }

  /**
   * Carbon BindToRig (Tr2SkinnedModel.cpp:159-195): binds every mesh to boneList against the selected skeleton,
   * once per bone list unless forced or a mesh was not yet bound.
   * @param {string[]|null} boneList - the animation rig's bone names; null clears the binding
   * @param {number} numBones
   * @param {boolean} forceRebind
   */
  @blue.method
  @meta.implemented
  BindToRig(boneList, numBones, forceRebind)
  {
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

  /** Carbon ResetBindings (Tr2SkinnedModel.cpp:197-200). */
  @blue.method
  @meta.implemented
  ResetBindings()
  {
    this._areAllMeshesBound = false;
  }

  /** Carbon method ResetAnimationBindings -> ResetBindings (MAP_METHOD_AND_WRAP). */
  @meta.renamed("ResetBindings")
  @meta.implemented
  ResetAnimationBindings()
  {
    this.ResetBindings();
  }

  /** Carbon SetGeometryResPath (Tr2SkinnedModel.h:72-75): sets the path without re-initialising. */
  @meta.implemented
  @blue.method
  SetGeometryResPath(path)
  {
    this.geometryResPath = path;
  }

  /** Carbon GetGeometryResPath (Tr2SkinnedModel.h:76-79). */
  @meta.implemented
  @blue.method
  GetGeometryResPath()
  {
    return this.geometryResPath;
  }

  /** Carbon SetSkeletonName (Tr2SkinnedModel.h:80-83): sets the name without re-initialising. */
  @meta.implemented
  @blue.method
  SetSkeletonName(name)
  {
    this.skeletonName = name;
  }

  /**
   * Carbon GetDynamicBoundingBox (Tr2SkinnedModel.cpp:285-299): the union of every mesh's skinned bounds under the
   * bone transforms.
   * @param {mat4[]} boneTransforms - the animation's bone transforms
   * @param {vec3} minBounds - receives the minimum
   * @param {vec3} maxBounds - receives the maximum
   * @returns {boolean} false when the model has no meshes
   */
  @meta.implemented
  @blue.method
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

