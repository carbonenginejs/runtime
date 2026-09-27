// Source: resources/include/ResourceGroup.h:64
//
// NOT YET PORTED: a parameter of resource data transfer (ResourceInfo GetData, GetDataStream, PutData and PutDataStream), which needs Carbon's streams, CDN access and compression.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `DownloadCallbackParams`; recorded, not live. */
export class DownloadCallbackParams
{

}

CjsSchema.define(DownloadCallbackParams, { className: "DownloadCallbackParams", carbon: "DownloadCallbackParams", family: "tools", fields: {} });
