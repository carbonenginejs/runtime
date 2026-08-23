// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2SamplerOverrideData (shader) - generated from schema shapeHash 0adbde3e.... */
@type.define({ className: "Tr2SamplerOverrideData", family: "shader" })
export class Tr2SamplerOverrideData extends CjsModel
{

  /** registerIndex (uint32_t) */
  @type.uint32
  registerIndex = 0;

  /** sampler (Tr2SamplerStateAL) */
  @type.rawStruct("Tr2SamplerStateAL")
  sampler = null;

}
