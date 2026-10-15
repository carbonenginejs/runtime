import { meta, type, blue } from "#schema";

/** One plan-local authored paper-doll colour selection. */
@meta.define("CjsCharacterAppearanceColorSelection")
export class CjsCharacterAppearanceColorSelection
{

    @blue.readwrite
    @blue.persist
    @type.string
    colorKey = "";

    @blue.readwrite
    @blue.persist
    @type.string
    colorNameA = "";

    @blue.readwrite
    @blue.persist
    @type.string
    colorNameBC = null;

    @blue.readwrite
    @blue.persist
    @type.float64
    gloss = 0;

    @blue.readwrite
    @blue.persist
    @type.float64
    weight = 0;

    @blue.readwrite
    @blue.persist
    @type.uint8
    hasGloss = 0;

    @blue.readwrite
    @blue.persist
    @type.uint8
    hasWeight = 0;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
