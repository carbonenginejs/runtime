// Source: trinity/trinity/Tr2SkinnedModel.h
import { carbon, impl, edit, type } from "#schema";
import { Tr2Model } from "./Tr2Model.js";
import { vec3 } from "#math/vec3";
import { BLUELISTEVENT } from "#consts/blue";

/**
 * Skinned character model selecting a named skeleton from supplied geometry
 * and coordinating mesh-to-rig bindings.
 */
@type.define({ className: "Tr2SkinnedModel", family: "trinityCore" })
export class Tr2SkinnedModel extends Tr2Model
{

  #areAllMeshesBound = false;

  #boneList = null;

  #skeletonIndex = -1;

  #skeletonResource = null;

  /** m_geometryResPath (std::string) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.persist
  @type.string
  geometryResPath = "";

  /** m_geometryRes (TriGeometryResPtr) [READ] */
  @edit.read
  @type.objectRef("TriGeometryRes")
  geometryRes = null;

  /** m_skeletonName (std::string) [READWRITE, NOTIFY, PERSIST] */
  @edit.notify
  @edit.persist
  @type.string
  skeletonName = "";

  /** m_skinScale (Vector3) [READWRITE, PERSIST] */
  @edit.persist
  @type.vec3
  skinScale = vec3.fromValues(1, 1, 1);

  /** Carbon INotify hook: refreshes the selected skeleton from an already supplied resource. */
  @carbon.method
  @impl.adapted
  @impl.reason("Dispatches Carbon member notifications by exposed property name; existing JS expression and resource adapters retain their owning methods.")
  OnModified(propertyName)
  {
    if (propertyName === "geometryResPath" || propertyName === "skeletonName") this.Initialize();
    return true;
  }

  /**
   * Resets binding state and selects a skeleton from the supplied geometry
   * resource.
   */
  @carbon.method
  @impl.adapted
  @impl.reason("Character resource acquisition remains host-owned. Resets native skeleton/binding state and resolves against the supplied geometry; native resource subscription/acquisition is not implemented here.")
  @impl.invalidates("#areAllMeshesBound")
  Initialize()
  {
    this.#skeletonIndex = -1;
    this.#areAllMeshesBound = false;
    this.RebuildCachedData(this.geometryRes);
    return true;
  }

  /** Invalidates mesh binding completion when a mesh is inserted. */
  @carbon.method
  @impl.implemented
  @impl.invalidates("#areAllMeshesBound")
  OnListModified(event)
  {
    if (event === BLUELISTEVENT.BELIST_INSERTED) this.#areAllMeshesBound = false;
  }

  /** Carbon resource-notify hook: clears the selected skeleton index. */
  @carbon.method
  @impl.implemented
  ReleaseCachedData(_resource = null)
  {
    this.#skeletonIndex = -1;
  }

  /** Carbon resource-notify hook: selects the exact named skeleton. */
  @carbon.method
  @impl.adapted
  @impl.reason("Consumes the structural TriGeometryRes skeleton-query surface supplied by an outer resource adapter.")
  RebuildCachedData(resource = this.geometryRes)
  {
    this.#skeletonIndex = -1;
    this.#skeletonResource = resource ?? null;

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
        this.#skeletonIndex = index;
        break;
      }
    }
  }

  /** Carbon native method GetSkeleton. */
  @carbon.method
  @impl.adapted
  @impl.reason("Returns the selected structural geometry-resource skeleton object rather than a native pointer.")
  GetSkeleton()
  {
    if (this.#skeletonIndex < 0
      || !this.#skeletonResource
      || typeof this.#skeletonResource.GetSkeletonData !== "function")
    {
      return null;
    }

    return this.#skeletonResource.GetSkeletonData(this.#skeletonIndex) ?? null;
  }

  /** Carbon native method BindToRig. */
  @carbon.method
  @impl.adapted
  @impl.reason("Uses JavaScript bone-name arrays and structural mesh BindToRig methods instead of native string pointers and mesh objects.")
  BindToRig(boneList, numBones = boneList?.length ?? 0, forceRebind = false)
  {
    if (!forceRebind && boneList === this.#boneList && this.#areAllMeshesBound)
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
      this.#boneList = null;
      this.#areAllMeshesBound = false;
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

    const rebind = forceRebind || !this.#areAllMeshesBound;
    this.#areAllMeshesBound = true;

    for (const mesh of this.meshes)
    {
      if (!mesh
        || typeof mesh.BindToRig !== "function"
        || mesh.BindToRig(boneList, count, skeleton, rebind) === false)
      {
        this.#areAllMeshesBound = false;
      }
    }

    this.#boneList = boneList;
  }

  /** Carbon native method ResetBindings. */
  @carbon.method
  @impl.implemented
  ResetBindings()
  {
    this.#areAllMeshesBound = false;
  }

  /** Carbon method ResetAnimationBindings -> ResetBindings (MAP_METHOD_AND_WRAP). */
  @carbon.method
  @impl.implemented
  ResetAnimationBindings()
  {
    this.ResetBindings();
  }

}
