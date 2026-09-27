// Source: resources/src/ResourceGroupImpl.h:29
//
// NOT YET PORTED: a parameter of Diff; DiffChangesAsLists walks the two lists itself, which needs no subtraction result.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `ResourceGroupSubtractionParams`; recorded, not live. */
export class ResourceGroupSubtractionParams
{

}

CjsSchema.define(ResourceGroupSubtractionParams, { className: "ResourceGroupSubtractionParams", carbon: "ResourceGroupSubtractionParams", family: "tools", fields: {} });
