import { meta, type } from "#schema";

/**
 * One named float of the character library's data (a morph by name and its weight): Carbon has no map of plain
 * values, so a set of them is a list of these, keyed by `name`.
 *
 * Modelled on: EveSOFDataParameterFloat (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:41-57)
 */
@meta.define("CjsCharacterDataParameterFloat")
export class CjsCharacterDataParameterFloat
{

    /** The entry's name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Its value, a 32-bit float as Carbon's `m_value` is (exposed as `value`, EveSOFData_Blue2.cpp:20-35). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float32
    value = 0;

}
