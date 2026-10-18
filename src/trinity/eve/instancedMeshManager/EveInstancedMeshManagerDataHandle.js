// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:46-95
import { meta, type } from "#schema";


/**
 * Carbon EveInstancedMeshManager::DataHandle<T> (h:46-91): a provider's
 * registration with the manager - the manager that issued it and the slot it
 * occupies there. The manager patches `index` when a swap-with-back removal
 * moves the slot, and sets it to `invalidIndex` when the registration is
 * removed.
 *
 * Carbon's three tagged typedefs (h:93-95) - PerObjectDataHandle,
 * BoundingSphereHandle and MeshGroupHandle - differ only in an empty tag type
 * that stops one kind being passed for another at compile time. JavaScript
 * has no template tags, so all three are this one class, aliased under each
 * Carbon name on EveInstancedMeshManager.
 *
 * Not ported: the deleted copy operations and the move constructor and move
 * assignment (h:49-79), with the manager's three ReplaceHandle overloads
 * (h:106, 111, 147; cpp:160-167, 222-229, 385-395) they call. Carbon handles
 * are value members of their providers, so when a provider's vector
 * reallocates the handle moves to a new address and the manager's stored
 * `DataHandle*` must be re-pointed. A JavaScript handle is an object
 * reference that never moves, so the manager's reference stays valid and
 * there is nothing to replace.
 */
@meta.define({ className: "EveInstancedMeshManagerDataHandle", donors: [ "EveInstancedMeshManager::DataHandle" ] })
export class EveInstancedMeshManagerDataHandle
{

  /** InvalidIndex (static const uint32_t, h:88): `0xFFFFFFFF`. */
  static invalidIndex = 0xFFFFFFFF;

  /** owner (EveInstancedMeshManager*, h:89). Carbon initializes it to nullptr. */
  @type.rawStruct("EveInstancedMeshManager")
  owner = null;

  /** index (uint32_t, h:90). Carbon initializes it to InvalidIndex. */
  @type.uint32
  index = EveInstancedMeshManagerDataHandle.invalidIndex;

  /**
   * Carbon's `operator bool` (h:82-85), which JavaScript cannot overload:
   * whether the handle holds a registration.
   * @returns {boolean}
   */
  @meta.renamed("operator bool")
  IsValid()
  {
    return this.index !== EveInstancedMeshManagerDataHandle.invalidIndex;
  }

}
