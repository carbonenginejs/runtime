// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Schema: format-carbon resources/Tr2TextureLodUpdateRequest.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";
import { CjsModel } from "#model";

/** Tr2TextureLodUpdateRequest (resources) - maintained from schema shapeHash 7cfa47a1.... */
export class Tr2TextureLodUpdateRequest extends CjsModel
{

  /** frameNumber (uint64_t) */
  frameNumber = 0;

  /** mipChange (int32_t) */
  mipChange = 0;

  /** cachedInRam (bool) */
  cachedInRam = false;

}

CjsSchema.define(Tr2TextureLodUpdateRequest, {
  className: "Tr2TextureLodUpdateRequest", family: "resources",
  fields: {
    frameNumber: type.uint64,
    mipChange: type.int32,
    cachedInRam: type.boolean
  }
});
