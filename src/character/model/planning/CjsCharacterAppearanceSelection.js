import { meta, type } from "#schema";

/** Plan-local resolved character choice with explicit selection-group ownership. */
@meta.define("CjsCharacterAppearanceSelection")
export class CjsCharacterAppearanceSelection
{

    @meta.readwrite
    @meta.persist
    @type.string
    groupID = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceSelection;
