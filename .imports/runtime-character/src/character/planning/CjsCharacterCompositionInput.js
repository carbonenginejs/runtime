import { io, type } from "@carbonenginejs/runtime-utils/schema";
import { CjsModel } from "@carbonenginejs/runtime-utils/model";

/** Named logical input to one character texture-composition pass. */
@type.define({ className: "CjsCharacterCompositionInput", family: "character" })
export class CjsCharacterCompositionInput extends CjsModel
{

    @io.readwrite
    @type.string
    role = "";

    @io.readwrite
    @type.model("CjsCharacterTextureAsset")
    texture = null;

    @io.readwrite
    @type.vec4
    sampleBounds = null;

    @io.readwrite
    @type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
