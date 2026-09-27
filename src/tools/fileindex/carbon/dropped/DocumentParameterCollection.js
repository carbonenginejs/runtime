// Source: resources/src/ResourceInfo/ResourceInfo.h:87
//
// DROPPED: NOT A SEPARATE CLASS HERE. Carbon wraps a std::vector of resources in a
// DocumentParameter so the list has a tag and a version gate. ResourceGroupImpl
// holds the resources in a plain array, and the `Resources` tag is written
// where the group is read and written, so a wrapper would carry nothing.
import { CjsSchema } from "#schema";

/** Carbon's `DocumentParameterCollection`; recorded, not live. */
export class DocumentParameterCollection
{

}

CjsSchema.define(DocumentParameterCollection, { className: "DocumentParameterCollection", carbon: "DocumentParameterCollection", family: "tools", fields: {} });
