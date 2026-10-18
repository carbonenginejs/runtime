// Source: trinity/trinity/Eve/EveInstancedMeshManager.h:223-228
import { type, meta } from "#schema";


/**
 * Carbon EveInstancedMeshManager::InstanceBuffer::Region (private, h:223-228):
 * a span of an instance buffer still in use by a frame the GPU may not have
 * finished - its byte offset and length, and the recording frame that wrote
 * it. TrimRegions drops regions once their frame has rendered.
 */
@meta.define({ className: "EveInstancedMeshManagerInstanceBufferRegion", donors: [ "EveInstancedMeshManager::InstanceBuffer::Region" ] })
export class EveInstancedMeshManagerInstanceBufferRegion
{

  /** offset (uint32_t): bytes from the start of the buffer. */
  @type.uint32
  offset = 0;

  /** length (uint32_t): bytes. */
  @type.uint32
  length = 0;

  /** recordedFrame (uint64_t): the recording frame number that wrote the region. */
  @type.uint64
  recordedFrame = 0;

}
