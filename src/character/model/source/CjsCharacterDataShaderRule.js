import { meta, type } from "#schema";
import "./CjsCharacterDataParameter.js";

/**
 * Parameters a generic area shader sets on the areas a condition picks (`CjsCharacterDataShader.rules`). An area is
 * picked when each list is empty or holds its value: the category of the part the area belongs to, its batch and the
 * atlas region its `TransformUV0` lies in. A rule tests nothing else.
 *
 * Ours (no Carbon counterpart): Carbon's generic shader data applies the same defaults to every area of the shader
 * (EveSOF.cpp:875-883); the paper doll's areas need some set only for some parts (character-library-plan § 5,
 * step 8).
 */
@meta.define("CjsCharacterDataShaderRule")
export class CjsCharacterDataShaderRule
{

    /** The part categories it applies to (`hair`, `topinner`); empty for any. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    categories = [];

    /** The batches it applies to, by `TriBatchType` name (`TRIBATCHTYPE_DECAL`); empty for any. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    batches = [];

    /** The atlas regions it applies to (`CjsCharacterTextureRoles.atlas`: `body`, `head`, `hair`, `acc`); empty for any. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("string")
    regions = [];

    /** The parameters it sets. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.list("CjsCharacterDataParameter")
    parameters = [];

}
