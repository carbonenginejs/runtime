import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One authored three-axis paper-doll sculpt selection. */
@type.define({ className: "CjsCharacterSculptSelection", family: "character" })
export class CjsCharacterSculptSelection extends CjsModel
{

    @io.readwrite
    @type.float64
    weightForwardBack = 0;

    @io.readwrite
    @type.float64
    weightLeftRight = 0;

    @io.readwrite
    @type.float64
    weightUpDown = 0;

    @io.readwrite
    @type.model("CjsCharacterSculptingLocation")
    sculptLocationID = null;

}

export default CjsCharacterSculptSelection;
