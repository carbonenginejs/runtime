import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One plan-local authored paper-doll colour selection. */
@type.define({ className: "CjsCharacterAppearanceColorSelection", family: "character" })
export class CjsCharacterAppearanceColorSelection extends CjsModel
{

    @io.readwrite
    @type.string
    colorKey = "";

    @io.readwrite
    @type.string
    colorNameA = "";

    @io.readwrite
    @type.string
    colorNameBC = null;

    @io.readwrite
    @type.float64
    gloss = 0;

    @io.readwrite
    @type.float64
    weight = 0;

    @io.readwrite
    @type.uint8
    hasGloss = 0;

    @io.readwrite
    @type.uint8
    hasWeight = 0;

    @io.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
