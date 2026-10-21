import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** One plan-local authored paper-doll colour selection. */
@meta.define("CjsCharacterAppearanceColorSelection")
export class CjsCharacterAppearanceColorSelection
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorKey = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorNameA = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    colorNameBC = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    gloss = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.float64
    weight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    hasGloss = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.uint8
    hasWeight = 0;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
