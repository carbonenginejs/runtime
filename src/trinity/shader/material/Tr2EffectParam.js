// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2EffectParam (shader) - generated from schema shapeHash fdbc3137.... */
@type.define({ className: "Tr2EffectParam", family: "shader" })
export class Tr2EffectParam extends CjsModel
{

  /** m_sourceName (std::string) */
  @type.string
  sourceName = "";

  /** m_sourceValue (ITr2EffectValuePtr) */
  @type.objectRef("ITr2EffectValue")
  sourceValue = null;

  /** m_registerIndex (unsigned int) */
  @type.uint32
  registerIndex = 0;

  /** m_registerCount (unsigned int) */
  @type.uint32
  registerCount = 0;

}
