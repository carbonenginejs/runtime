// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
// Schema: format-carbon resources/GStateBindingCallbackData.json; maintained by runtime-resource.
import { type } from "#schema";
import { CjsModel } from "#model";

/** GStateBindingCallbackData (resources) - maintained from schema shapeHash ffae27cd.... */
@type.define({ className: "GStateBindingCallbackData", family: "resources" })
export class GStateBindingCallbackData extends CjsModel
{

  /** gsf_path (std::string) */
  @type.string
  gsf_path = "";

}
