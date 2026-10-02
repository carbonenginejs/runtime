import { IsMatch, IInitialize, INotify } from "#blue";
// Source: trinity/trinity/Tr2SkinnedModel.h
import { meta } from "#schema";
import { Tr2Model } from "./Tr2Model.js";
import { vec3 } from "#math/vec3";
import { BLUELISTEVENT } from "#consts/blue";

/**
 * Skinned character model selecting a named skeleton from supplied geometry
 * and coordinating mesh-to-rig bindings.
 */
@meta.define({ className: "Tr2SkinnedModel", family: "trinityCore" })
@meta.blue.inherit(IInitialize, INotify)
export class Tr2SkinnedModel extends Tr2Model
{

  _areAllMeshesBound = false;

  _boneList = null;

  _skeletonIndex = -1;

  _skeletonResource = null;

  /** m_geometryResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.path
  geometryResPath = "";

  /** m_geometryRes (TriGeometryResPtr) [READ] */
  @meta.blue.read
  @meta.type.objectRef("TriGeometryRes")
  geometryRes = null;

  /** m_skeletonName (std::string) [READWRITE, NOTIFY, PERSIST] */
  @meta.blue.notify
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.string
  skeletonName = "";

  /** m_skinScale (Vector3) [READWRITE, PERSIST] */
  @meta.blue.readwrite
  @meta.blue.persist
  @meta.type.vec3
  skinScale = vec3.fromValues(1, 1, 1);

  /** Carbon INotify hook: refreshes the selected skeleton from an already supplied resource. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (IsMatch(propertyName, "geometryResPath") || IsMatch(propertyName, "skeletonName")) this.Initialize();
    return true;
  }

  /**
   * Resets binding state and selects a skeleton from the supplied geometry
   * resource.
   */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Character resource acquisition remains host-owned. Resets native skeleton/binding state and resolves against the supplied geometry; native resource subscription/acquisition is not implemented here.")
  @meta.invalidates("_areAllMeshesBound")
  Initialize()
  {
    this._skeletonIndex = -1;
    this._areAllMeshesBound = false;
    this.RebuildCachedData(this.geometryRes);
    return true;
  }

  /** Invalidates mesh binding completion when a mesh is inserted. */
  @meta.blue.method
  @meta.implemented
  @meta.invalidates("_areAllMeshesBound")
  OnListModified(event)
  {
    if (event === BLUELISTEVENT.BELIST_INSERTED) this._areAllMeshesBound = false;
  }

  /** Carbon resource-notify hook: clears the selected skeleton index. */
  @meta.blue.method
  @meta.implemented
  ReleaseCachedData(_resource = null)
  {
    this._skeletonIndex = -1;
  }

  /** Carbon resource-notify hook: selects the exact named skeleton. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Consumes the structural TriGeometryRes skeleton-query surface supplied by an outer resource adapter.")
  RebuildCachedData(resource = this.geometryRes)
  {
    this._skeletonIndex = -1;
    this._skeletonResource = resource ?? null;

    if (!resource
      || typeof resource.GetSkeletonCount !== "function"
      || typeof resource.GetSkeletonData !== "function")
    {
      return;
    }

    const count = Number(resource.GetSkeletonCount());

    if (!Number.isInteger(count) || count < 0)
    {
      throw new TypeError("Tr2SkinnedModel geometry resource returned an invalid skeleton count");
    }

    for (let index = 0; index < count; index++)
    {
      const skeleton = resource.GetSkeletonData(index);
      const name = skeleton?.name ?? skeleton?.m_name;

      if (name === this.skeletonName)
      {
        this._skeletonIndex = index;
        break;
      }
    }
  }

  /** Carbon native method GetSkeleton. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Returns the selected structural geometry-resource skeleton object rather than a native pointer.")
  GetSkeleton()
  {
    if (this._skeletonIndex < 0
      || !this._skeletonResource
      || typeof this._skeletonResource.GetSkeletonData !== "function")
    {
      return null;
    }

    return this._skeletonResource.GetSkeletonData(this._skeletonIndex) ?? null;
  }

  /** Carbon native method BindToRig. */
  @meta.blue.method
  @meta.adapted
  @meta.reason("Uses JavaScript bone-name arrays and structural mesh BindToRig methods instead of native string pointers and mesh objects.")
  BindToRig(boneList, numBones = boneList?.length ?? 0, forceRebind = false)
  {
    if (!forceRebind && boneList === this._boneList && this._areAllMeshesBound)
    {
      return;
    }

    const skeleton = this.GetSkeleton();

    if (!skeleton)
    {
      return;
    }

    if (boneList === null || boneList === undefined)
    {
      this._boneList = null;
      this._areAllMeshesBound = false;
      return;
    }

    if (!Array.isArray(boneList))
    {
      throw new TypeError("Tr2SkinnedModel.BindToRig requires a bone-name array or null");
    }

    const count = Number(numBones);

    if (!Number.isInteger(count) || count < 0 || count > boneList.length)
    {
      throw new TypeError("Tr2SkinnedModel.BindToRig received an invalid bone count");
    }

    const rebind = forceRebind || !this._areAllMeshesBound;
    this._areAllMeshesBound = true;

    for (const mesh of this.meshes)
    {
      if (!mesh
        || typeof mesh.BindToRig !== "function"
        || mesh.BindToRig(boneList, count, skeleton, rebind) === false)
      {
        this._areAllMeshesBound = false;
      }
    }

    this._boneList = boneList;
  }

  /** Carbon native method ResetBindings. */
  @meta.blue.method
  @meta.implemented
  ResetBindings()
  {
    this._areAllMeshesBound = false;
  }

  /** Carbon method ResetAnimationBindings -> ResetBindings (MAP_METHOD_AND_WRAP). */
  @meta.blue.method
  @meta.implemented
  ResetAnimationBindings()
  {
    this.ResetBindings();
  }

}

meta.blue.interfaceTable({ interfaces: [Tr2SkinnedModel, IInitialize, INotify], chainTo: Tr2Model })(Tr2SkinnedModel, { kind: "class" });
