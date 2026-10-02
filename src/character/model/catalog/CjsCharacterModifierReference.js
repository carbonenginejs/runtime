import { meta } from "#schema";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@meta.define({ className: "CjsCharacterModifierReference", family: "character" })
export class CjsCharacterModifierReference
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    authoredValue = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    modifierPath = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterPartSource")
    partSource = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterModifierLocation")
    modifierLocation = null;

    /** Effective weight for a proved weighted logical modifier; otherwise null. */
    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weight = null;

}

export default CjsCharacterModifierReference;
