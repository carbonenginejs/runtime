// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2EffectTechniqueInputs (shader) - generated from schema shapeHash 6ea72a37.... */
@type.define({ className: "Tr2EffectTechniqueInputs", family: "shader" })
export class Tr2EffectTechniqueInputs extends CjsModel
{

  /** passes (std::vector<std::unique_ptr<Tr2EffectPassParameters>>) */
  @type.list("Tr2EffectPassParameters")
  passes = [];

  /** libraries (std::vector<std::unique_ptr<Tr2EffectLibraryParameters>>) */
  @type.list("Tr2EffectLibraryParameters")
  libraries = [];

}
