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

    @meta.attribute(meta.READWRITE | meta.PERSIST, "colorID")
    @type.object.ref("CjsCharacterColorLocation")
    colorLocation = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST, "colorNameA")
    @type.object.ref("CjsCharacterColorName")
    colorA = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST, "colorNameBC")
    @type.object.ref("CjsCharacterColorName")
    colorBC = null;

}

export default CjsCharacterColorSelection;
