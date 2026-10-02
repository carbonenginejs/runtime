// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/**
 * Plain native record associating a sampler register with opaque AL state.
 * It has no Blue query table or lifecycle. The current native material-stage
 * owner vector is commented out; this remains a portable record definition.
 */
@meta.define({ className: "Tr2SamplerOverrideData", family: "shader" })
export class Tr2SamplerOverrideData
{

  /** Native uint32 register; zero is the existing deterministic JavaScript default. */
  @meta.type.uint32
  registerIndex = 0;

  /** Opaque AL state wrapper, not a Blue resource edge; null until assigned. */
  @meta.type.rawStruct("Tr2SamplerStateAL")
  sampler = null;

}
