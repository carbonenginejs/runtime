// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:209-214
import { type, meta } from "#schema";


/**
 * Carbon EveInstancedMeshManager::InstanceBuffer::Allocation (h:209-214):
 * one span handed out of an instance buffer - the AL buffer, the mapped bytes
 * starting at the span, and the span's byte offset in the buffer.
 *
 * `data` is a Uint8Array view beginning at the span where Carbon has a
 * `uint8_t*` into the mapping: JavaScript has no pointer arithmetic, and a
 * subarray is the byte-for-byte equivalent of `mappedData + offset`.
 */
@meta.define({ className: "EveInstancedMeshManagerInstanceBufferAllocation", carbon: "EveInstancedMeshManager::InstanceBuffer::Allocation" })
export class EveInstancedMeshManagerInstanceBufferAllocation
{

  /** buffer (Tr2BufferAL*). Carbon initializes it to nullptr. */
  @type.rawStruct("Tr2BufferAL")
  buffer = null;

  /** data (uint8_t*). Carbon initializes it to nullptr. */
  @type.uint8Array
  data = null;

  /** offset (uint32_t): bytes from the start of the buffer. */
  @type.uint32
  offset = 0;

}
