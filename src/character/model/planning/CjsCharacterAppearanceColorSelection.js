import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One plan-local authored paper-doll colour selection. */
@type.define({ className: "CjsCharacterAppearanceColorSelection", family: "character" })
export class CjsCharacterAppearanceColorSelection extends CjsModel
{

    @edit.readwrite
    @type.string
    colorKey = "";

    @edit.readwrite
    @type.string
    colorNameA = "";

    @edit.readwrite
    @type.string
    colorNameBC = null;

    @edit.readwrite
    @type.float64
    gloss = 0;

    @edit.readwrite
    @type.float64
    weight = 0;

    @edit.readwrite
    @type.uint8
    hasGloss = 0;

    @edit.readwrite
    @type.uint8
    hasWeight = 0;

    @edit.readwrite
    @type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
