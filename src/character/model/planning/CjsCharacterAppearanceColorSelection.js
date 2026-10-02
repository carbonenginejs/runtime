import { meta } from "#schema";

/** One plan-local authored paper-doll colour selection. */
@meta.define({ className: "CjsCharacterAppearanceColorSelection", family: "character" })
export class CjsCharacterAppearanceColorSelection
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorKey = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorNameA = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    colorNameBC = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    gloss = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.float64
    weight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    hasGloss = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.uint8
    hasWeight = 0;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceColorSelection;
