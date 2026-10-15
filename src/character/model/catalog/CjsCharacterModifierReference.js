import { meta, type, blue } from "#schema";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@meta.define("CjsCharacterModifierReference")
export class CjsCharacterModifierReference
{

    @blue.readwrite
    @blue.persist
    @type.string
    authoredValue = "";

    @blue.readwrite
    @blue.persist
    @type.string
    modifierPath = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocation = null;

    /** Effective weight for a proved weighted logical modifier; otherwise null. */
    @blue.readwrite
    @blue.persist
    @type.float64
    weight = null;

}

export default CjsCharacterModifierReference;
