import { meta } from "#schema";

/** One authored paper-doll color selection with resolved catalog references. */
@meta.define({ className: "CjsCharacterColorSelection", family: "character" })
export class CjsCharacterColorSelection
{

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
    @meta.type.model("CjsCharacterColorLocation")
    colorID = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterColorName")
    colorNameA = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
