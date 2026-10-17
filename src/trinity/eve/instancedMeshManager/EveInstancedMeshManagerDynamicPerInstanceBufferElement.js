// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:158-165
import { type, blue } from "#schema";


/**
 * Carbon EveInstancedMeshManager::DynamicPerInstanceBufferElement (private,
 * h:158-165): the GPU record one dynamic instance becomes in the dynamic
 * instance buffer - its packed world transform this frame and last, the slot
 * of its per-object data, and its picking indices. Stage 2's UploadLodData
 * writes these; nothing in this stage does.
 */
@blue.define({ className: "EveInstancedMeshManagerDynamicPerInstanceBufferElement", donors: [ "EveInstancedMeshManager::DynamicPerInstanceBufferElement" ] })
export class EveInstancedMeshManagerDynamicPerInstanceBufferElement
{

  /** sizeof(DynamicPerInstanceBufferElement): 24 floats then three uint32s, 108 bytes. */
  static byteSize = 108;

  /** worldTransform (Float4x3). Carbon leaves it unset. */
  @type.float32Array
  worldTransform = new Float32Array(12);

  /** prevWorldTransform (Float4x3). Carbon leaves it unset. */
  @type.float32Array
  prevWorldTransform = new Float32Array(12);

  /** perObjectDataIndex (uint32_t). */
  @type.uint32
  perObjectDataIndex = 0;

  /** pickingMeshIndex (uint32_t). */
  @type.uint32
  pickingMeshIndex = 0;

  /** pickingInstanceIndex (uint32_t). */
  @type.uint32
  pickingInstanceIndex = 0;

}
