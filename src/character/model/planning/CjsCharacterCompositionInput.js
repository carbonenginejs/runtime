import { exposure as be } from "#be";
import { meta, type } from "#schema";

/** Named logical input to one character texture-composition pass. */
@meta.define("CjsCharacterCompositionInput")
export class CjsCharacterCompositionInput
{

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.string
    role = "";

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.rootRef("CjsCharacterTextureAsset")
    texture = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.vec4
    sampleBounds = null;

    @meta.attribute(meta.READWRITE | meta.PERSIST)

    @type.unknown
    value = null;

}

export default CjsCharacterCompositionInput;
