import { meta } from "#schema";
// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";
import { Tr2SamplerStateAL } from "../../../trinityal/Tr2SamplerStateAL/index.js";

/**
 * Plain native record associating a sampler register with an AL sampler state.
 * It has no Blue query table or lifecycle. The current native material-stage
 * owner vector is commented out; this remains a portable record definition.
 */
@meta.carbon("Tr2SamplerOverrideData")
export class Tr2SamplerOverrideData
{

  /** Native uint32 register. Carbon leaves it unset (Shader/Tr2Material.h:32). */
  @type.uint32
  registerIndex = 0;

  /** Tr2SamplerStateAL sampler (Shader/Tr2Material.h:33), by value: invalid until created. Not a Blue resource edge. */
  @type.rawStruct("Tr2SamplerStateAL")
  sampler = new Tr2SamplerStateAL();

}
