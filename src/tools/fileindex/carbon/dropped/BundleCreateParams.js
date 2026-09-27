// Source: resources/include/ResourceGroup.h:166
//
// NOT YET PORTED: a parameter of CreateBundle, which needs chunking and compression.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `BundleCreateParams`; recorded, not live. */
export class BundleCreateParams
{

}

CjsSchema.define(BundleCreateParams, { className: "BundleCreateParams", carbon: "BundleCreateParams", family: "tools", fields: {} });
