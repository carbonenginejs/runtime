import { edit, type } from "#schema";

/** One authored RGBA character color value. */
@type.define({ className: "CjsCharacterColorValue", family: "character" })
export class CjsCharacterColorValue
{

    @edit.readwrite
    @edit.persist
    @type.vec4
    value = [ 0, 0, 0, 1 ];

}

export default CjsCharacterColorValue;
