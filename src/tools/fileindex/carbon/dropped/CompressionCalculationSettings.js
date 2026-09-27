// Source: resources/include/ResourceGroup.h:394
//
// NOT YET PORTED: a parameter of building a group from a directory or filter (CreateFromDirectory, CreateFromFilter), which needs a file system to walk and file hashing.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `CompressionCalculationSettings`; recorded, not live. */
export class CompressionCalculationSettings
{

}

CjsSchema.define(CompressionCalculationSettings, { className: "CompressionCalculationSettings", carbon: "CompressionCalculationSettings", family: "tools", fields: {} });
