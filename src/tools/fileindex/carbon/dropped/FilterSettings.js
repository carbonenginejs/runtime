// Source: resources/include/ResourceGroup.h:361
//
// NOT YET PORTED: a parameter of CreateFromFilter, which needs ResourceFilter.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `FilterSettings`; recorded, not live. */
export class FilterSettings
{

}

CjsSchema.define(FilterSettings, { className: "FilterSettings", carbon: "FilterSettings", family: "tools", fields: {} });
