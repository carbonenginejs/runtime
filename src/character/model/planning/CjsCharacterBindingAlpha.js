import { meta } from "#schema";

/** Logical alpha policy for one final character texture binding. */
@meta.define({ className: "CjsCharacterBindingAlpha", family: "character" })
export class CjsCharacterBindingAlpha
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    mode = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
