import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** One authored three-axis paper-doll sculpt selection. */
@meta.define("CjsCharacterSculptSelection")
export class CjsCharacterSculptSelection
{

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    weightForwardBack = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    weightLeftRight = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    weightUpDown = 0;

    @meta.mapAttribute(meta.READWRITE | meta.PERSIST, "sculptLocationID")
    @type.object.ref("CjsCharacterSculptingLocation")
    sculptingLocation = null;

}

export default CjsCharacterSculptSelection;
