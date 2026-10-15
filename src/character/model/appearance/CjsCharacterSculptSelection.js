import { meta, type, blue } from "#schema";

/** One authored three-axis paper-doll sculpt selection. */
@meta.define("CjsCharacterSculptSelection")
export class CjsCharacterSculptSelection
{

    @blue.readwrite
    @blue.persist
    @type.float64
    weightForwardBack = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    weightLeftRight = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    weightUpDown = 0;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterSculptingLocation")
    sculptLocationID = null;

}

export default CjsCharacterSculptSelection;
