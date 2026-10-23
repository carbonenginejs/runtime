import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** One authored paper-doll color selection with resolved catalog references. */
@meta.define("CjsCharacterColorSelection")
export class CjsCharacterColorSelection
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    gloss = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterColorLocation")
    colorID = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterColorName")
    colorNameA = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.object.ref("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
