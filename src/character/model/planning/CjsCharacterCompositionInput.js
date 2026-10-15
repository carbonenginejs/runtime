import { meta, type } from "#schema";

/** Named logical input to one character texture-composition pass. */
@meta.define("CjsCharacterCompositionInput")
export class CjsCharacterCompositionInput
{

    @meta.readwrite
    @meta.persist
    @type.string
    role = "";

    @meta.readwrite
    @meta.persist
    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @meta.readwrite
    @meta.persist
    @type.vec4
    sampleBounds = null;

    @meta.readwrite
    @meta.persist
    @type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
