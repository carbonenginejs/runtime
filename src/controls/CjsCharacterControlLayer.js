import { io, type } from "@carbonenginejs/core-types/schema";
import { CjsCharacterNode } from "../CjsCharacterNode.js";
import { CjsCharacterUniqueCharacter } from "../library/CjsCharacterUniqueCharacter.js";

@type.define({ className: "CjsCharacterControlLayer", family: "character" })
/** One backend-neutral live-control layer, such as expression or viseme input. */
export class CjsCharacterControlLayer extends CjsCharacterNode
{
    /** Converts authored unique-character morphs and translation offsets into a neutral layer. */
    static fromUniqueCharacter(value, {
        id = null,
        priority = 0,
        enabled = true,
        influence = 1,
        blendMode = "replace"
    } = {})
    {
        const character = value instanceof CjsCharacterUniqueCharacter
            ? value
            : CjsCharacterUniqueCharacter.from(value || {});

        return CjsCharacterControlLayer.from({
            id: id ?? character.id,
            priority,
            enabled,
            influence,
            blendMode,
            morphs: new Map(character.blendshapeWeights),
            boneOffsets: new Map(character.animationOffsets)
        });
    }

    @type.string
    @io.persist
    id = "";

    @type.int32
    @io.persist
    priority = 0;

    @type.boolean
    @io.persist
    enabled = true;

    @type.float32
    @io.persist
    influence = 1;

    @type.string
    @io.persist
    blendMode = "replace";

    @type.map("float32")
    @io.persist
    morphs = new Map();

    @type.map("float32")
    @io.persist
    parameters = new Map();

    @type.map("vec3")
    @io.persist
    boneOffsets = new Map();

    @type.string
    @io.persist
    activePose = null;
}
