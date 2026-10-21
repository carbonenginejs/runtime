// Source: trinity/trinity/Eve/EveInstancedMeshManager.cpp:23-28
import { blue } from "#schema";
import { Tr2PerObjectData } from "../../core/rawData/perObjectData/Tr2PerObjectData.js";


/**
 * Carbon's PickingPerObjectData (EveInstancedMeshManager.cpp:23-28, a struct
 * in the file's anonymous namespace): the per-object data an instanced
 * picking batch carries. It holds only the base's picking word (pointer
 * framework) or user data (objectId framework) and uploads nothing; the
 * instances' own data is in the instance buffer and the
 * "InstancedPerObjectBuffer" structured buffer.
 *
 * The class name carries the manager's prefix because Carbon's name is
 * file-local and our class namespace is flat.
 *
 * Carbon: PickingPerObjectData (trinity/trinity/Eve/EveInstancedMeshManager.cpp:23)
 */
@blue.define({ className: "EveInstancedMeshManagerPickingPerObjectData" })
export class EveInstancedMeshManagerPickingPerObjectData extends Tr2PerObjectData
{

  /**
   * Carbon's empty override (cpp:25-27). The base throws, because nothing
   * else on this path draws indirectly; this one must not.
   * @param {object} _writer
   * @param {object} _renderContext
   */
  @blue.method
  ApplyConstantBuffers(_writer, _renderContext)
  {
  }

}
