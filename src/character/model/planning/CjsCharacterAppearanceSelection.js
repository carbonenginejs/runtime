import { meta } from "#schema";

/** Plan-local resolved character choice with explicit selection-group ownership. */
@meta.define({ className: "CjsCharacterAppearanceSelection", family: "character" })
export class CjsCharacterAppearanceSelection
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    groupID = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterOrigin")
    origin = null;

}

export default CjsCharacterAppearanceSelection;
