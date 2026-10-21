import { meta } from "#schema";
// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/** Maps a named effect value onto a contiguous shader-register span. */
@meta.carbon("Tr2EffectParam")
export class Tr2EffectParam
{

  /** m_sourceName (std::string) */
  @type.string
  sourceName = "";

  /** m_sourceValue (ITr2EffectValuePtr) */
  @type.rootRef("ITr2EffectValue")
  sourceValue = null;

  /** m_registerIndex (unsigned int). Carbon leaves it unset (Shader/Tr2Material.h:23). */
  @type.uint32
  registerIndex = 0;

  /** m_registerCount (unsigned int). Carbon leaves it unset (Shader/Tr2Material.h:25). */
  @type.uint32
  registerCount = 0;

}
