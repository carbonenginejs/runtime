// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";

/** Tracks shared constant-buffer contents by size and hash together with its backing buffer and reference count. */
@type.define({ className: "Tr2SharedConstantBuffers", family: "shader" })
export class Tr2SharedConstantBuffers
{

  /** size (uint32_t) */
  @type.uint32
  size = 0;

  /** hash (uint32_t) */
  @type.uint32
  hash = 0;

  /** contents (const void*) */
  @type.objectRef("void")
  contents = null;

  /** buffer (Tr2ConstantBufferAL) */
  @type.rawStruct("Tr2ConstantBufferAL")
  buffer = null;

  /** refCount (uint32_t) */
  @type.uint32
  refCount = 0;

}
