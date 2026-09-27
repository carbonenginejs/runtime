import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Logical alpha policy for one final character texture binding. */
@type.define({ className: "CjsCharacterBindingAlpha", family: "character" })
export class CjsCharacterBindingAlpha extends CjsModel
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
