import { CjsGraph } from "../../../global/model/graph/CjsGraph.js";
import { meta } from "#schema";
// Source: trinity/trinity/Shader/Tr2Material.h
// Maintained CarbonEngineJS implementation; generated schema is reference-only.
import { type } from "#schema";

/** Groups the pass and library parameter records prepared for one effect technique. */
@meta.carbon("Tr2EffectTechniqueInputs")
export class Tr2EffectTechniqueInputs
{

  /** passes (std::vector<std::unique_ptr<Tr2EffectPassParameters>>) */
  @type.array("Tr2EffectPassParameters")
  passes = [];

  /** libraries (std::vector<std::unique_ptr<Tr2EffectLibraryParameters>>) */
  @type.array("Tr2EffectLibraryParameters")
  libraries = [];

  /**
   * Releases the pass and library values owned by this technique.
   * Carbon: ~Tr2EffectTechniqueInputs (trinity/trinity/Shader/Tr2Material.h:183-196).
   * @adapted Explicit member hooks replace destruction of the native unique_ptr vectors.
   * @returns {void}
   */
  _Destructor()
  {
    for (const library of this.libraries) CjsGraph.finalDelete(library);
    for (const pass of this.passes) CjsGraph.finalDelete(pass);
  }

}
