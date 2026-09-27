// Source: resources/include/ResourceGroup.h:347
//
// NOT YET PORTED: a parameter of CreateFromFilter, which needs ResourceFilter.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `Filter`; recorded, not live. */
export class Filter
{

}

CjsSchema.define(Filter, { className: "Filter", carbon: "Filter", family: "tools", fields: {} });
