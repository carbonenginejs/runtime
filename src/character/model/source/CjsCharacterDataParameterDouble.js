import { meta, type } from "#schema";

/**
 * One named double of the character library's data, read from a file that keys numbers by name (a blend shape and its
 * weight, an animation's control parameter): Carbon has no map of plain values, so a set of them is a list of these,
 * keyed by `name`. The value is a double, where the donor's is a float, so it keeps the file's precision.
 *
 * Modelled on: EveSOFDataParameterFloat (trinity/trinity/Eve/SpaceObjectFactory/EveSOFData.h:41-57)
 */
@meta.define("CjsCharacterDataParameterDouble")
export class CjsCharacterDataParameterDouble
{

    /** The entry's name. */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.string
    name = "";

    /** Its value, a double (Carbon's DOUBLE). */
    @meta.mapAttribute(meta.READWRITE | meta.PERSIST)
    @type.float64
    value = 0;

}
