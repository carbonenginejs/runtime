// Source: resources/src/ResourceGroupImpl.h:49
//
// NOT YET PORTED: a parameter of CreateFromFilter, which needs ResourceFilter.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `FilterGroup`; recorded, not live. */
export class FilterGroup
{

}

CjsSchema.define(FilterGroup, { className: "FilterGroup", carbon: "FilterGroup", family: "tools", fields: {} });
