import { meta, type, blue } from "#schema";
import { vec4 } from "#math/vec4";

/** One authored RGBA character color value. */
@meta.define("CjsCharacterColorValue")
export class CjsCharacterColorValue
{

    @blue.readwrite
    @blue.persist
    @type.vec4
    value = vec4.fromValues(0, 0, 0, 1);

}

export default CjsCharacterColorValue;
