import { meta, type, blue } from "#schema";

/** Plan-local resolved character choice with explicit selection-group ownership. */
@meta.define("CjsCharacterAppearanceSelection")
export class CjsCharacterAppearanceSelection
{

    @blue.readwrite
    @blue.persist
    @type.string
    groupID = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceSelection;
