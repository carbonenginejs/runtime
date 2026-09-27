import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One authored three-axis paper-doll sculpt selection. */
@type.define({ className: "CjsCharacterSculptSelection", family: "character" })
export class CjsCharacterSculptSelection extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.float64
    weightForwardBack = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    weightLeftRight = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    weightUpDown = 0;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterSculptingLocation")
    sculptLocationID = null;

}

export default CjsCharacterSculptSelection;
