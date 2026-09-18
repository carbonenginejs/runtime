import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@type.define({ className: "CjsCharacterModifierReference", family: "character" })
export class CjsCharacterModifierReference extends CjsModel
{

    @edit.readwrite
    @type.string
    authoredValue = "";

    @edit.readwrite
    @type.string
    modifierPath = null;

    @edit.readwrite
    @type.model("CjsCharacterPartSource")
    partSource = null;

    @edit.readwrite
    @type.model("CjsCharacterModifierLocation")
    modifierLocation = null;

    /** Effective weight for a proved weighted logical modifier; otherwise null. */
    @edit.readwrite
    @type.float64
    weight = null;

}

export default CjsCharacterModifierReference;
