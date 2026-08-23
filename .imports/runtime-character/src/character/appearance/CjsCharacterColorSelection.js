import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** One authored paper-doll color selection with resolved catalog references. */
@type.define({ className: "CjsCharacterColorSelection", family: "character" })
export class CjsCharacterColorSelection extends CjsModel
{

    @io.readwrite
    @type.float64
    gloss = 0;

    @io.readwrite
    @type.float64
    weight = 0;

    @io.readwrite
    @type.model("CjsCharacterColorLocation")
    colorID = null;

    @io.readwrite
    @type.model("CjsCharacterColorName")
    colorNameA = null;

    @io.readwrite
    @type.model("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
