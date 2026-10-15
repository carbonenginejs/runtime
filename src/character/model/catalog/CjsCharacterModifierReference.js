import { meta, type } from "#schema";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@meta.define("CjsCharacterModifierReference")
export class CjsCharacterModifierReference
{

    @meta.readwrite
    @meta.persist
    @type.string
    authoredValue = "";

    @meta.readwrite
    @meta.persist
    @type.string
    modifierPath = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocation = null;

    /** Effective weight for a proved weighted logical modifier; otherwise null. */
    @meta.readwrite
    @meta.persist
    @type.float64
    weight = null;

}

export default CjsCharacterModifierReference;
