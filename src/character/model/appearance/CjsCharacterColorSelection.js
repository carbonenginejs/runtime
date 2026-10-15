import { meta, type } from "#schema";

/** One authored paper-doll color selection with resolved catalog references. */
@meta.define("CjsCharacterColorSelection")
export class CjsCharacterColorSelection
{

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
    @type.rootRef("CjsCharacterColorLocation")
    colorID = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterColorName")
    colorNameA = null;

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
