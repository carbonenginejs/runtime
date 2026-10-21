// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:28-36
import { type, meta } from "#schema";


/**
 * Carbon EveInstancedMeshManager::DynamicPerInstanceData (h:28-36): one
 * instance a provider hands to the dynamic AddMeshGroup overload - its packed
 * world transform this frame and last frame, the index of its cull sphere in
 * the owning sphere group, whether its transform mirrors (winding flips), and
 * its picking indices. The manager reads the provider's array in place; it
 * never copies it at registration.
 */
@meta.define({"className":"EveInstancedMeshManagerDynamicPerInstanceData","carbon":"EveInstancedMeshManager::DynamicPerInstanceData"})
export class EveInstancedMeshManagerDynamicPerInstanceData
{

  /** worldTransform (Float4x3): the packed 3x4 world matrix. Carbon leaves it unset. */
  @type.float32Array
  worldTransform = new Float32Array(12);

  /** prevWorldTransform (Float4x3): last frame's packed 3x4 world matrix. Carbon leaves it unset. */
  @type.float32Array
  prevWorldTransform = new Float32Array(12);

  /** sphereIndex (uint32_t). */
  @type.uint32
  sphereIndex = 0;

  /** mirrored (bool). */
  @type.boolean
  mirrored = false;

  /** pickingMeshIndex (uint32_t). */
  @type.uint32
  pickingMeshIndex = 0;

  /** pickingInstanceIndex (uint32_t). */
  @type.uint32
  pickingInstanceIndex = 0;

}
