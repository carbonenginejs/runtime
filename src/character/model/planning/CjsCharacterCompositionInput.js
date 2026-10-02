import { meta } from "#schema";

/** Named logical input to one character texture-composition pass. */
@meta.define({ className: "CjsCharacterCompositionInput", family: "character" })
export class CjsCharacterCompositionInput
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.string
    role = "";

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.model("CjsCharacterTextureAsset")
    texture = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    sampleBounds = null;

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
