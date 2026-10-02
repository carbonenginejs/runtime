// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { meta } from "#schema";

/** Groups the pass and library parameter records prepared for one effect technique. */
@meta.define({ className: "Tr2EffectTechniqueInputs", family: "shader" })
export class Tr2EffectTechniqueInputs
{

  /** passes (std::vector<std::unique_ptr<Tr2EffectPassParameters>>) */
  @meta.type.list("Tr2EffectPassParameters")
  passes = [];

  /** libraries (std::vector<std::unique_ptr<Tr2EffectLibraryParameters>>) */
  @meta.type.list("Tr2EffectLibraryParameters")
  libraries = [];

}
