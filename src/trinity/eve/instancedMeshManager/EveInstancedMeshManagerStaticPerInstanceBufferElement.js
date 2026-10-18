// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:150-156
import { type, meta } from "#schema";


/**
 * Carbon EveInstancedMeshManager::StaticPerInstanceBufferElement (private,
 * h:150-156): the GPU record one static instance becomes in the static
 * instance buffer - its packed world transform, the slot of its per-object
 * data in the structured buffer, and its picking indices. The manager's
 * UploadLodData writes these, byte for byte, into the instance buffer.
 */
@meta.define({ className: "EveInstancedMeshManagerStaticPerInstanceBufferElement", donors: [ "EveInstancedMeshManager::StaticPerInstanceBufferElement" ] })
export class EveInstancedMeshManagerStaticPerInstanceBufferElement
{

  /** sizeof(StaticPerInstanceBufferElement): 12 floats then three uint32s, 60 bytes. */
  static byteSize = 60;

  /** worldTransform (Float4x3). Carbon leaves it unset. */
  @type.float32Array
  worldTransform = new Float32Array(12);

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
