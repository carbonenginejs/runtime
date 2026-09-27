import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** One authored paper-doll color selection with resolved catalog references. */
@type.define({ className: "CjsCharacterColorSelection", family: "character" })
export class CjsCharacterColorSelection extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.float64
    gloss = 0;

    @edit.readwrite
    @edit.persist
    @type.float64
    weight = 0;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterColorLocation")
    colorID = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterColorName")
    colorNameA = null;

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
