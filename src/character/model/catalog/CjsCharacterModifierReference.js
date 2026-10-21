import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Additive typed projection beside one losslessly retained authored modifier string. */
@meta.define("CjsCharacterModifierReference")
export class CjsCharacterModifierReference
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    authoredValue = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    modifierPath = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterPartSource")
    partSource = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterModifierLocation")
    modifierLocation = null;

    /** Effective weight for a proved weighted logical modifier; otherwise null. */
    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = null;

}

export default CjsCharacterModifierReference;
