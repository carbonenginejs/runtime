import { meta, type } from "#schema";

/** One authored three-axis paper-doll sculpt selection. */
@meta.define("CjsCharacterSculptSelection")
export class CjsCharacterSculptSelection
{

    @meta.readwrite
    @meta.persist
    @type.float64
    weightForwardBack = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    weightLeftRight = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    weightUpDown = 0;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterSculptingLocation")
    sculptLocationID = null;

}

export default CjsCharacterSculptSelection;
