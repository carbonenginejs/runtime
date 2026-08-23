import { io, type } from "#schema";
import { CjsModel } from "#model";

/** Logical alpha policy for one final character texture binding. */
@type.define({ className: "CjsCharacterBindingAlpha", family: "character" })
export class CjsCharacterBindingAlpha extends CjsModel
{

    @io.readwrite
    @type.string
    mode = "";

    @io.readwrite
    @type.model("CjsCharacterCoverage")
    coverage = null;

}

export default CjsCharacterBindingAlpha;
