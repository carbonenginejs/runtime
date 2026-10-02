// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Schema: format-carbon resources/Tr2TextureLodUpdateRequest.json; maintained by the runtime resource layer.
import { CjsSchema, meta } from "#schema";

/** Data record mirroring Carbon's texture-LOD update request: the frame number, requested mip change, and RAM-cache flag. */
export class Tr2TextureLodUpdateRequest
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
    frameNumber: meta.type.uint64,
    mipChange: meta.type.int32,
    cachedInRam: meta.type.boolean
  }
});
