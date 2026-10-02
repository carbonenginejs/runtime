import { edit, type } from "#schema";

/** Logical alpha policy for one final character texture binding. */
@type.define({ className: "CjsCharacterBindingAlpha", family: "character" })
export class CjsCharacterBindingAlpha
{

    @edit.readwrite
    @edit.persist
    @type.string
    mode = "";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
