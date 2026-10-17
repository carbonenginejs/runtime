// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type, blue } from "#schema";

/**
 * Plain native record associating a sampler register with opaque AL state.
 * It has no Blue query table or lifecycle. The current native material-stage
 * owner vector is commented out; this remains a portable record definition.
 */
@blue.define("Tr2SamplerOverrideData")
export class Tr2SamplerOverrideData
{

  /** Native uint32 register. Carbon leaves it unset (Shader/Tr2Material.h:32). */
  @type.uint32
  registerIndex = 0;

  /** Opaque AL state wrapper, not a Blue resource edge; null until assigned. */
  @type.rawStruct("Tr2SamplerStateAL")
  sampler = null;

}
