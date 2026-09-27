// Source: resources/src/ResourceInfo/ResourceInfo.h:265
//
// NOT YET PORTED: a parameter of resource data transfer (ResourceInfo GetData, GetDataStream, PutData and PutDataStream), which needs Carbon's streams, CDN access and compression.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `ResourcePutDataParams`; recorded, not live. */
export class ResourcePutDataParams
{

}

CjsSchema.define(ResourcePutDataParams, { className: "ResourcePutDataParams", carbon: "ResourcePutDataParams", family: "tools", fields: {} });
