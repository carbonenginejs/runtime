// Source: trinity/trinity/Resources/Tr2TextureLodManager.h
// Schema: format-carbon resources/Tr2TextureLodUpdateRequest.json; maintained by the runtime resource layer.
import { CjsSchema, type } from "#schema";

/** Data record mirroring Carbon's texture-LOD update request: the frame number, requested mip change, and RAM-cache flag. */
export class Tr2TextureLodUpdateRequest
{

  /** frameNumber (uint64_t). Carbon leaves it unset (Tr2TextureLodManager.h:11). */
  frameNumber = 0;

  /** mipChange (int32_t). Carbon leaves it unset (Tr2TextureLodManager.h:12). */
  mipChange = 0;

  /** cachedInRam (bool). Carbon leaves it unset (Tr2TextureLodManager.h:13). */
  cachedInRam = false;

}

CjsSchema.blue.define(Tr2TextureLodUpdateRequest, {
  className: "Tr2TextureLodUpdateRequest",
  fields: {
    frameNumber: type.uint64,
    mipChange: type.int32,
    cachedInRam: type.boolean
  }
});
