import { io, type } from "#schema";
import { CjsModel } from "#model";

/** One authored RGBA character color value. */
@type.define({ className: "CjsCharacterColorValue", family: "character" })
export class CjsCharacterColorValue extends CjsModel
{

    @io.readwrite
    @type.vec4
    value = [ 0, 0, 0, 1 ];

}

export default CjsCharacterColorValue;
