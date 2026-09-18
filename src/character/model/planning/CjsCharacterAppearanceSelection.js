import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Plan-local resolved character choice with explicit selection-group ownership. */
@type.define({ className: "CjsCharacterAppearanceSelection", family: "character" })
export class CjsCharacterAppearanceSelection extends CjsModel
{

    @edit.readwrite
    @type.string
    groupID = "";

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceSelection;
