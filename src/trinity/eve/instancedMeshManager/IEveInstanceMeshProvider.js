import { meta } from "#schema";
// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:297-302
import { blue } from "#schema";


/**
 * Carbon IEveInstanceMeshProvider (EveInstancedMeshManager.h:297-300): the
 * component interface registered as "InstancedMeshProvider" (h:302). Every
 * frame EveInstancedMeshManager.CollectMeshes asks each registered provider
 * to register what it has not yet registered.
 */
@meta.carbon("IEveInstanceMeshProvider")
export class IEveInstanceMeshProvider
{

  /**
   * Carbon's `virtual void AddMeshesToManager( EveInstancedMeshManager& manager ) = 0`.
   * @param {EveInstancedMeshManager} _manager The manager collecting this frame.
   */
  @blue.abstract
  AddMeshesToManager(_manager) {}

}
