import { meta, type, blue } from "#schema";

/** Named logical input to one character texture-composition pass. */
@meta.define("CjsCharacterCompositionInput")
export class CjsCharacterCompositionInput
{

    @blue.readwrite
    @blue.persist
    @type.string
    role = "";

    @blue.readwrite
    @blue.persist
    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @blue.readwrite
    @blue.persist
    @type.vec4
    sampleBounds = null;

    @blue.readwrite
    @blue.persist
    @type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
