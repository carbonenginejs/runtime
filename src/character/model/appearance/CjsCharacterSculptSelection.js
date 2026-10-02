import { meta } from "#schema";

/** One authored three-axis paper-doll sculpt selection. */
@meta.define({ className: "CjsCharacterSculptSelection", family: "character" })
export class CjsCharacterSculptSelection
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weightForwardBack = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weightLeftRight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weightUpDown = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterSculptingLocation")
    sculptLocationID = null;

}

export default CjsCharacterSculptSelection;
