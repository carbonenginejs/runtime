// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Schema: format-carbon resources/Tr2TextureLodUpdateRequest.json; maintained by the runtime resource layer.
import { type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TextureLodUpdateRequest (resources) - maintained from schema shapeHash 7cfa47a1.... */
@type.define({ className: "Tr2TextureLodUpdateRequest", family: "resources" })
export class Tr2TextureLodUpdateRequest extends CjsModel
{

  /** frameNumber (uint64_t) */
  @type.uint64
  frameNumber = 0;

  /** mipChange (int32_t) */
  @type.int32
  mipChange = 0;

  /** cachedInRam (bool) */
  @type.boolean
  cachedInRam = false;

}
