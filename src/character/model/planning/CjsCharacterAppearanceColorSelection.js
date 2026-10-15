import { meta, type } from "#schema";

/** One plan-local authored paper-doll colour selection. */
@meta.define("CjsCharacterAppearanceColorSelection")
export class CjsCharacterAppearanceColorSelection
{

    @meta.readwrite
    @meta.persist
    @type.string
    colorKey = "";

    @meta.readwrite
    @meta.persist
    @type.string
    colorNameA = "";

    @meta.readwrite
    @meta.persist
    @type.string
    colorNameBC = null;

    @meta.readwrite
    @meta.persist
    @type.float64
    gloss = 0;

    @meta.readwrite
    @meta.persist
    @type.float64
    weight = 0;

    @meta.readwrite
    @meta.persist
    @type.uint8
    hasGloss = 0;

    @meta.readwrite
    @meta.persist
    @type.uint8
    hasWeight = 0;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
