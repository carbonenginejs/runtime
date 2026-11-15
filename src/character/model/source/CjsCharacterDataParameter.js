import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

/**
 * One shader parameter's value, by name: a generic area shader's default parameter, or one a rule sets
 * (`CjsCharacterDataShader`). A float parameter keeps its value in every component, as Carbon's `AddParameterFloat`
 * stores it (`Tr2Effect.AddParameterFloat`).
 *
 * Modelled on: EveSOFDataParameter (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:16-34)
 */
@meta.define("CjsCharacterDataParameter")
export class CjsCharacterDataParameter
{

    /** The effect parameter's name (`DecalClip`). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** The value; a float parameter reads its x. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.vec4
    value = vec4.create();

}
