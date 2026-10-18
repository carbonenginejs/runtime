// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:191-204
import { type, meta } from "#schema";


/**
 * Carbon EveInstancedMeshManager::MeshGroup (private, h:191-204): one
 * provider registration inside a MeshData - the provider's instance array
 * and count, the sphere group and per-object data slot those instances use,
 * the provider's handle (so a swap-with-back removal can patch the moved
 * group's index), and the picking owner.
 *
 * Carbon overlays `staticInstances` and `dynamicInstances` in an anonymous
 * union (h:194-198): one pointer, read as whichever element type the owning
 * MeshKey's `isDynamic` says. JavaScript has no unions, so `staticInstances`
 * is the one stored field and `dynamicInstances` is an accessor over it;
 * writing either name writes both, as in Carbon.
 */
@meta.define({ className: "EveInstancedMeshManagerMeshGroup", carbon: "EveInstancedMeshManager::MeshGroup" })
export class EveInstancedMeshManagerMeshGroup
{

  /** handle (MeshGroupHandle*). Carbon initializes it to nullptr. */
  @type.rawStruct("EveInstancedMeshManagerDataHandle")
  handle = null;

  /**
   * staticInstances (const StaticPerInstanceData*): the provider's instance
   * array, read in place. Carbon initializes the union to nullptr.
   */
  @type.unknown
  staticInstances = null;

  /** count (uint32_t). */
  @type.uint32
  count = 0;

  /** sphereGroupIndex (uint32_t). */
  @type.uint32
  sphereGroupIndex = 0;

  /** perObjectDataIndex (uint32_t). */
  @type.uint32
  perObjectDataIndex = 0;

  /** ownerIndex (uint32_t): the picking owner's own index for this group. */
  @type.uint32
  ownerIndex = 0;

  /** owner (IRootPtr): the picking owner. */
  @type.rootRef("IRoot")
  owner = null;

  /**
   * dynamicInstances (const DynamicPerInstanceData*): the union's other
   * member, the same storage as `staticInstances`.
   * @returns {Array|null}
   */
  get dynamicInstances()
  {
    return this.staticInstances;
  }

  /** @param {Array|null} value */
  set dynamicInstances(value)
  {
    this.staticInstances = value;
  }

}
