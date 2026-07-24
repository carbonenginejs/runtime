// Source: trinity/trinity/Resources/Tr2EffectRes.h
// Schema: format-carbon resources/Tr2ShaderPermutation.json; maintained by runtime-resource.
import { type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Tr2ShaderPermutation (resources) - maintained from schema shapeHash baf42e3d.... */
@type.define({ className: "Tr2ShaderPermutation", family: "resources" })
export class Tr2ShaderPermutation extends CjsModel
{

  /** name (BlueSharedString) */
  @type.string
  name = "";

  /** options (std::vector<BlueSharedString>) */
  @type.list("BlueSharedString")
  options = [];

  /** defaultOption (size_t) */
  @type.uint64
  defaultOption = 0;

  /** description (std::string) */
  @type.string
  description = "";

  /** type (uint8_t) */
  @type.uint8
  type = 0;

}
