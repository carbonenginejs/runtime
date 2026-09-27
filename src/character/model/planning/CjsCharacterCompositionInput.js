import { edit, type } from "#schema";
import { CjsModel } from "#model";

/** Named logical input to one character texture-composition pass. */
@type.define({ className: "CjsCharacterCompositionInput", family: "character" })
export class CjsCharacterCompositionInput extends CjsModel
{

    @edit.readwrite
    @edit.persist
    @type.string
    role = "";

    @edit.readwrite
    @edit.persist
    @type.model("CjsCharacterTextureAsset")
    texture = null;

    @edit.readwrite
    @edit.persist
    @type.vec4
    sampleBounds = null;

    @edit.readwrite
    @edit.persist
    @type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
