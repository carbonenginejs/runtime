// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Tracks shared constant-buffer contents by size and hash together with its backing buffer and reference count. */
@blue.define("Tr2SharedConstantBuffers")
export class Tr2SharedConstantBuffers
{

  /** size (uint32_t) */
  @type.uint32
  size = 0;

  /** hash (uint32_t) */
  @type.uint32
  hash = 0;

  /** contents (const void*) */
  @type.unknown
  contents = null;

  /** buffer (Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
  buffer = null;

  /** refCount (uint32_t) */
  @type.uint32
  refCount = 0;

}
