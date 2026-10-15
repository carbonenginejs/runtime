import { meta, type, blue } from "#schema";

/** One authored paper-doll color selection with resolved catalog references. */
@meta.define("CjsCharacterColorSelection")
export class CjsCharacterColorSelection
{

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
    @type.rootRef("CjsCharacterColorLocation")
    colorID = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterColorName")
    colorNameA = null;

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterColorName")
    colorNameBC = null;

}

export default CjsCharacterColorSelection;
