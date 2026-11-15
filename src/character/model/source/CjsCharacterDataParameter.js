import { meta, type } from "#schema";
import { vec4 } from "#math/vec4";

/**
 * One named four-component value: a generic area shader's default parameter, or one a rule sets
 * (`CjsCharacterDataShader`), or one of the character atlas's regions (`CjsCharacterGeneric.textureAtlas`). An effect
 * parameter is set as a Vector4 parameter, of which a one-component shader
 * constant takes only the first value: Carbon's `AddParameterFloat` stores a float in every component
 * (`Tr2Effect.AddParameterFloat`), and a one-component value may also be written [ value, 0, 0, 0 ].
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
