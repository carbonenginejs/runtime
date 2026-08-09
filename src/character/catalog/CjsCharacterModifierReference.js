import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@type.define({ className: "CjsCharacterModifierReference", family: "character" })
export class CjsCharacterModifierReference extends CjsModel
{

    @io.readwrite
    @type.string
    authoredValue = "";

    @io.readwrite
    @type.string
    modifierPath = null;

    @io.readwrite
    @type.model("CjsCharacterPartSource")
    partSource = null;

    @io.readwrite
    @type.model("CjsCharacterModifierLocation")
    modifierLocation = null;

}

export default CjsCharacterModifierReference;
