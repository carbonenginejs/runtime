// Source: resources/include/ResourceGroup.h:228
//
// NOT YET PORTED: a parameter of CreatePatch, which needs binary diffing.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `PatchCreateParams`; recorded, not live. */
export class PatchCreateParams
{

}

CjsSchema.define(PatchCreateParams, { className: "PatchCreateParams", carbon: "PatchCreateParams", family: "tools", fields: {} });
