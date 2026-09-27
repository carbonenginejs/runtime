// Source: resources/include/ResourceGroup.h:319
//
// NOT YET PORTED: a parameter of CreateFromDirectory, which needs a file system to walk and file hashing.
// That operation throws "is not implemented" until it is ported, so its
// parameters have nothing to carry. Port this with it.
import { CjsSchema } from "#schema";

/** Carbon's `CreateResourceGroupFromDirectoryParams`; recorded, not live. */
export class CreateResourceGroupFromDirectoryParams
{

}

CjsSchema.define(CreateResourceGroupFromDirectoryParams, { className: "CreateResourceGroupFromDirectoryParams", carbon: "CreateResourceGroupFromDirectoryParams", family: "tools", fields: {} });
