// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2SharedConstantBuffers (shader) - generated from schema shapeHash 692b0743.... */
@type.define({ className: "Tr2SharedConstantBuffers", family: "shader" })
export class Tr2SharedConstantBuffers extends CjsModel
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
