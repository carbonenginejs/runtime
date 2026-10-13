import { meta } from "#schema";
import { vec4 } from "#math/vec4";

/** One authored RGBA character color value. */
@meta.define({ className: "CjsCharacterColorValue", family: "character" })
export class CjsCharacterColorValue
{

    @meta.blue.readwrite
    @meta.blue.persist
    @meta.type.vec4
    value = vec4.fromValues(0, 0, 0, 1);

}

export default CjsCharacterColorValue;
