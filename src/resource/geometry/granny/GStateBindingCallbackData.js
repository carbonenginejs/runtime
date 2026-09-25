// Source: trinity/trinity/Resources/Tr2GrannyStateRes.h
// Schema: format-carbon resources/GStateBindingCallbackData.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Data record mirroring Carbon's GState binding callback payload, holding the `gsf_path` string that identifies the Granny state file to bind. */
export class GStateBindingCallbackData extends CjsModel
{

  /** gsf_path (std::string) */
  gsf_path = "";

}

CjsSchema.define(GStateBindingCallbackData, {
  className: "GStateBindingCallbackData", family: "resources",
  fields: {
    gsf_path: type.string
  }
});
