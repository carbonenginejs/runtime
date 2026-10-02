// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Maps a named effect value onto a contiguous shader-register span. */
@meta.define({ className: "Tr2EffectParam", family: "shader" })
export class Tr2EffectParam
{

  /** m_sourceName (std::string) */
  @meta.type.string
  sourceName = "";

  /** m_sourceValue (ITr2EffectValuePtr) */
  @meta.type.objectRef("ITr2EffectValue")
  sourceValue = null;

  /** m_registerIndex (unsigned int) */
  @meta.type.uint32
  registerIndex = 0;

  /** m_registerCount (unsigned int) */
  @meta.type.uint32
  registerCount = 0;

}
